import * as path from 'path'

// If this is set, will inject token and skip puppeteer of login
export const IS_CI = Boolean(process.env.CI)
export const DEV = Boolean(process.env.DEV)
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const MONEYSTREAM_TOKEN = process.env.MONEYSTREAM_TOKEN!
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const MONEYSTREAM_USER = process.env.MONEYSTREAM_USER!
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const MONEYSTREAM_PASSWORD = process.env.MONEYSTREAM_PASSWORD!
export const MONEYSTREAM_DOMAIN =
  process.env.MONEYSTREAM_DOMAIN || 'https://moneystream.com'
export const AWAIT_MONETIZATION_TIMEOUT_MS = Number(
  process.env.AWAIT_MONETIZATION_TIMEOUT_MS || (IS_CI ? 60e3 : 20e3)
)

export const CF_ACCESS_CLIENT_ID = process.env.CF_ACCESS_CLIENT_ID
export const CF_ACCESS_CLIENT_SECRET = process.env.CF_ACCESS_CLIENT_SECRET

export const HEADLESS = Boolean(process.env.PUPPETEER_HEADLESS)
export const DEVTOOLS = Boolean(process.env.PUPPETEER_DEVTOOLS)

// TODO: edge ? chrome|edge -> chromium ?
export const BROWSER_TYPE = (process.env.BROWSER_TYPE || 'chrome') as
  | 'chrome'
  | 'firefox'

export const BROWSER_PATH = process.env.BROWSER_PATH || undefined
export const EXTENSION_PATH =
  process.env.EXTENSION_PATH ||
  path.resolve(__dirname, '../../../moneystream-extension/dist')
