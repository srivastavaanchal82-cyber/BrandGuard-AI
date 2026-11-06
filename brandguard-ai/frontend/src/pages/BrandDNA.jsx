import { useEffect, useState } from "react";import { getBrand, saveBrand, errMsg } from "../api.js";import { Btn, Card, Err, Field, Head, Ok } from "../ui.jsx";
const E = { brand_name: "", approved_terminology: "", prohibited_words: "", tone: "Professional", communication_guidelines: "", verified_facts: "", approved_claims: "", approved_domains: "", approved_campaign: "" };
const SAMPLE = { brand_name: "ABC Technologies", approved_terminology: "clients → customers", prohibited_words: "cheapest, guaranteed returns", tone: "Professional", communication_guidelines: "Always use the exact name ABC Technologies.\nDo not use the unverified word “cheapest”.\nDo not make unsupported “100% results” guarantees.", verified_facts: "ABC Technologies was founded in 2015.", approved_claims: "", approved_domains: "abctechnologies.com", approved_campaign: "" };
export default function BrandDNA() {
  const [f, setF] = useState(E), [busy, setBusy] = useState(false), [e, setE] = useState(""), [ok, setOk] = useState(""), [load, setLoad] = useState(true);
  useEffect(() => { getBrand().then((b) => setF({ ...E, ...b })).catch((x) => { if (x.response?.status !== 404) setE(errMsg(x)); }).finally(() => setLoad(false)); }, []);
  const set = (k) => (ev) => setF({ ...f, [k]: ev.target.value });
  async function save() {
    setE(""); setOk(""); if (!f.brand_name.trim()) return setE("Brand name is required.");
    setBusy(true); try { await saveBrand(f); setOk("Brand DNA saved to the backend. It will be used by every check."); } catch (x) { setE(errMsg(x)); } finally { setBusy(false); }
  }
  return <><Head t="Brand DNA" s="Your approved source of truth, stored by the backend (Firestore when configured)." /><Err m={e} /><Ok m={ok} />
    <Card>{load ? <p className="text-mu">Loading saved Brand DNA…</p> : <>
      <Btn v="g" onClick={() => { setF(SAMPLE); setOk("Sample loaded. Click Save Brand DNA to store it."); }}>Load ABC Technologies sample</Btn>
      <div className="mt-3"><Field label="Brand name *" value={f.brand_name} onChange={set("brand_name")} />
        <Field area label="Approved terminology (one per line, use “wrong → right”)" value={f.approved_terminology} onChange={set("approved_terminology")} />
        <Field label="Prohibited words (comma separated)" value={f.prohibited_words} onChange={set("prohibited_words")} />
        <label className="mb-3 block text-xs text-mu">Preferred tone<select className="mt-1" value={f.tone} onChange={set("tone")}>{["Professional", "Friendly", "Bold", "Playful"].map((t) => <option key={t}>{t}</option>)}</select></label>
        <Field area label="Communication guidelines" value={f.communication_guidelines} onChange={set("communication_guidelines")} />
        <Field area label="Verified facts (one per line)" value={f.verified_facts} onChange={set("verified_facts")} />
        <Field area label="Approved marketing claims" value={f.approved_claims} onChange={set("approved_claims")} />
        <Field label="Approved website domains" value={f.approved_domains} onChange={set("approved_domains")} />
        <Field area label="Approved campaign details" value={f.approved_campaign} onChange={set("approved_campaign")} /></div>
      <Btn busy={busy} onClick={save}>Save Brand DNA</Btn></>}</Card></>;
}
