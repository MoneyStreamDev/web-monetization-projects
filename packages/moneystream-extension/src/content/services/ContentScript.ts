import { inject, injectable } from 'inversify'
import {
  MonetizationTagObserver,
  PaymentDetails,
  whenDocumentReady
} from '@web-monetization/polyfill-utils'
import {
  DocumentMonetization,
  IdleDetection
} from '@web-monetization/wext/content'
import { MonetizationProgressEvent, TipEvent } from '@web-monetization/types'

import * as tokens from '../../types/tokens'
import {
  CheckIFrameIsAllowedFromIFrameContentScript,
  ContentScriptInit,
  OnFrameAllowedChanged,
  PauseWebMonetization,
  ReportCorrelationIdFromIFrameContentScript,
  ResumeWebMonetization,
  StartWebMonetization,
  StopWebMonetization,
  ToContentMessage
} from '../../types/commands'
import { ContentRuntime } from '../types/ContentRunTime'
import { debug } from '../util/logging'
import { addMoneystreamExtensionInstalledMarker } from '../util/addMoneystreamExtensionMarker'

import { Frames } from './Frames'
import { AdaptedContentService } from './AdaptedContentService'
import { ContentAuthService } from './ContentAuthService'
import { MonetizationEventsLogger } from './MonetizationEventsLogger'

function startWebMonetizationMessage(request?: PaymentDetails) {
  if (!request) {
    throw new Error(`Expecting request to be set`)
  }
  const message: StartWebMonetization = {
    command: 'startWebMonetization',
    data: { ...request }
  }
  return message
}

@injectable()
export class ContentScript {
  private paused = false
  constructor(
    private storage: Storage,
    private window: Window,
    private document: Document,
    @inject(tokens.ContentRuntime) private runtime: ContentRuntime,
    private adaptedContent: AdaptedContentService,
    private frames: Frames,
    private idle: IdleDetection,
    private monetization: DocumentMonetization,
    private auth: ContentAuthService,
    private eventsLogger: MonetizationEventsLogger
  ) {}

  handleMonetizationTag() {
    const startMonetization = async (details: PaymentDetails) => {
      this.monetization.setMonetizationRequest({ ...details })
      await this.doStartMonetization()
    }

    const stopMonetization = (details: PaymentDetails) => {
      const request: StopWebMonetization = {
        command: 'stopWebMonetization',
        data: details
      }
      this.monetization.setState({ state: 'stopped', finalized: true })
      this.monetization.setMonetizationRequest(undefined)
      this.runtime.sendMessage(request)
    }

    const monitor = new MonetizationTagObserver(
      this.window,
      this.document,
      ({ started, stopped }) => {
        if (stopped) {
          stopMonetization(stopped)
        }
        if (started) {
          void startMonetization(started)
        }
      }
    )

    // // Scan for WM meta tags when page is interactive
    monitor.startWhenDocumentReady()
  }

  private async doStartMonetization() {
    if (this.frames.isIFrame) {
      const allowed = await new Promise<boolean>(resolve => {
        const message: CheckIFrameIsAllowedFromIFrameContentScript = {
          command: 'checkIFrameIsAllowedFromIFrameContentScript'
        }
        this.runtime.sendMessage(message, resolve)
      })
      if (!allowed) {
        // eslint-disable-next-line no-console
        console.error(
          `<iframe> (or one of its ancestors) ` +
          `is not authorized to allow web monetization, ${window.location.href}`
        )
        return
      }
    }
    this.runtime.sendMessage(
      startWebMonetizationMessage(this.monetization.getMonetizationRequest())
    )
  }

  // messages from browse web page to content page handled here
  setPageMessageListener() {
    window.addEventListener("message",
      (event) => {
        // console.log(event)
        if (event.source == window
          && event.data && event.data.direction == "browser-to-extension") {
            // forward event to BackgroundScript
            // info, start, stop
            console.log(event.data.message)
            this.runtime.sendMessage(event.data.message)
          }
      }
  )}

