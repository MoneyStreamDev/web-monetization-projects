/* eslint-disable @typescript-eslint/no-explicit-any */
import { MONEYSTREAM_PASSWORD, MONEYSTREAM_USER } from './env'
import { initBrowser } from './initBrowser'
import { initMoneystream, InitMoneystreamReturn } from './initMoneystream'

export async function initBrowserAndLoginFromEnv(): Promise<
  InitMoneystreamReturn
> {
  const browser = await initBrowser()
  return initMoneystream({
    browser,
    user: MONEYSTREAM_USER,
    password: MONEYSTREAM_PASSWORD
  })
}
