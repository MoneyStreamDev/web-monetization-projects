import { User } from './user'
import { PlayOrPauseState, StickyState } from './streamControls'

export const STORAGE_KEY = {
  // BACKGROUND/POPUP
  token: 'token',
  user: 'user',
  validToken: 'validToken',
  adapted: 'adapted',
  monetized: 'monetized',
  pending: 'pending',
  error: 'error',
  moneystreamSite: 'moneystreamSite',
  monetizedTotal: 'monetizedTotal',
  monetizedFavicon: 'monetizedFavicon'
}

/**
 * All values are JSON encoded unless as stored
 * unless stated otherwise
 */
export interface LocalStorageProxy {
  /**
   * The refresh token for authenticating to the moneystream site
   * NOT JSON encoded
   */
  token: string | null

  /**
   * JSON serialized {@link User}
   */
  user: User | null
  /**
   * Boolean
   */
  validToken: boolean | null

  adapted: boolean | null
  monetized: boolean | null
  moneystreamSite: string | null

  stickyState: StickyState | null
  playState: PlayOrPauseState | null

  monetizedTotal: number | null
  monetizedFavicon: string | null
}
