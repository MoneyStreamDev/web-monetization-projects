import { LocalStorageProxy } from '../../types/storage'
import { User } from '../../types/user'
import { StorageService } from '../../services/storage'
import { PlayOrPauseState, StickyState } from '../../types/streamControls'

const STORAGE_KEYS = [
  'adapted',
  'moneystreamSite',
  'monetized',
  'pending',
  'error',
  'monetizedFavicon',
  'monetizedTotal',
  'stickyState',
  'playState',
  'user',
  'validToken',
  'moneystreamwallet'
]

export type PopupStateType = Omit<LocalStorageProxy, 'token'>

export class PopupState implements PopupStateType {
  readonly adapted!: boolean
  readonly stickyState!: StickyState
  readonly playState!: PlayOrPauseState
  readonly moneystreamSite!: string
  readonly monetized!: boolean
  readonly pending!: boolean
  readonly error!: boolean
  readonly monetizedFavicon!: string
  readonly monetizedTotal!: number
  readonly user!: User
  readonly validToken!: boolean
  readonly moneystreamwallet!: any

  constructor(private storage: Pick<StorageService, 'get'>) {}

  get loggedIn() {
    return Boolean(this.validToken)
  }

  sync(keys = STORAGE_KEYS) {
    const thisAny = this as any
    keys.forEach(key => {
      thisAny[key] = this.storage.get(key)
    })
  }
}
