export function StatusDot({ status }) {
  const colors = { open: 'bg-green', running: 'bg-amber', disputed: 'bg-red', completed: 'bg-text3', cancelled: 'bg-text3' }
  return <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${colors[status] || 'bg-text3'}`} />
}

export function StatusChip({ status }) {
  const styles = {
    open:      'text-green bg-green-dim border-green/30',
    running:   'text-amber bg-amber/10 border-amber/30',
    disputed:  'text-red bg-red-dim border-red/30',
    completed: 'text-text3 bg-surface2 border-border',
    cancelled: 'text-text3 bg-surface2 border-border',
  }
  return (
    <span className={`text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-[3px] border ${styles[status] || styles.completed}`}>
      {status}
    </span>
  )
}
