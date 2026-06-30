export function formatGTQ(amount: number): string {
  return new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
  }).format(amount)
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-GT").format(n)
}
