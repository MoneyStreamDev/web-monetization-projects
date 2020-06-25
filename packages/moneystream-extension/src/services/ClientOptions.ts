import { inject, injectable } from 'inversify'
import { GraphQlClientOptions } from '@moneystream/client'

import * as tokens from '../types/tokens'
import { Logger, logger } from '../background/services/utils'

@injectable()
export class ClientOptions extends GraphQlClientOptions {
  constructor(
    @logger('MoneystreamClient')
    public log: Logger,
    @inject(tokens.MoneystreamDomain) public moneystreamDomain: string
  ) {
    super()
  }
}
