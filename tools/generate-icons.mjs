// Gera ícones PNG do PWA sem dependências externas (zlib nativo).
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}

function hex(c) {
  const h = c.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function makeCanvas(size, bg) {
  const data = Buffer.alloc(size * size * 4)
  if (bg && bg !== 'transparent') {
    const [r, g, b] = hex(bg)
    for (let i = 0; i < size * size; i++) {
      data[i * 4] = r
      data[i * 4 + 1] = g
      data[i * 4 + 2] = b
      data[i * 4 + 3] = 255
    }
  }
  const px = (x, y, color, alpha = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return
    const [r, g, b] = hex(color)
    const i = (y * size + x) * 4
    data[i] = r
    data[i + 1] = g
    data[i + 2] = b
    data[i + 3] = alpha
  }
  const roundRect = (x0, y0, x1, y1, radius, color) => {
    for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
      for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
        const inTop = y < y0 + radius && x < x0 + radius
        const inTopR = y < y0 + radius && x > x1 - radius
        const inBot = y > y1 - radius && x < x0 + radius
        const inBotR = y > y1 - radius && x > x1 - radius
        if (inTop || inTopR || inBot || inBotR) {
          const cx = inTop || inBot ? x0 + radius : x1 - radius
          const cy = inTop || inTopR ? y0 + radius : y1 - radius
          const dx = x + 0.5 - cx
          const dy = y + 0.5 - cy
          if (dx * dx + dy * dy > radius * radius) continue
        }
        px(x, y, color)
      }
    }
  }
  return { data, roundRect, px }
}

const BG = '#0f172a'
const ACCENT = '#34d399'
const MUTED = '#334155'
const BLUE = '#38bdf8'

function drawIcon(size, { fullBleed }) {
  const canvas = makeCanvas(size, fullBleed ? BG : 'transparent')
  const { roundRect } = canvas
  const pad = fullBleed ? size * 0.16 : size * 0.06
  const w = size - pad * 2
  const h = size - pad * 2
  if (!fullBleed) roundRect(pad, pad, pad + w, pad + h, size * 0.19, BG)
  const x = (f) => pad + w * f
  const y = (f) => pad + h * f
  // header band
  roundRect(x(0.08), y(0.1), x(0.92), y(0.26), size * 0.035, ACCENT)
  // "E" no header? manter limpo
  const cols = 4
  const rows = 3
  const gx0 = 0.1
  const gx1 = 0.9
  const gy0 = 0.34
  const gy1 = 0.9
  const cw = (gx1 - gx0) / cols
  const ch = (gy1 - gy0) / rows
  const gap = 0.025
  const colors = [MUTED, MUTED, BLUE, MUTED, MUTED, MUTED, MUTED, MUTED, ACCENT, MUTED, MUTED, MUTED]
  let i = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      roundRect(
        x(gx0 + c * cw + gap), y(gy0 + r * ch + gap),
        x(gx0 + (c + 1) * cw - gap), y(gy0 + (r + 1) * ch - gap),
        size * 0.018, colors[i % colors.length]
      )
      i++
    }
  }
  return encodePng(size, canvas.data)
}

mkdirSync('public/icons', { recursive: true })
writeFileSync('public/icons/icon-192.png', drawIcon(192, { fullBleed: false }))
writeFileSync('public/icons/icon-512.png', drawIcon(512, { fullBleed: false }))
writeFileSync('public/icons/maskable-512.png', drawIcon(512, { fullBleed: true }))
console.log('ícones gerados em public/icons/')
