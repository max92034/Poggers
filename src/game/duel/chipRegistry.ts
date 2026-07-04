import type { RapierRigidBody } from '@react-three/rapier'

// Non-reactive registry of live chip bodies so the gust system can apply
// impulses to every chip near an impact without threading refs through React.
const bodies = new Map<string, RapierRigidBody>()

export function registerChip(id: string, body: RapierRigidBody) {
  bodies.set(id, body)
}

export function unregisterChip(id: string) {
  bodies.delete(id)
}

export function otherChips(excludeId: string): Array<[string, RapierRigidBody]> {
  return [...bodies.entries()].filter(([id]) => id !== excludeId)
}

export function getChip(id: string): RapierRigidBody | undefined {
  return bodies.get(id)
}

// Dev-only: expose for scripted playtesting/debugging.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).__chipBodies = bodies
}
