export const formatINR = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)

export const formatAmount = (amount) => `₹${Number(amount).toLocaleString('en-IN')}`

export const calcPrize = (fee) => Math.floor(fee * 2 * 0.9)
export const calcPlatformFee = (fee) => Math.floor(fee * 2 * 0.1)
