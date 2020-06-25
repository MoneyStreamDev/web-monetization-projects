import { Page } from 'puppeteer'

import { debug } from './debug'
import { MONEYSTREAM_DOMAIN } from './env'

export async function logoutMoneystream(moneystreamPage: Page) {
  await moneystreamPage.bringToFront()
  await moneystreamPage.goto(`${MONEYSTREAM_DOMAIN}/settings/account`)

  const menuSelector = `img[data-cy='hamburger-toggle']`
  const logoutSelector = `[data-cy='logout']`

  await moneystreamPage.waitFor(menuSelector)

  try {
    await moneystreamPage.click(menuSelector)
  } catch (err) {
    debug(
      'Failed to open hamburger menu. ' +
        'Page is likely wide enough to not render it. err=',
      err
    )
  }
  await moneystreamPage.waitFor(logoutSelector)
  await moneystreamPage.click(logoutSelector)

  return moneystreamPage
}
