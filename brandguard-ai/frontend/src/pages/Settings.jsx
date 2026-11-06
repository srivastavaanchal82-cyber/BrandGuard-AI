import { useEffect, useState } from "react";import { getHealth, errMsg } from "../api.js";import { Btn, Card, Err, Head, Tag } from "../ui.jsx";
export default function Settings() {
  const [h, setH] = useState(null), [e, setE] = useState(""), [busy, setBusy] = useState(false);
  const check = () => { setBusy(true); setE(""); getHealth().then(setH).catch((x) => { setH(null); setE(errMsg(x)); }).finally(() => setBusy(false)); };
  useEffect(check, []);
  return <><Head t="Settings" s="Backend connection and integration status." /><Err m={e} />
    <Card><h2 className="mb-3 font-bold">Backend status</h2>{h ? <div className="flex flex-wrap gap-2"><Tag c="bg-green-500/20 text-green-300">Connected</Tag><Tag>Storage: {h.storage}</Tag><Tag c={h.gemini_configured ? "bg-green-500/20 text-green-300" : "bg-amber-500/20 text-amber-300"}>Gemini: {h.gemini_configured ? "configured" : "not configured (rules-only demo)"}</Tag></div> : <p className="text-sm text-mu">Not connected.</p>}
      <Btn v="g" className="mt-4" busy={busy} onClick={check}>Test connection</Btn></Card>
    <Card><h2 className="mb-2 font-bold">About</h2><p className="text-sm text-mu">BrandGuard AI · Team Hack a thon 💀 · George Stephenson Kundu, Aanchal Srivastav, Samiya Ali. API base: {import.meta.env.VITE_API_URL || "same origin (/api, proxied in development)"}.</p></Card></>;
}
