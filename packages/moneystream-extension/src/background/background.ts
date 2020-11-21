import '@abraham/reflection'

import { Container } from 'inversify'
import { GraphQlClient } from '@moneystream/client'
import { makeLoggerMiddleware } from 'inversify-logger-middleware'

import { API, MONEYSTREAM_DOMAIN } from '../webpackDefines'
import { StorageService } from '../services/storage'
import * as tokens from '../types/tokens'
import { ClientOptions } from '../services/ClientOptions'
import { decorateThirdPartyClasses } from '../services/decorateThirdPartyClasses'

import { BackgroundScript } from './services/BackgroundScript'
import { BackgroundStorageService } from './services/BackgroundStorageService'
import { Stream } from './services/Stream'
import { Wallet } from 'moneystream-wallet'
import { Offers } from './services/Offers'
import { createLogger } from './services/utils'
import WalletStore from './services/WalletStore'

async function createWallet() {
  const store = new WalletStore()
  const swallet = await store.get()
  let wjson = null
  if (swallet) wjson = JSON.parse(swallet)
  const wallet = new Wallet(store)
  wallet.loadWallet(wjson?.wif)
  //store the wallet local
  if (!wjson) {
    const stored = await wallet.store(wallet.toJSON())
  }
  return wallet
}

async function configureContainer(container: Container) {
  const logger = makeLoggerMiddleware()
  container.applyMiddleware(logger)
  const wallet = await createWallet()

  container.bind(tokens.MoneystreamDomain).toConstantValue(MONEYSTREAM_DOMAIN)
  container.bind(tokens.WextApi).toConstantValue(API)
  container.bind(GraphQlClient.Options).to(ClientOptions)
  container.bind(Storage).toConstantValue(localStorage)
  container.bind(StorageService).to(BackgroundStorageService)
  container.bind(Container).toConstantValue(container)

  container.bind(Stream).toSelf().inTransientScope()
  container.bind(Wallet).toConstantValue(wallet)
  container.bind(Offers).toConstantValue(new Offers())

  container
    .bind(tokens.NoContextLoggerName)
    .toConstantValue('tokens.NoContextLoggerName')

  container.bind(tokens.Logger).toDynamicValue(createLogger).inTransientScope()

  container.bind(tokens.LocalStorageProxy).toDynamicValue(context => {
    return context.container.get(StorageService).makeProxy(['token'])
  })
}

async function main() {
  decorateThirdPartyClasses()

  const container = new Container({
    defaultScope: 'Singleton',
    autoBindInjectable: true
  })

  await configureContainer(container)
  void container.get(BackgroundScript).run(container)
}

main().catch(console.error)
