import { inject, injectable } from 'inversify'

import { notNullOrUndef } from '../../util/nullables'
import * as tokens from '../../types/tokens'

/**
 * See {@link handleMoneystreamTokenMessage}
 *
 * Refused to display 'https://moneystream.com/healthz' in a frame because an
 * ancestor violates the following Content Security Policy directive:
 * "frame-ancestors 'self' *.featurepeek.com".
 *
 * TODO open up CSP for /healthz or some other minimal url as
 *   handler.html pulls in a lot of heft.
 */
@injectable()
export class SiteToken {
  constructor(
    @inject(tokens.MoneystreamDomain)
    private moneystreamDomain: string
  ) {}

  async retrieve(path = '/handler.html'): Promise<string | null> {
    const moneystreamDomain = this.moneystreamDomain
    const moneystreamFrame = document.createElement('iframe')
    moneystreamFrame.src = moneystreamDomain + path
    document.body.appendChild(moneystreamFrame)
    await new Promise(resolve =>
      moneystreamFrame.addEventListener('load', resolve)
    )

    // noinspection ES6MissingAwait
    const moneystreamPromise = new Promise<string | null>((resolve, reject) => {
      window.addEventListener(
        'message',
        event => {
          if (event.origin !== moneystreamDomain) {
            reject(
              new Error(
                `got message from unexpected origin. expected=${moneystreamDomain}got=${event.origin}`
              )
            )
            return
          }
          resolve(event.data.token)
        },
        { once: true }
      )
    })

    // noinspection ES6MissingAwait
    const timeout = new Promise<never>((resolve, reject) => {
      setTimeout(() => {
        reject(new Error('moneystream token retrieval timed out.'))
      }, 3000)
    })

    notNullOrUndef(moneystreamFrame.contentWindow).postMessage(
      { command: 'moneystreamToken' },
      moneystreamDomain
    )
    let moneystreamToken: string | null = null
    try {
      moneystreamToken = await Promise.race([moneystreamPromise, timeout])
    } catch (e) {
      //
    }
    document.body.removeChild(moneystreamFrame)
    // normalize empty string (moneystream-web sometimes sets) to a null
    return moneystreamToken || null
  }
}
