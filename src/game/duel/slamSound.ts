// Synthesized placeholder for the slam clack — a noise snap layered over a
// low thump. To be replaced with recordings of real plastic chips on
// concrete (the 啪 is nostalgia trigger #1).

let ctx: AudioContext | null = null

function audioCtx(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function playSlam(strength: number) {
  const ac = audioCtx()
  if (!ac) return
  const t = ac.currentTime
  const vol = 0.25 + 0.55 * Math.min(1, strength)

  // Snap: short white-noise burst through a bandpass
  const dur = 0.07
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
  }
  const noise = ac.createBufferSource()
  noise.buffer = buf
  const bp = ac.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 2600
  bp.Q.value = 0.8
  const ng = ac.createGain()
  ng.gain.setValueAtTime(vol, t)
  ng.gain.exponentialRampToValueAtTime(0.001, t + dur)
  noise.connect(bp).connect(ng).connect(ac.destination)
  noise.start(t)

  // Thump: descending sine
  const osc = ac.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(140, t)
  osc.frequency.exponentialRampToValueAtTime(45, t + 0.12)
  const og = ac.createGain()
  og.gain.setValueAtTime(vol * 0.8, t)
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.14)
  osc.connect(og).connect(ac.destination)
  osc.start(t)
  osc.stop(t + 0.15)
}
