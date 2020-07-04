import ReactDOM from 'react-dom'
import React from 'react'

import { openTab } from '../util/openTab'
import { API, MONEYSTREAM_DOMAIN } from '../webpackDefines'
import { StorageService } from '../services/storage'
import { ToPopupMessage } from '../types/commands'
import { withSharedTheme } from '../shared-theme/withSharedTheme'

import { PopupState } from './services/PopupState'
import { PopupContext } from './types'
import { isExtension, mockPopupsPage } from './mocks/loadMockedStates'
import { Index } from './Index'
import { Wallet } from 'moneystream-wallet'

const IndexWithRoot = withSharedTheme(Index)

export function run() {
  const store = new PopupState(new StorageService())
  store.sync()

  let wallet:Wallet|null = null
  if (store.moneystreamwallet) {
    wallet = new Wallet()
    console.log(store.moneystreamwallet)
    const jwallet = store.moneystreamwallet
    wallet.loadWallet(jwallet.wif)
  }

  const context: Omit<PopupContext, 'runtime'> = {
    isExtension,
    moneystreamDomain: MONEYSTREAM_DOMAIN,
    store,
    wallet
  }

  const rootEl = document.getElementById('root')

  if (isExtension) {
    API.runtime.onMessage.addListener((message: ToPopupMessage) => {
      if (message.command === 'closePopup') {
        window.close()
      }
    })
    ReactDOM.render(
      <IndexWithRoot
        context={{
          ...context,
          runtime: {
            tabOpener: (url: string) => openTab.bind(null, API, url),
            onMessageRemoveListener: API.runtime.onMessage.removeListener.bind(
              API.runtime.onMessage
            ),
            sendMessage: API.runtime.sendMessage.bind(API.runtime),
            onMessageAddListener: API.runtime.onMessage.addListener.bind(
              API.runtime.onMessage
            )
          }
        }}
      />,
      rootEl
    )
  } else {
    const MockPopupsPage = withSharedTheme(
      mockPopupsPage(IndexWithRoot, context)
    )

    ReactDOM.render(<MockPopupsPage />, rootEl)
  }
}

run()
