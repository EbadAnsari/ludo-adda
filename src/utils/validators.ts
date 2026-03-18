export const isValidPhone = (phone) => /^[6-9]\d{9}$/.test(phone)
export const isValidUsername = (name) => /^[a-zA-Z0-9]{4,16}$/.test(name)
export const isValidUTR = (utr) => /^\d{12,22}$/.test(utr)
export const isValidUPI = (upi) => /^[\w.-]+@[\w]+$/.test(upi)
