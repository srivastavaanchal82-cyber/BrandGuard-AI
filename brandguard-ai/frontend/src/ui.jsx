export const Card = ({ children, className = "" }) => <div className={`mb-4 rounded-2xl border border-line bg-gradient-to-br from-[#131c42] to-card p-5 ${className}`}>{children}</div>;
export const Spin = () => <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white align-[-3px]" />;
const V = { p: "bg-gradient-to-r from-brand to-sky2", g: "border border-line bg-[#1a2250]", ok: "bg-green-600", no: "bg-red-600", wa: "bg-amber-500 !text-black" };
export const Btn = ({ busy, v = "p", className = "", children, ...p }) => (
  <button {...p} disabled={busy || p.disabled} className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-px disabled:cursor-wait disabled:opacity-60 ${V[v]} ${className}`}>{busy && <Spin />}{children}</button>);
export const SEV = { High: "bg-red-500/20 text-red-300", Medium: "bg-amber-500/20 text-amber-300", Low: "bg-sky-500/20 text-sky-300" };
export const Tag = ({ c = "bg-brand/30 text-violet-200", children }) => <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${c}`}>{children}</span>;
export const Err = ({ m }) => m ? <div role="alert" className="mb-4 rounded-xl border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-200">{m}</div> : null;
export const Ok = ({ m }) => m ? <div className="mb-4 rounded-xl border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-200">{m}</div> : null;
export const Head = ({ t, s }) => <div className="mb-5"><h1 className="text-2xl font-bold">{t}</h1>{s && <p className="text-sm text-mu">{s}</p>}</div>;
export const Field = ({ label, area, ...p }) => <label className="mb-3 block text-xs text-mu">{label}{area ? <textarea rows={3} className="mt-1" {...p} /> : <input className="mt-1" {...p} />}</label>;
export const Empty = ({ children }) => <Card className="text-center text-mu">{children}</Card>;
export function Finding({ f }) {
  const t = f.flagged_text ?? f.mismatch_type, sev = f.severity;
  const row = (k, v) => v ? <p className="mt-1 text-sm text-mu"><b className="text-slate-100">{k}:</b> {v}</p> : null;
  return <div className={`mb-3 rounded-xl border-l-4 bg-[#0a1130] p-4 ${sev === "High" ? "border-red-500" : sev === "Medium" ? "border-amber-500" : "border-sky-400"}`}>
    <div className="flex flex-wrap items-center gap-2"><b>“{t}”</b><Tag c={SEV[sev]}>{sev}</Tag><Tag>{f.category ?? f.mismatch_type}</Tag>{f.source && <Tag c="bg-slate-500/30 text-slate-200">{f.source === "gemini" ? "Gemini" : "Rule"}</Tag>}</div>
    {row("Brand rule", f.brand_rule)}{row("Approved", f.approved)}{row("Evidence", f.evidence ?? f.extracted_evidence)}{row("Why", f.explanation)}
    {(f.suggested_correction || f.suggested_action) && <p className="mt-1 text-sm text-green-300"><b>Suggested {f.suggested_correction ? "correction" : "action"}:</b> {f.suggested_correction ?? f.suggested_action}</p>}</div>;
}
