export function Card({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-panel-border bg-panel-surface p-5 shadow-lg shadow-black/20 ${className}`}>
      {title ? <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">{title}</h3> : null}
      {children}
    </div>
  );
}
