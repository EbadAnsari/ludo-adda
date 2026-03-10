export function Input({ label, error, prefix, suffix, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[11px] uppercase tracking-widest text-text3 font-semibold">{label}</label>}
      <div className={`flex items-center bg-surface border rounded-[6px] px-3 transition-colors focus-within:border-green ${error ? 'border-red' : 'border-border'}`}>
        {prefix && <span className="text-text3 text-sm mr-2 shrink-0">{prefix}</span>}
        <input className={`flex-1 bg-transparent outline-none py-3 text-text1 text-sm placeholder:text-text3 font-display ${className}`} {...props} />
        {suffix && <span className="text-text3 text-sm ml-2 shrink-0">{suffix}</span>}
      </div>
      {error && <p className="text-red text-xs">{error}</p>}
    </div>
  )
}
