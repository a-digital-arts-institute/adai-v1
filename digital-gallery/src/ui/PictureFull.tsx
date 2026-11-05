import { useEffect, useRef } from 'react'
import type { ManifestWork } from '../lib/manifest.ts'
import { zoomer, type Zoomer } from './zoomer.js'

/**
 * The open work full screen: the picture whole on black (never cropped), its title, makers and date beneath, and as
 * deep a zoom as the eye wants (zoomer.js: the wheel, a pinch or a click goes in, a drag pans, an overview in the
 * bottom-left corner shows where in the picture the view is). The picture is A(DAI)'s mirror copy, the one the stage
 * shows. Opens from the panel's ⤢ or a click on the open work; × or a click on the black around the whole picture
 * closes it, and escape steps back (out of the zoom, then out). It asks the browser for full screen too, and leaves it
 * again if it was the one that entered it.
 */
export function PictureFull({ work, onClose }: { work: ManifestWork; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null)
  const zoom = useRef<Zoomer | null>(null)
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    const el = box.current!
    const z = zoomer(el, { onClose: () => close.current() })
    zoom.current = z
    // the zoom's keys come first: escape leaves the zoom before it leaves the picture, the arrows pan while zoomed
    const onKey = (e: KeyboardEvent) => {
      if (!z.key(e)) return
      e.preventDefault()
      e.stopImmediatePropagation()
    }
    window.addEventListener('keydown', onKey, true)
    const entered = !document.fullscreenElement && !!el.requestFullscreen
    if (entered) void el.requestFullscreen().catch(() => undefined)
    // leaving the browser's full screen (escape there never reaches the page) closes the picture too
    const onChange = () => entered && !document.fullscreenElement && close.current()
    document.addEventListener('fullscreenchange', onChange)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      document.removeEventListener('fullscreenchange', onChange)
      z.destroy()
      zoom.current = null
      if (entered && document.fullscreenElement === el) void document.exitFullscreen().catch(() => undefined)
    }
  }, [])
  useEffect(() => {
    zoom.current?.set(work.img, undefined, work.title)
  }, [work])

  return (
    <div ref={box} className="picture-full" role="dialog" aria-label={`${work.title}, full screen`}>
      <p className="picture-full-caption">
        <span className="t">{work.title}</span>
        <span className="m">
          {[...work.by, work.date].filter(Boolean).join(' · ')}
        </span>
      </p>
      <button className="picture-full-close" onClick={onClose} aria-label="Close full screen">
        ×
      </button>
    </div>
  )
}
