export const timeAgo = (timestamp) => {
  if (!timestamp) return ''
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp)
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export const formatDateTime = (timestamp) => {
  if (!timestamp) return ''
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
