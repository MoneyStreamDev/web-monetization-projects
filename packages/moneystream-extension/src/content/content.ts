import '@abraham/reflection'

import { Container } from 'inversify'
import { GraphQlClientOptions } from '@moneystream/client'
import { inversifyModule } from '@dier-makr/inversify'
import { GlobalModule } from '@dier-makr/annotations'

import * as tokens from '../types/tokens'
import { API, MONEYSTREAM_DOMAIN } from '../webpackDefines'
import { ClientOptions } from '../services/ClientOptions'

import { ContentScript } from './services/ContentScript'

function configureContainer(container: Container) {
  container.bind(tokens.ContentRuntime).toConstantValue(API.runtime)
  container.bind(tokens.MoneystreamDomain).toConstantValue(MONEYSTREAM_DOMAIN)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const noop = (..._: unknown[]) => undefined
  container
    .bind(tokens.Logger)
    .toConstantValue(noop)
    .whenTargetNamed('MoneystreamClient')
  container.bind(GraphQlClientOptions).to(ClientOptions)
  container.bind(Storage).toConstantValue(localStorage)
  container.bind(Window).toConstantValue(window)
  container.bind(Document).toConstantValue(document)
}

function main() {
  const container = new Container({
    defaultScope: 'Singleton',
    autoBindInjectable: true
  })
  inversifyModule(GlobalModule)
  configureContainer(container)
  container.get(ContentScript).init()
}
main()
