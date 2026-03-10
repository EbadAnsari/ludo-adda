export function Card({ children, className = '', ...props }) {
  return (
    <div className={`bg-surface border border-border rounded-[8px] ${className}`} {...props}>
      {children}
    </div>
  )
}
