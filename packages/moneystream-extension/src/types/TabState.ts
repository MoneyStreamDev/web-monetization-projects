import { PlayOrPauseState, StickyState } from './streamControls'

export type MonetizationCommand = 'pause' | 'stop' | 'start' | 'resume'

export interface FrameState {
  adapted: boolean
  monetized: boolean
  pending: boolean
  error: boolean
  // Tracks the total amount of `source` money sent (not was received)
  total: number
  lastMonetization: {
    command: MonetizationCommand | null
    timeMs: number
  }
}

export interface TabState {
  favicon?: string
  moneystreamSite?: string
  stickyState: StickyState
  playState: PlayOrPauseState
  icon?: {
    path: string
  }
  badge?: {
    text: string
    color?: string
  }
  frameStates: Record<number, FrameState>
}