  setRuntimeMessageListener() {
    this.runtime.onMessage.addListener(
      (request: ToContentMessage, sender, sendResponse) => {
        console.log(request)
        console.log(sender)
        if (request.command === 'checkAdaptedContent') {
          if (request.data && request.data.from) {
            debug(
              'checkAdaptedContent with from',
              this.document.readyState,
              JSON.stringify(request.data),
              window.location.href
            )
          } else {
            debug('checkAdaptedContent without from')
          }
          void this.adaptedContent.checkAdaptedContent()
        } else if (request.command === 'setMonetizationState') {
          this.monetization.setState(request.data)
        } else if (request.command === 'monetizationProgress') {
          const detail: MonetizationProgressEvent['detail'] = {
            amount: request.data.amount,
            assetCode: request.data.assetCode,
            assetScale: request.data.assetScale,
            receipt: request.data.receipt,
            paymentPointer: request.data.paymentPointer,
            requestId: request.data.requestId
          }
          this.monetization.postMonetizationProgressWindowMessage(detail)
        } else if (request.command === 'monetizationStart') {
          debug('monetizationStart event')
          this.monetization.postMonetizationStartWindowMessageAndSetMonetizationState(
            request.data
          )
        } else if (request.command === 'monetizationStop') {
          debug('monetizationStop event')
          this.monetization.postMonetizationStopWindowMessage(
            request.data
          )
        } else if (request.command === 'checkIFrameIsAllowedFromBackground') {
          this.frames
            .checkIfIframeIsAllowedFromBackground(request.data.frame)
            .then(sendResponse)
          return true
        } else if (
          request.command === 'reportCorrelationIdToParentContentScript'
        ) {
          this.frames.reportCorrelation(request.data)
        } else if (request.command === 'onFrameAllowedChanged') {
          this.onFrameAllowedChanged(request)
        } else if (request.command === 'info') {
          this.monetization.postMessage(request)
        } else if (request.command === 'answer') {
          this.monetization.postMessage(request)
        } else if (request.command === 'update') {
          this.monetization.postMessage(request)
        } else if (request.command === 'tip') {
          debug('sendTip event')
          const detail: TipEvent['detail'] = {
            amount: request.data.amount,
            assetCode: request.data.assetCode,
            assetScale: request.data.assetScale,
            paymentPointer: request.data.paymentPointer
          }
          this.monetization.postTipWindowMessage(detail)
        }
        // Don't need to return true here, not using sendResponse
        // https://developer.chrome.com/apps/runtime#event-onMessage
      }
    )
  }

  watchPageEvents() {
    const { setWatch } = this.idle.watchPageEvents()
    const runtime = this.runtime
    setWatch({
      pause: () => {
        const pause: PauseWebMonetization = {
          command: 'pauseWebMonetization'
        }
        runtime.sendMessage(pause)
      },
      resume: () => {
        const resume: ResumeWebMonetization = {
          command: 'resumeWebMonetization'
        }
        runtime.sendMessage(resume)
      }
    })
  }

  init() {
    if (this.frames.isMonetizableFrame) {
      this.frames.monitor()
    }

    if (this.frames.isIFrame) {
      this.window.addEventListener('message', event => {
        const data = event.data
        if (typeof data.wmIFrameCorrelationId === 'string') {
          const message: ReportCorrelationIdFromIFrameContentScript = {
            command: 'reportCorrelationIdFromIFrameContentScript',
            data: {
              correlationId: data.wmIFrameCorrelationId
            }
          }
          this.runtime.sendMessage(message)
        }
      })
    }

    if (this.frames.isMonetizableFrame) {
      const message: ContentScriptInit = { command: 'contentScriptInit' }
      this.runtime.sendMessage(message)
      whenDocumentReady(this.document, () => {
        this.handleMonetizationTag()
        this.watchPageEventsToPauseOrResume()
      })
      this.setRuntimeMessageListener()
      this.setPageMessageListener()
      this.monetization.injectDocumentMonetization()
      if (this.storage.getItem('WM_DEBUG')) {
        this.eventsLogger.bindLoggersToEvents()
      }
    }

    if (this.frames.isAnyMoneystreamFrame) {
      if (this.frames.isIFrame) {
        this.auth.handleMoneystreamTokenMessage()
      } else {
        this.auth.syncViaInjectToken()
      }

      if (this.frames.isMoneystreamTopFrame) {
        this.auth.handleMoneystreamWriteTokenWindowEvent()
        addMoneystreamExtensionInstalledMarker(this.document)
      }
    }
  }

  /**
   * IMPORTANT: The pause() must be run after the startMonetization() so
   * that when the document.visibilityState is hidden a stream
   * doesn't start
   */
  watchPageEventsToPauseOrResume() {
    const { setWatch } = this.idle.watchPageEvents()
    const runtime = this.runtime
    setWatch({
      pause: () => {
        this.paused = true
        const pause: PauseWebMonetization = {
          command: 'pauseWebMonetization'
        }
        runtime.sendMessage(pause)
      },
      resume: () => {
        this.paused = false
        const resume: ResumeWebMonetization = {
          command: 'resumeWebMonetization'
        }
        runtime.sendMessage(resume)
      }
    })
  }

  private onFrameAllowedChanged(request: OnFrameAllowedChanged) {
    const allowed = request.data.allowed
    const monetizationRequest = this.monetization.getMonetizationRequest()
    if (allowed) {
      if (monetizationRequest && this.monetization.getState() === 'stopped') {
        // The pause needs to be done after the async allow checks and start
        this.doStartMonetization().then(() => {
          if (this.paused) {
            const pause: PauseWebMonetization = {
              command: 'pauseWebMonetization'
            }
            this.runtime.sendMessage(pause)
          }
        })
      }
    } else {
      if (monetizationRequest) {
        const message: StopWebMonetization = {
          command: 'stopWebMonetization',
          data: monetizationRequest
        }
        this.runtime.sendMessage(message)
      }
    }
  }
}
