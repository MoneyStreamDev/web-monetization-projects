import { Browser, Page } from 'puppeteer'

import { MONEYSTREAM_DOMAIN, MONEYSTREAM_TOKEN } from './env'
import { timeout } from './timeout'
import { addCloudFlareAccessHeaders } from './addCloudFlareAccessHeaders'

export interface InitMoneystreamParameters {
  browser: Browser
  user: string
  password: string
}

export interface InitMoneystreamReturn {
  browser: Browser
  page: Page
}

export async function injectMoneystreamTokenFromEnv(page: Page) {
  await page.goto(`${MONEYSTREAM_DOMAIN}`)
  await page.evaluate(
    (token: string) => {
      localStorage.setItem('token', token)
      window.dispatchEvent(new Event('moneystream_writeToken'))
    },
    [MONEYSTREAM_TOKEN]
  )
  await timeout(100)
}

export async function initMoneystream({
  browser,
  user,
  password
}: InitMoneystreamParameters): Promise<InitMoneystreamReturn> {
  const page = await browser.newPage()
  // After the first request, the `CF_Authorization` cookie is set which
  // seems to work in the extension background page.
  await addCloudFlareAccessHeaders(page)

  if (MONEYSTREAM_TOKEN) {
    await injectMoneystreamTokenFromEnv(page)
    await timeout(100)
  } else {
    await page.goto(`${MONEYSTREAM_DOMAIN}/login`)

    const loginSelector = '[data-cy="login-email"]'
    const passwordSelector = '[data-cy="login-password"]'
    const nextSelector = '[data-cy="login-next"]'

    await page.waitForSelector(loginSelector)
    await page.click(loginSelector)
    await page.keyboard.type(user)
    await page.click(nextSelector)

    await page.click(passwordSelector)
    await page.keyboard.type(password)
    await page.click(nextSelector)
    await page.waitForNavigation()
  }

  return { browser, page }
}
