export function formatQty(value) {
  return new Intl.NumberFormat("en-IN").format(value)
}

export function formatInr(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value)
}
