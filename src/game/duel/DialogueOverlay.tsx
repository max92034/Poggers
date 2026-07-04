import { useEffect } from 'react'
import { useDuelStore } from './duelStore'
import './DialogueOverlay.css'

/**
 * VN-style dialogue box. Click / Space / Enter advances; Esc skips the
 * whole exchange. While mounted it sits above the flick overlay, so the
 * duel can't start until the talking is done.
 */
export function DialogueOverlay() {
  const dialogue = useDuelStore((s) => s.dialogue)
  const dialogueIndex = useDuelStore((s) => s.dialogueIndex)
  const advanceDialogue = useDuelStore((s) => s.advanceDialogue)
  const skipDialogue = useDuelStore((s) => s.skipDialogue)

  useEffect(() => {
    if (!dialogue) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        advanceDialogue()
      }
      if (e.key === 'Escape') skipDialogue()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dialogue, advanceDialogue, skipDialogue])

  if (!dialogue) return null
  const line = dialogue[dialogueIndex]
  if (!line) return null
  const isYou = line.speaker === 'You'

  return (
    <div className="dialogue" onPointerDown={advanceDialogue}>
      <div className="dialogue__box">
        <span className={isYou ? 'dialogue__speaker dialogue__speaker--you' : 'dialogue__speaker'}>
          {line.speaker}
        </span>
        <p className="dialogue__text">{line.text}</p>
        <span className="dialogue__hint">
          {dialogueIndex + 1}/{dialogue.length} · click / space ▸ · esc skips
        </span>
      </div>
    </div>
  )
}
