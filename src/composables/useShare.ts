import { toPng } from 'html-to-image'

async function capturePng(el: HTMLElement): Promise<Blob> {
  const dataUrl = await toPng(el, {
    pixelRatio: 2,
    backgroundColor: getComputedStyle(document.body).backgroundColor || '#0f172a'
  })
  const res = await fetch(dataUrl)
  return res.blob()
}

function fallbackDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function useShare() {
  async function exportCalendar(el: HTMLElement, filename: string, caption: string) {
    const blob = await capturePng(el)
    const file = new File([blob], filename, { type: 'image/png' })
    const nav = navigator as Navigator & {
      canShare?: (data: ShareData) => boolean
    }
    if (nav.canShare?.({ files: [file] }) && nav.share) {
      await nav.share({ files: [file], title: 'Minha escala', text: caption })
    } else {
      fallbackDownload(blob, filename)
    }
  }

  return { exportCalendar }
}
