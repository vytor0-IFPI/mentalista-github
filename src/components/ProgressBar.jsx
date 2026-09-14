export function ProgressBar({ percent, className = "" }) {
  const p = Math.max(0, Math.min(100, percent || 0));
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-soft ${className}`}>
      <div className="h-full rounded-full bg-gold transition-all duration-500" style={{ width: `${p}%` }} />
    </div>
  );
}

export { ProgressBar as default };