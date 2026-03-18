export function StatusChip({ status }) {
  const map = {
    open:      'chip-open',
    running:   'chip-running',
    disputed:  'chip-disputed',
    completed: 'chip-completed',
    cancelled: 'chip-completed',
  }
  return <span className={map[status] || 'chip-completed'}>{status}</span>
}
