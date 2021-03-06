import {
  MonetizationEvent,
  MonetizationProgressEvent,
  MonetizationStartEvent,
  MonetizationState,
  MonetizationStopEvent,
  TipEvent
} from '@web-monetization/types'
import { injectable } from '@dier-makr/annotations'
import { PaymentDetails } from '@web-monetization/polyfill-utils'

import { ScriptInjection } from './ScriptInjection'

interface SetStateParams {
  state: MonetizationState
  requestId?: string
  finalized?: boolean
}

type MonetizationRequest = PaymentDetails

@injectable()
export class DocumentMonetization {
  private finalized = true
  private state: MonetizationState = 'stopped'
  private request?: MonetizationRequest

  constructor(
    private window: Window,
    private doc: Document,
    private scripts: ScriptInjection
  ) {}

  /**
   * Adapter from posted messages on window to `CustomEvent`s
   * TODO: less janky cross-platform way to create a generic EventTarget
   *  You can create an EventTarget using new on Chrome/Firefox but not Safari
   *  Will route any messages with webMonetization: true to
   *  document.monetization dispatchEvent
   *
   */
  injectDocumentMonetization() {
    this.scripts.inject(
      // language=JavaScript
      `
      document.monetization = document.createElement('div')
      document.monetization.state = 'stopped'
      window.addEventListener('message', function (event) {
        if (event.source === window && event.data.webMonetization) {
          document.monetization.dispatchEvent(
            new CustomEvent(event.data.type, {
              detail: event.data.detail
            }))
        }
      })
    `
    )
  }

  setMonetizationRequest(request?: MonetizationRequest) {
    this.request = request
    this.finalized = true
  }

  getMonetizationRequest() {
    return this.request
  }

  /**
   * Set the document state first, then emit associated event.
   * Only emit if state has changed.
   * This needs to handle multiple requests to change to the same state
   * (where state can be a composite, eg. {state: 'stopped', finalized: false})
   */
  setState({ requestId, state, finalized }: SetStateParams) {
    if (requestId && this.request?.requestId !== requestId) {
      return
    }

    finalized = Boolean(finalized)
    // We may need to emit a stop event more than once in the case of the user
    // pausing (monetizationstop event with finalized: false) then the tag
    // being removed (monetizationstop event with finalized: true)
    const changedFinalized = this.finalized !== finalized
    const changedState = this.state != state
    const changed = changedState || changedFinalized

    this.finalized = finalized
    this.state = state

    if (changed) {
      if (changedState) {
        this.scripts.inject(`document.monetization.state = '${state}'`)
      }
      if (this.request && (state === 'stopped' || state === 'pending')) {
        this.postMonetizationMessage(
          state === 'pending' ? 'monetizationpending' : 'monetizationstop',
          {
            paymentPointer: this.request.paymentPointer,
            requestId: this.request.requestId
          },
          finalized
        )
      }
    }
    return changed
  }

  postMonetizationStartWindowMessageAndSetMonetizationState(
    detail: MonetizationStartEvent['detail']
  ) {
    // Indicate that payment has started.
    const changed = this.setState({ state: 'started' })
    if (!changed) {
      throw new Error(`expecting state transition`)
    }
    // First nonzero packet has been fulfilled
    this.postMonetizationMessage('monetizationstart', detail)
  }

  postMonetizationMessage(
    type: MonetizationEvent['type'],
    detailSource: MonetizationEvent['detail'],
    finalized?: boolean
  ) {
    // Don't mutate the request (and omit initiating url)
    const detail = { ...detailSource }

    if (type === 'monetizationstop') {
      const stop = detail as MonetizationStopEvent['detail']
      stop.finalized = Boolean(finalized)
    }
    this.window.postMessage(
      {
        webMonetization: true,
        type,
        detail
      },
      this.window.location.origin
    )
  }

  // post a generic message to browser
  postMessage(message:any) {
    this.window.postMessage(
      message,
      this.window.location.origin
    )
  }

  postMonetizationProgressWindowMessage(
    detail: MonetizationProgressEvent['detail']
  ) {
    // Protect against extremely unlikely race condition
    // A progress message coming before a content -> background script
    // stopWebMonetization message handler has had a chance to run.
    if (this.request?.requestId === detail.requestId) {
      this.postMonetizationMessage('monetizationprogress', detail)
    } else {
      console.log(`aint got ${this.request?.requestId}. post it anyway, but something went wrong`)
      console.log(detail)
      this.postMonetizationMessage('monetizationprogress', detail)
    }
  }

  postMonetizationStopWindowMessage(
    detail: MonetizationStopEvent['detail']
  ) {
    // Protect against extremely unlikely race condition
    // A progress message coming before a content -> background script
    // stopWebMonetization message handler has had a chance to run.
    if (this.request?.requestId === detail.requestId) {
      this.postMonetizationMessage('monetizationstop', detail)
    } else {
      console.log(`aint got ${this.request?.requestId}. post it anyway, but something went wrong`)
      console.log(detail)
      this.postMonetizationMessage('monetizationstop', detail)
    }
  }

  postTipMessage(type: TipEvent['type'], detailSource: TipEvent['detail']) {
    const detail = { ...detailSource }

    this.window.postMessage(
      {
        webMonetization: true,
        type,
        detail
      },
      this.window.location.origin
    )
  }

  postTipWindowMessage(detail: TipEvent['detail']) {
    this.postTipMessage('tip', detail)
  }

  setMetaTagContent(paymentPointer?: string) {
    const document = this.doc
    let meta: HTMLMetaElement | null = document.head.querySelector(
      'meta[name="monetization"]'
    )
    if (!meta && paymentPointer) {
      meta = document.createElement('meta')
      meta.name = 'monetization'
      meta.content = paymentPointer
      document.head.appendChild(meta)
    } else if (meta && !paymentPointer) {
      document.head.removeChild(meta)
    } else if (meta && paymentPointer) {
      meta.content = paymentPointer
    }
  }

  hasRequest() {
    return !!this.request
  }

  getState() {
    return this.state
  }
}
