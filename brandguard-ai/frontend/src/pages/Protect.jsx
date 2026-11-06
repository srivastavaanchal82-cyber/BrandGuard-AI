import { useState } from "react";import { Link, useNavigate } from "react-router-dom";
import { analyseImage, errMsg } from "../api.js";import { useApp } from "../ctx.jsx";import { Btn, Card, Err, Field, Finding, Head, Tag } from "../ui.jsx";
const TYPES = ["image/png", "image/jpeg", "image/webp"], MAX = 5 * 1024 * 1024;
export default function Protect() {
  const { setLast } = useApp(), nav = useNavigate();
  const [file, setFile] = useState(null), [url, setUrl] = useState(""), [info, setInfo] = useState(""), [e, setE] = useState(""), [busy, setBusy] = useState(false), [res, setRes] = useState(null);
  const [ad, setAd] = useState(""), [aw, setAw] = useState("");
  function pick(ev) {
    setE(""); setRes(null); const f = ev.target.files[0]; if (!f) return;
    if (!TYPES.includes(f.type)) return setE("Only PNG, JPEG or WebP images are accepted.");
    if (f.size > MAX) return setE("Image must be 5 MB or smaller.");
    const u = URL.createObjectURL(f), im = new Image(); im.onload = () => { setFile(f); setUrl(u); setInfo(`${f.name} · ${im.naturalWidth}×${im.naturalHeight}px · ${(f.size / 1024).toFixed(1)} KB`); }; im.src = u;
  }
  async function run() {
    setE(""); setRes(null); if (!file) return setE("Choose an image first.");
    setBusy(true); try { const r = await analyseImage(file, ad, aw); setRes(r); setLast(r); } catch (x) { setE(errMsg(x)); } finally { setBusy(false); }
  }
  const v = res?.vision?.observations;
  return <><Head t="Protect · Visual Brand Checker" s="Upload a suspicious promotional image. Text is read with OCR, then compared with your saved Brand DNA and campaign values." /><Err m={e} />
    <Card className="border-amber-500/40"><p className="text-sm text-mu"><b className="text-amber-300">Limitation:</b> logo authenticity is not verified. No reference logo comparison exists, so visual observations are hints for a human reviewer, not proof. You can also compare typed values on <Link className="text-sky-300 underline" to="/campaign">Campaign DNA Comparison</Link>.</p></Card>
    <Card><label className="block cursor-pointer rounded-2xl border-2 border-dashed border-line p-8 text-center text-mu hover:border-brand">Click to choose a PNG, JPEG or WebP image (max 5 MB)<input type="file" accept={TYPES.join(",")} hidden onChange={pick} /></label>
      {url ? <><img src={url} alt="Uploaded preview" className="mt-4 max-h-80 rounded-xl" /><p className="mt-2 text-sm text-mu">{info}</p></> : <p className="mt-3 text-center text-sm text-mu">No image selected.</p>}
      <div className="mt-4 grid gap-x-4 sm:grid-cols-2"><Field label="Approved discount (optional, e.g. 20%)" value={ad} onChange={(x) => setAd(x.target.value)} /><Field label="Approved website (optional, e.g. nova.com)" value={aw} onChange={(x) => setAw(x.target.value)} /></div>
      <Btn busy={busy} onClick={run}>{busy ? "Analysing image… (first run can take a while)" : "Analyse image"}</Btn></Card>
    {res && <>
      <Card><div className="flex flex-wrap gap-2"><Tag>Mode: {res.mode}</Tag><Tag c="bg-slate-500/30 text-slate-200">{res.findings.length} finding(s)</Tag></div>
        {res.warnings?.map((w, i) => <p key={i} className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-sm text-amber-200">⚠ {w}</p>)}</Card>
      <Card><h2 className="mb-2 font-bold">Extracted text (OCR)</h2>
        {res.extracted_text ? <pre className="whitespace-pre-wrap rounded-xl bg-[#0a1130] p-3 text-sm">{res.extracted_text}</pre> : <p className="text-sm text-mu">No readable text found.</p>}
        <div className="mt-3 flex flex-wrap gap-2 text-sm"><span className="text-mu">Detected discounts:</span>{res.details.discounts.length ? res.details.discounts.map((d) => <Tag key={d}>{d}%</Tag>) : <span className="text-mu">none</span>}
          <span className="ml-3 text-mu">Detected websites:</span>{res.details.urls.length ? res.details.urls.map((d) => <Tag key={d}>{d}</Tag>) : <span className="text-mu">none</span>}</div></Card>
      <Card><h2 className="mb-2 font-bold">Gemini Vision observations</h2>
        {v ? <div className="space-y-1 text-sm text-mu">{res.vision.summary && <p className="text-slate-100">{res.vision.summary}</p>}
          {[["Logos", v.logos], ["Colours", v.colours], ["Promotional elements", v.promotional_elements]].map(([k, a]) => <p key={k}><b className="text-slate-100">{k}:</b> {a?.length ? a.join(", ") : "none reported"}</p>)}</div> : <p className="text-sm text-mu">{res.vision.note}</p>}</Card>
      <h2 className="mb-2 font-bold">Findings</h2>
      {res.findings.length ? res.findings.map((f, i) => <Finding key={i} f={f} />) : <Card className="text-green-300">✓ No inconsistencies found with the available checks.</Card>}
      <Card><p className="mb-3 text-sm text-mu">Recommendation: treat findings as alerts for human verification, not proof of wrongdoing.</p><Btn v="wa" onClick={() => nav("/results")}>Review &amp; decide</Btn></Card></>}</>;
}
