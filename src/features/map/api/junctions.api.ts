import type { Junction } from '../types/junction.types'

export async function fetchJunctions(): Promise<Junction[]> {
  const module = await import('../../../data/junctions.json')
  return module.default as Junction[]
}
