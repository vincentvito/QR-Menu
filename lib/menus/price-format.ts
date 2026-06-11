export function formatMenuPrice(symbol: string, price: number): string {
  if (symbol === 'COL$') {
    return Math.round(price).toLocaleString('es-CO')
  }
  return Number.isInteger(price) ? String(price) : price.toFixed(2)
}
