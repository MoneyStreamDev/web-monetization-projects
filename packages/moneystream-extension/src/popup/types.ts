import { API } from '../webpackDefines'

import { PopupState } from './services/PopupState'
import { Wallet } from 'moneystream-wallet'

export interface PopupRuntime {
  sendMessage: typeof API.runtime.sendMessage
  onMessageAddListener: typeof API.runtime.onMessage.addListener
  onMessageRemoveListener: typeof API.runtime.onMessage.removeListener
  tabOpener: (url: string) => () => void
}

export interface PopupContext {
  isExtension: boolean
  runtime: PopupRuntime
  store: PopupState
  moneystreamDomain: string
  wallet: Wallet|null
}

export interface PopupProps {
  context: PopupContext
}
