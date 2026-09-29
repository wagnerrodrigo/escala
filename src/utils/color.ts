export function withAlpha(hex: string, alphaHex: string): string {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return hex
  return `#${h}${alphaHex}`
}
