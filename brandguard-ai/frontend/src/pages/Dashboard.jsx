import { useEffect, useState } from "react";import { Link } from "react-router-dom";
import { getStats, errMsg } from "../api.js";import { Card, Head, Err, Empty, Spin } from "../ui.jsx";
export default function Dashboard() {
  const [s, setS] = useState(null), [e, setE] = useState("");
  useEffect(() => { getStats().then(setS).catch((x) => setE(errMsg(x))); }, []);
  const cells = s && [["Total content checks", s.total_checks], ["Issues detected", s.issues], ["Approved content", s.approved], ["Pending reviews", s.pending], ["Prevent analyses", s.prevent], ["Protect analyses", s.protect]];
  return <><Head t="Dashboard" s="Live statistics from your stored analyses. One Brand DNA. Two layers of protection. Zero guesswork." /><Err m={e} />
    {!s && !e && <p className="text-mu"><Spin />Loading…</p>}
    {s && s.total_checks === 0 && <Empty>No analyses yet. <Link className="text-sky-300 underline" to="/brand">Save your Brand DNA</Link>, then run a check in <Link className="text-sky-300 underline" to="/prevent">Prevent</Link>.</Empty>}
    {s && <><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{cells.map(([l, v]) => <Card key={l} className="!mb-0"><div className="text-xs text-mu">{l}</div><div className="text-3xl font-bold">{v}</div></Card>)}</div>
      <Card className="mt-4"><div className="text-xs text-mu">Approval rate</div><div className="text-3xl font-bold">{s.total_checks ? Math.round((s.approved / s.total_checks) * 100) + "%" : "n/a"}</div><div className="text-xs text-mu">Approved checks divided by all checks. Storage: {s.storage}.</div></Card></>}</>;
}
