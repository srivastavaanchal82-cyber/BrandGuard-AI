import os, uuid, datetime as dt
from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Literal, Optional
from .checks import run_checks, compare_campaign
from .ai import retrieve, gemini_findings
from .store import Store
from .checks import lines as _lines, run_checks as _run_checks, _host
from . import vision

app = FastAPI(title="BrandGuard AI")
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","), allow_methods=["*"], allow_headers=["*"])
db = Store()
now = lambda: dt.datetime.now(dt.timezone.utc).isoformat()

class Brand(BaseModel):
    brand_name: str = Field(min_length=1, max_length=120)
    approved_terminology: str = ""; prohibited_words: str = ""; tone: str = "Professional"
    communication_guidelines: str = ""; verified_facts: str = ""; approved_claims: str = ""
    approved_domains: str = ""; approved_campaign: str = ""
class Content(BaseModel):
    text: str = Field(min_length=1, max_length=10000); brand_id: str = "default"
class Campaign(BaseModel):
    approved_discount: str = ""; observed_discount: str = ""; approved_website: str = ""; observed_website: str = ""
class Review(BaseModel):
    analysis_id: str; decision: Literal["Approved", "Rejected", "Changes Requested", "Escalated"]
    review_type: Literal["Prevent", "Protect"] = "Prevent"; reviewer: Optional[str] = None

@app.get("/api/health")
def health(): return {"ok": True, "storage": db.mode, "gemini_configured": bool(os.getenv("GEMINI_API_KEY"))}

@app.put("/api/brand/{brand_id}")
def save_brand(brand_id: str, b: Brand):
    db.put("brands", brand_id, b.model_dump()); db.put("activity_logs", uuid.uuid4().hex, {"at": now(), "event": "brand_saved", "brand_id": brand_id}); return b

@app.get("/api/brand/{brand_id}")
def get_brand(brand_id: str):
    b = db.get("brands", brand_id)
    if not b: raise HTTPException(404, "No Brand DNA saved yet")
    return b

@app.post("/api/prevent/analyse")
def analyse(c: Content):
    b = db.get("brands", c.brand_id)
    if not b: raise HTTPException(404, "Save a Brand DNA first")
    ctx = retrieve(c.text, b)
    ai, note = gemini_findings(c.text, b, ctx)
    found = run_checks(c.text, b); have = {f["flagged_text"].lower() for f in found}
    found += [f for f in ai if f["flagged_text"].lower() not in have]
    rec = {"id": uuid.uuid4().hex, "type": "Prevent", "at": now(), "text": c.text, "findings": found, "status": "Pending",
           "mode": "rules+gemini" if ai or "included" in note else "rules-only (demo)", "note": note, "retrieved_context": ctx}
    db.put("content_analyses", rec["id"], rec); return rec

@app.post("/api/protect/campaign-compare")
def campaign(c: Campaign):
    f = compare_campaign(c.approved_discount, c.observed_discount, c.approved_website, c.observed_website)
    rec = {"id": uuid.uuid4().hex, "type": "Protect", "at": now(), "inputs": c.model_dump(), "findings": f, "status": "Pending", "mode": "rule-based comparison of entered values"}
    db.put("protect_analyses", rec["id"], rec); return rec

@app.post("/api/reviews")
def review(r: Review):
    col = "content_analyses" if r.review_type == "Prevent" else "protect_analyses"
    a = db.get(col, r.analysis_id)
    if not a: raise HTTPException(404, "Unknown analysis")
    a["status"] = r.decision; db.put(col, r.analysis_id, a)
    d = {**r.model_dump(), "at": now(), "findings": a["findings"]}; db.put("review_decisions", uuid.uuid4().hex, d); return d

@app.get("/api/reviews")
def reviews(): return sorted(db.all("review_decisions"), key=lambda x: x["at"], reverse=True)

@app.get("/api/stats")
def stats():
    a = db.all("content_analyses") + db.all("protect_analyses")
    n = lambda s: sum(x["status"] == s for x in a)
    return {"total_checks": len(a), "prevent": len(db.all("content_analyses")), "protect": len(db.all("protect_analyses")),
            "issues": sum(len(x["findings"]) for x in a), "approved": n("Approved"), "pending": n("Pending"), "storage": db.mode}

@app.post("/api/protect/analyse-image")
def analyse_image(file: UploadFile = File(...), approved_discount: str = Form(""), approved_website: str = Form(""), brand_id: str = Form("default")):
    data = file.file.read(vision.MAX_BYTES + 1)
    try: mime = vision.validate_image(data)
    except ValueError as e: raise HTTPException(415 if "accepted" in str(e) else 413 if "5 MB" in str(e) else 400, str(e))
    brand = db.get("brands", brand_id) or {}
    lines, ocr_err = vision.run_ocr(data)
    text = "\n".join(l["text"] for l in lines)
    vis, vnote = vision.gemini_vision(data, mime, brand, text)
    if not text.strip() and not vis:
        raise HTTPException(422, "This image could not be analysed. " + (ocr_err or "No readable text was found.") + " " + vnote)
    warnings = [m for m in (ocr_err, None if vis else vnote) if m]
    if not brand: warnings.append("No Brand DNA is saved, so brand-name and rule checks were skipped.")
    details = vision.extract_details(text)
    ad = approved_discount.strip() or (__import__("re").search(r"\d+(?:\.\d+)?\s?%", brand.get("approved_campaign", "")) or [""])[0]
    hosts = [h for h in (_host(x) for x in [approved_website] + _lines(brand.get("approved_domains", ""))) if h]
    found, w2 = vision.mismatches(details, ad, hosts); warnings += w2
    seen = {f["flagged_text"].lower() for f in found}
    if brand.get("brand_name") and text.strip():
        bl = brand["brand_name"].lower()
        for f in _run_checks(text, brand):
            ft = f["flagged_text"].lower()
            # Ads often use capitals, and URLs often contain the brand name: neither is a misspelling.
            if f["category"] == "Incorrect brand name" and (ft == bl or any(ft in u for u in details["urls"])): continue
            if f["flagged_text"].lower() not in seen: found.append({**f, "source": "ocr"}); seen.add(f["flagged_text"].lower())
        if brand["brand_name"].lower() not in text.lower() and not any(f["category"] == "Incorrect brand name" for f in found):
            found.append(dict(flagged_text=brand["brand_name"], category="Brand name not found in text", severity="Low", brand_rule=f"Brand name: {brand['brand_name']}",
                              explanation="The brand name was not found in the readable text. It may appear only inside a logo, or the ad may not use the brand name.",
                              suggested_correction="Check the logo and branding manually.", evidence="Absent from OCR text", source="ocr"))
    for f in (vis or {}).get("findings", []):
        if f["flagged_text"].lower() not in seen: found.append(f); seen.add(f["flagged_text"].lower())
    rec = {"id": uuid.uuid4().hex, "type": "Protect", "at": now(), "filename": file.filename, "findings": found, "status": "Pending",
           "mode": "ocr+gemini-vision" if vis else "ocr+rules (no vision)", "extracted_text": text, "ocr_lines": lines, "details": details,
           "vision": {"observations": (vis or {}).get("observations"), "summary": (vis or {}).get("summary"), "note": vnote},
           "warnings": warnings, "limitations": ["Logo authenticity is not verified: no reference logo comparison is implemented."]}
    db.put("protect_analyses", rec["id"], rec); return rec
