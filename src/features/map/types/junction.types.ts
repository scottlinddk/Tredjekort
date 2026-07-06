export type JunctionStatus =
  | 'planned'
  | 'design under revision'
  | 'planned realignment'
  | 'expropriation review ongoing'
  | 'conditional on municipal decision'

export interface Junction {
  id: string
  name: string
  description: Record<'da' | 'en', string>
  longitude: number
  latitude: number
  status: JunctionStatus
  sources: string[]
}
