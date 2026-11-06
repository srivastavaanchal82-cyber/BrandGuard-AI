"""Image analysis for Protect: validation, OCR (RapidOCR), detail extraction, Gemini Vision.
Nothing here invents findings: every finding comes from OCR text, a comparison with saved values, or the Gemini response."""
import base64, io, json, os, re
import httpx
from PIL import Image
from .checks import _host

MAX_BYTES = 5 * 1024 * 1024
MIME = {"PNG": "image/png", "JPEG": "image/jpeg", "WEBP": "image/webp"}
_engine = None

def validate_image(data: bytes) -> str:
    """Return the mime type or raise ValueError with a user-facing message."""
    if not data: raise ValueError("The uploaded file is empty.")
    if len(data) > MAX_BYTES: raise ValueError("Image must be 5 MB or smaller.")
    try:
        im = Image.open(io.BytesIO(data)); fmt = im.format; im.verify()
    except Exception:
        raise ValueError("The file is not a valid image.")
    if fmt not in MIME: raise ValueError("Only PNG, JPEG or WebP images are accepted.")
    return MIME[fmt]

def run_ocr(data: bytes):
    """Return (lines, error). lines = [{'text','confidence'}]."""
    global _engine
    try:
        import numpy as np
        from rapidocr_onnxruntime import RapidOCR
    except ImportError:
        return [], "OCR library is not installed (run: pip install -r requirements.txt)."
    try:
        _engine = _engine or RapidOCR()
        img = np.array(Image.open(io.BytesIO(data)).convert("RGB"))[:, :, ::-1]
        res, _ = _engine(img)
        return [{"text": r[1], "confidence": round(float(r[2]), 3)} for r in (res or [])], None
    except Exception as e:
        return [], f"OCR failed ({type(e).__name__})."

DISC = re.compile(r"(\d[\dOo]{0,2}(?:\.\d+)?)\s?%")  # OCR often reads 0 as O
URL = re.compile(r"(?:https?://)?(?:www\.)?[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?:/[^\s]*)?", re.I)

def extract_details(text: str):
    return {"discounts": sorted({m.group(1).replace("O", "0").replace("o", "0") for m in DISC.finditer(text)}, key=float),
            "urls": sorted({m.group(0).rstrip(".,;)").lower() for m in URL.finditer(text)})}

def gemini_vision(data: bytes, mime: str, brand: dict, ocr_text: str):
    """Return (result|None, note). result = {observations, summary, findings}."""
    key = os.getenv("GEMINI_API_KEY")
    if not key: return None, "Gemini Vision not configured (no GEMINI_API_KEY): visual analysis was not performed."
    prompt = ("You review a promotional advertisement image for brand compliance. Describe only what is actually visible. "
              "No reference logo file is available, so do NOT claim a logo is authentic or fake; you may only note visible oddities "
              "(distorted, mismatched or unusual logo/typography) as observations needing human verification. "
              "Compare the ad with the brand profile. Return JSON: {\"observations\":{\"logos\":[],\"colours\":[],\"promotional_elements\":[]},"
              "\"summary\":\"...\",\"findings\":[{\"flagged_text\":\"\",\"category\":\"\",\"severity\":\"High|Medium|Low\",\"brand_rule\":\"\","
              "\"explanation\":\"\",\"suggested_correction\":\"\",\"evidence\":\"\"}]}. Use an empty findings list if nothing is inconsistent.\n"
              f"Brand: {brand.get('brand_name') or 'unknown'} | Tone: {brand.get('tone')}\nGuidelines: {brand.get('communication_guidelines') or ''}\n"
              f"Approved domains: {brand.get('approved_domains') or ''}\nOCR text from the image: {ocr_text or '(none)'}")
    try:
        r = httpx.post(f"https://generativelanguage.googleapis.com/v1beta/models/{os.getenv('GEMINI_MODEL', 'gemini-2.0-flash')}:generateContent",
                       headers={"x-goog-api-key": key}, timeout=60,
                       json={"contents": [{"parts": [{"inline_data": {"mime_type": mime, "data": base64.b64encode(data).decode()}}, {"text": prompt}]}],
                             "generationConfig": {"responseMimeType": "application/json"}})
        r.raise_for_status()
        out = json.loads(r.json()["candidates"][0]["content"]["parts"][0]["text"])
        out["findings"] = [{**f, "source": "gemini"} for f in out.get("findings", []) if isinstance(f, dict) and f.get("flagged_text")]
        return out, "Gemini Vision analysis included."
    except httpx.HTTPStatusError as e:
        return None, f"Gemini Vision request was rejected (HTTP {e.response.status_code}). Check the API key and model."
    except Exception as e:
        return None, f"Gemini Vision call failed ({type(e).__name__})."

def mismatches(details, approved_discount, approved_hosts):
    """Compare extracted discounts/URLs with approved values. Returns (findings, warnings)."""
    out, warn = [], []
    nums = set(re.findall(r"\d+(?:\.\d+)?", approved_discount or ""))
    if details["discounts"] and nums:
        for d in details["discounts"]:
            if d not in nums:
                out.append(dict(flagged_text=f"{d}%", category="Discount mismatch", severity="High", brand_rule=f"Approved discount: {approved_discount}",
                                explanation=f"The image shows {d}% but the approved campaign discount is {approved_discount}.",
                                suggested_correction="Treat as a possibly manipulated offer. Requires human verification.", evidence=f"OCR text contained {d}%", source="ocr"))
    elif details["discounts"]:
        warn.append("A discount was found in the image but no approved discount is configured, so it could not be compared.")
    if details["urls"] and approved_hosts:
        for u in details["urls"]:
            h = _host(u)
            if not any(h == a or h.endswith("." + a) for a in approved_hosts):
                out.append(dict(flagged_text=u, category="Unapproved website", severity="High", brand_rule="Approved domains: " + ", ".join(approved_hosts),
                                explanation=f"{h} is not an approved domain or subdomain of one.", suggested_correction="Requires human verification. An alert is not proof of wrongdoing.",
                                evidence=f"OCR text contained {u}", source="ocr"))
    elif details["urls"]:
        warn.append("A website was found in the image but no approved domain is configured, so it could not be compared.")
    return out, warn
