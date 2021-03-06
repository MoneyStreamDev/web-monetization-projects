import MessageSender = chrome.runtime.MessageSender
import { inject, injectable } from 'inversify'
import { GraphQlClient } from '@moneystream/client'
import { MonetizationState } from '@web-monetization/types'
import { resolvePaymentEndpoint } from '@web-monetization/polyfill-utils'

import { notNullOrUndef } from '../../util/nullables'
import { StorageService } from '../../services/storage'
import * as tokens from '../../types/tokens'
import {
  AdaptedSite,
  CheckAdaptedContent,
  CheckIFrameIsAllowedFromBackground,
  ClosePopup,
  ContentScriptInit,
  MonetizationProgress,
  MonetizationStart,
  MonetizationStop,
  OnFrameAllowedChanged,
  PauseWebMonetization,
  ReportCorrelationIdFromIFrameContentScript,
  ReportCorrelationIdToParentContentScript,
  ResumeWebMonetization,
  SetMonetizationState,
  SetStreamControls,
  StartWebMonetization,
  ToBackgroundMessage,
  TipSent
} from '../../types/commands'
import { LocalStorageProxy, STORAGE_KEY } from '../../types/storage'
import { TabState } from '../../types/TabState'
import { getFrameSpec, getTab } from '../../util/tabs'
import { FrameSpec } from '../../types/FrameSpec'
//import { timeout } from '../../content/util/timeout'
import { Container } from 'inversify'

import { StreamMoneyEvent } from './Stream'
import { AuthService } from './AuthService'
import { TabStates } from './TabStates'
import { Streams } from './Streams'
import { Offers } from './Offers'
import { Favicons } from './Favicons'
import { PopupBrowserAction } from './PopupBrowserAction'
import { Logger, logger } from './utils'
import { YoutubeService } from './YoutubeService'
import { MetanetService } from './MetanetService'
import { BackgroundFramesService } from './BackgroundFramesService'
import { StreamAssociations } from './StreamAssociations'
import { Wallet } from 'moneystream-wallet'
import { BandwidthTiers } from '@moneystream/polyfill-utils'

// triggers monetized icon
const MONETIZED_TRIGGER = 600

@injectable()
export class BackgroundScript {
  // private _tiers: BandwidthTiers
  constructor(
    private wallet: Wallet,
    private popup: PopupBrowserAction,
    private favIcons: Favicons,
    private assoc: StreamAssociations,
    private streams: Streams,
    private tabStates: TabStates,
    private storage: StorageService,
    @inject(tokens.LocalStorageProxy)
    private store: LocalStorageProxy,
    private auth: AuthService,
    private youtube: YoutubeService,
    private metanet: MetanetService,
    private framesService: BackgroundFramesService,

    @logger('BackgroundScript')
    private log: Logger,

    private client: GraphQlClient,
    @inject(tokens.WextApi)
    private api: typeof window.chrome,
    @inject(tokens.MoneystreamDomain)
    private moneystreamDomain: string,
    private _offers: Offers
  ) {}

  get activeTab() {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.tabStates.activeTab!
  }

  /**
   * See {@link setTabsOnActivatedListener}
   * See {@link setWindowsOnFocusedListener}
   * See {@link initializeActiveTab}
   */
  set activeTab(value: number) {
    this.tabStates.activeTab = value
  }

  async run(container: Container) {
    //this._tiers = container.get(BandwidthTiers)
    this.initializeActiveTab()
    this.setRuntimeMessageListener()
    this.setTabsOnActivatedListener()
    this.setWindowsOnFocusedListener()
    this.setTabsOnRemovedListener()
    this.setFramesOnChangedListener()
    this.setFramesOnRemovedListener()
    this.routeStreamsMoneyEventsToContentScript()
    this.handleStreamsAbortEvent()
    this.framesService.monitor()
    // noinspection ES6MissingAwait
    void this.auth.getTokenMaybeRefreshAndStoreState()
  }

  private setTabsOnActivatedListener() {
    // The active tab has been changed
    this.api.tabs.onActivated.addListener(activeInfo => {
      this.activeTab = activeInfo.tabId
      this.reloadTabState({ from: 'onActivated' })
    })
  }

  private setWindowsOnFocusedListener() {
    if (this.api.windows) {
      // The active window (and therefore active tab) has changed
      this.api.windows.onFocusChanged.addListener(windowId => {
        // We've focused a special window, e.g. inspector
        if (windowId < 0) return

        // Close the popup when window has changed
        const message: ClosePopup = {
          command: 'closePopup'
        }
        this.api.runtime.sendMessage(message, () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const ignored = this.api.runtime.lastError
        })

        this.api.tabs.query({ active: true, currentWindow: true }, tabs => {
          if (tabs.length === 0 || tabs[0].id == null) return
          this.activeTab = tabs[0].id
          this.reloadTabState({ from: 'onFocusChanged' })
        })
      })
    }
  }

  private setRuntimeMessageListener() {
    // A tab wants to change its state
    this.api.runtime.onMessage.addListener((request, sender, sendResponse) => {
      const serialized = JSON.stringify(request)
      const redacted = serialized.replace(/"token":\s*".*"/, '<redacted>')
      this.log('received message. request=', redacted)

      void this.handleMessage(request, sender, sendResponse)

      // important: this tells chrome to expect an async response.
      // if `true` is not returned here then async messages don't make it back
      // see: https://developer.chrome.com/apps/runtime#event-onMessage
      return true
    })

    // this requires externally_connectable
    this.api.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
      const serialized = JSON.stringify(request)
      this.log('received external. request=', serialized)

      void this.handleMessageExternal(request, sender, sendResponse)

      // important: this tells chrome to expect an async response.
      // if `true` is not returned here then async messages don't make it back
      // see: https://developer.chrome.com/apps/runtime#event-onMessage
      return true
    })

  }

  private initializeActiveTab() {
    // initialize tab so we can set its state right away
    this.api.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs.length === 0 || tabs[0].id == null) return
      this.activeTab = tabs[0].id
      this.reloadTabState({ from: 'initial' })
    })
  }

  private setTabsOnRemovedListener() {
    // Remove tab state when the tab is closed to prevent memory leak
    this.api.tabs.onRemoved.addListener(tabId => {
      this.log('removing tab with id', tabId)
      this.tabStates.clear(tabId)

      // clean up the stream of that tab
      this._closeStreams(tabId)
    })
  }

  private setFramesOnRemovedListener() {
    this.framesService.on('frameRemoved', event => {
      this.tabStates.clearFrame(event)
      this._closeStreams(event.tabId, event.frameId)
    })
  }

  private setFramesOnChangedListener() {
    // Reset tab state and recheck adapted content when tab changes location
    this.framesService.on('frameChanged', event => {
      if (!(event.frame.top || event.frame.parentFrameId === 0)) {
        return
      }

      const { tabId } = event
      const status = event.changed.state
      const isComplete = event.frame.state === 'complete'
      const becameComplete = status === 'complete'
      const changedUrl = Boolean(event.changed.href)

      // Always get the url from the tab
      const url = event.frame.href
      if (status === 'loading' && event.frame.top) {
        this.setMoneystreamUrlForPopupIfNeeded(tabId, url)
      }

      if (becameComplete || (isComplete && changedUrl)) {
        if (event.frame.top) {
          this.setMoneystreamUrlForPopupIfNeeded(tabId, url)
        }
        const from = `onFrameChanged directly, event=${JSON.stringify(event)}, `
        const message: CheckAdaptedContent = {
          command: 'checkAdaptedContent',
          data: { from }
        }
        this.log('sending checkAdaptedContent message', message)
        this.api.tabs.sendMessage(
          tabId,
          message,
          { frameId: event.frameId },
          () => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const ignored = this.api.runtime.lastError
          }
        )
      }
    })
  }

  private routeStreamsMoneyEventsToContentScript() {
    // pass stream monetization events to the correct tab
    this.streams.on('money', (details: StreamMoneyEvent) => {
      const frame = this.assoc.getFrame(details.requestId)
      const { tabId, frameId } = frame
      if (details.packetNumber === 0) {
        const message: MonetizationStart = {
          command: 'monetizationStart',
          data: {
            paymentPointer: details.paymentPointer,
            requestId: details.requestId
          }
        }
        this.api.tabs.sendMessage(tabId, message, { frameId })
      }

      const message: MonetizationProgress = {
        command: 'monetizationProgress',
        data: {
          paymentPointer: details.paymentPointer,
          serviceProviderUrl: details.serviceProviderUrl,
          amount: details.amount,
          assetCode: details.assetCode,
          requestId: details.requestId,
          assetScale: details.assetScale,
          sentAmount: details.sentAmount,
          receipt: details.receipt
        }
      }
      this.handleMonetizedSite(frame, details.initiatingUrl, details)
      this.api.tabs.sendMessage(tabId, message, { frameId })
      //console.log(`ONMONEY SENDMESS ${tabId} ${JSON.stringify(message)} ${frameId}`)
      this.savePacketToHistoryDb(details)
    })
  }

  private savePacketToHistoryDb(_: StreamMoneyEvent) {
    // this.db.incrementSite(details)
  }

  private setBrowserActionStateFromAuthAndTabState() {
    const token = this.auth.getStoredToken()

    if (!token || !this.store.validToken) {
      this.popup.disable()
    }

    const tabId = this.activeTab

    if (tabId) {
      const tabState = this.tabStates.getActiveOrDefault()

      if (Object.values(tabState.frameStates).find(f => f.monetized)) {
        this.tabStates.setIcon(tabId, 'monetized')
      }
      if (Object.values(tabState.frameStates).find(f => f.pending)) {
        this.tabStates.setIcon(tabId, 'pending')
      }
      if (Object.values(tabState.frameStates).find(f => f.error)) {
        this.tabStates.setIcon(tabId, 'error')
      }

      if (token == null) {
        this.tabStates.setIcon(tabId, 'unavailable')
      } else if (token) {
        this.popup.enable()

        const tabState = this.tabStates.getActiveOrDefault()
        const frameStates = Object.values(tabState.frameStates)
        const hasStream = frameStates.find(f => f.monetized)
        const hasBeenPaid = hasStream && frameStates.find(f => f.total > 0)

        if (hasStream) {
          this.tabStates.setIcon(tabId, 'monetized')
          if (hasBeenPaid) {
            const state =
              tabState.playState === 'playing'
                ? 'streaming'
                : 'streaming-paused'
            this.tabStates.setIcon(tabId, state)
          }
        } else {
          this.tabStates.setIcon(tabId, 'inactive')
        }
      }
    }
  }

  makePayloadEnvelope (command:string, payload:any) {
      // browser expects message attribute inside data
      return {
      command: command,
      direction: 'extension-to-browser',
      from: null,
      message: payload
    }
  }

  async getInfoResponse() {
    const man = this.api.runtime.getManifest()
    const showBalanceValue = this.storage.getRaw(STORAGE_KEY.exportBalance)
    const showBalance = showBalanceValue === null ? false : showBalanceValue === "true"
    return {
      name: man.name,
      version: man.version,
      address: this.wallet?.keyPair.toAddress().toString(),
      balanceSatoshis: showBalance ? (await this.wallet.loadUnspent()).spendable().satoshis : null,
      exchangeRate: this.storage.getRaw(STORAGE_KEY.exchangeRate),
      exchangeUpdate: this.storage.getRaw(STORAGE_KEY.exchangeUpdate)
    }
  }

  // this makes envelope
  sendResponseToContentScript(sender:MessageSender, command:string, responseData:any) {
    const { tabId, frameId } = getFrameSpec(sender)
    const message = this.makePayloadEnvelope(command, responseData)
    this.api.tabs.sendMessage(tabId, message, { frameId })
    return true
  }

  // messages from web page to content script (chrome)
  async handleMessageExternal(
    request: ToBackgroundMessage,
    sender: MessageSender,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendResponse: (response: any) => any
  ) {
    console.log(request)
    switch (request.command) {
      case 'info':
        this.log('info command:', request.data)
        const response = await this.getInfoResponse()
        sendResponse(this.sendResponseToContentScript(sender, 'info', response))
        break
      case 'start':
          this.log('start command:', request.data)
          const kill = this.storage.getRaw(STORAGE_KEY.kill)
          if (kill !== null) {
            if (kill === "false") {
              sendResponse(false)
            }
          }
          // start a stream
          sendResponse(await this.startWebMonetization(
            {
              command: 'startWebMonetization',
              data: request.data
            }, sender))
          this.sendSetMonetizationStateMessage(getFrameSpec(sender), 'started')
          this.storage.set('error', false)
          this.storage.set('monetized', true)
          break
        case 'progress':
            // StreamAttempt is raising this event. No needs to call it
            const kill_prog = this.storage.getBoolean(STORAGE_KEY.kill)
            if (!kill_prog) {
              sendResponse(false)
            } else {
              sendResponse(true)
              // raise monetization progress event to the browser
              // TODO: get these values from current stream
              // This will use monetizedTotal! not the incremental amount
              const message: MonetizationProgress = {
                command: 'monetizationProgress',
                data: {
                  paymentPointer: 'test@test.com',
                  serviceProviderUrl: 'url',
                  amount: this.storage.getRaw('monetizedTotal') || '',
                  assetCode: 'BSV',
                  requestId: request.data.requestId,
                  assetScale: 8,
                  sentAmount: this.storage.getRaw('monetizedTotal') || '',
                  // receipt: details.receipt
                }
              }
              const { tabId, frameId } = getFrameSpec(sender)
              this.api.tabs.sendMessage(tabId, message, { frameId })
              this.storage.set('monetized', true)
            }
          break
        case 'stop':
            this.log('stop command:', request.data)
            sendResponse(this.stopWebMonetization(sender))
            this.sendSetMonetizationStateMessage(getFrameSpec(sender), 'stopped')
            this.storage.set('error', false)
            this.storage.set('monetized', false)
          break
      case 'log':
        this.log('log command:', request.data)
        sendResponse(true)
        break
      default:
        sendResponse(false)
        break
    }
  }

  //use this if getting
  // 'Expecting not null for sender.tab'
  // this will send message to any active browser tabs
  sendResponseToActiveTabs(request: ToBackgroundMessage) {
    const message = this.makePayloadEnvelope(request.command, request.data)
    if ((request as any).from) {
      message.from = (request as any).from
    }
    this.api.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs.length === 0 || tabs[0].id == null) return
      const tabURL = tabs[0].url
      const tabId = tabs[0].id
      // frameid???
      this.api.tabs.sendMessage(tabId, message)
    })
  }

  // messages from content script to background script
  // content script should be listening for response
  async handleMessage(
    request: ToBackgroundMessage,
    sender: MessageSender,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendResponse: (response: any) => any
  ) {
    switch (request.command) {
      case 'info':
        console.log(`Info BackgroundScript`)
        // this is required for browser
        sendResponse(this.sendResponseToContentScript(sender, 'info', await this.getInfoResponse()))
        break
      case 'infodirect':
        console.log(`InfoDirect BackgroundScript`)
        //send response directly back to caller. Works from chrome and ff content script
        sendResponse(await this.getInfoResponse())
        break
      case 'log':
        this.log('log command:', request.data)
        sendResponse(true)
        break
      case 'logout':
        sendResponse(this.logout(sender))
        break
      case 'paymentReceived':
        // send just the new utxo in request.data?
        console.log(`PAYMENT RECEIVED`)
        if (this.wallet) {
          await this.wallet.loadUnspent()
        }
        break
      case 'adaptedSite':
        this.adaptedSite(request.data, sender)
        sendResponse(true)
        break
      case 'injectToken':
        sendResponse(
          await this.injectToken(request.data.token, notNullOrUndef(sender.url))
        )
        break
      case 'startWebMonetization':
        sendResponse(await this.startWebMonetization(request, sender))
        break
      case 'start':
        console.log(`START browser-to-extension`)
        sendResponse(await this.startWebMonetization(
          {
            command: 'startWebMonetization',
            data: request.data
          }, sender))
        break
      case 'pauseWebMonetization':
        sendResponse(this.pauseWebMonetization(request, sender))
        break
      case 'resumeWebMonetization':
        sendResponse(this.resumeWebMonetization(request, sender))
        break
      case 'stopWebMonetization':
        sendResponse(this.stopWebMonetization(sender))
        break
      case 'stop':
        console.log(`STOP browser-to-extension`)
        sendResponse(this.stopWebMonetization(sender))
        break
      case 'isRateLimited':
        try {
          sendResponse(await this.isRateLimited())
        }
        catch (err) {
          console.error(`ERROR ${request.command}`, err)
        }
        break
      case 'setStreamControls':
        sendResponse(this.setStreamControls(request, sender))
        break
      case 'contentScriptInit':
        try {
          sendResponse(await this.contentScriptInit(request, sender))
        }
        catch (err) {
          console.error(`ERROR ${request.command}`, err.message)
        }
        break
      case 'fetchYoutubeChannelId':
        sendResponse(await this.youtube.fetchChannelId(request.data.youtubeUrl))
        break
      case 'fetchMetanet':
          sendResponse(await this.metanet.fetchPaymail(request.data.url))
          break
      case 'sendTip':
        sendResponse(await this.sendTip())
        break
      case 'checkIFrameIsAllowedFromIFrameContentScript':
        sendResponse(
          await this.checkIFrameIsAllowedFromIFrameContentScript(sender)
        )
        break
      case 'reportCorrelationIdFromIFrameContentScript':
        sendResponse(
          await this.reportCorrelationIdFromIFrameContentScript(request, sender)
        )
        break
      case 'onFrameAllowedChanged':
        sendResponse(await this.onFrameAllowedChanged(request, sender))
        break
      case 'offer':
        this._offers.add(request.data)
        // TODO: process the offer, for now just respond ok
        sendResponse(this.sendResponseToContentScript(sender, 'answer', "ok"))
        break;
      case 'update':
          this.sendResponseToActiveTabs(request)
          sendResponse(true)
          break;
      default:
        sendResponse(false)
        break
    }
  }

  setMoneystreamUrlForPopupIfNeeded(tab: number, url: string | undefined) {
    this.log('setting moneystream url for popup', url)
    if (url && !url.startsWith(this.moneystreamDomain)) {
      url = undefined
    }
    this.tabStates.set(tab, {
      moneystreamSite: url
    })
    if (url) {
      this.reloadTabState({ from: 'setMoneystreamUrlForPopupIfNeeded' })
    }
  }

  async injectToken(siteToken: string | null, url: string) {
    const { origin } = new URL(url)
    if (origin !== this.moneystreamDomain) {
      return null
    }
    // When logged out siteToken will be an empty string so normalize it to
    // null
    this.auth.syncSiteToken(siteToken || null)
    return this.auth.getTokenMaybeRefreshAndStoreState()
  }

  setFrameMonetized(
    { tabId, frameId }: FrameSpec,
    senderUrl: string,
    total?: number
  ) {
    const tabState = this.tabStates.get(tabId)

    this.tabStates.setFrame(
      { tabId, frameId },
      {
        monetized: true,
        total: total || (tabState.frameStates[frameId]?.total ?? 0)
      }
    )

    if (this.activeTab === tabId) {
      this.reloadTabState()
    }

    // TODO: this doesn't actually seem to be used anywhere
    // Channel image is provided if top frame is adapted
    if (tabState.frameStates[0].adapted) {
      const { host } = new URL(senderUrl)
      this.favIcons
        .getFavicon(host)
        .then(favicon => {
          this.tabStates.set(tabId, { favicon })
        })
        .catch(e => {
          console.error(`failed to fetch favicon. e=${e.stack}`)
        })
    }
  }

  setFramePending(
    { tabId, frameId }: FrameSpec,
    senderUrl: string,
    total?: number
  ) {
    const tabState = this.tabStates.get(tabId)

    this.tabStates.setFrame(
      { tabId, frameId },
      {
        pending: true,
        total: total || (tabState.frameStates[frameId]?.total ?? 0)
      }
    )

    if (this.activeTab === tabId) {
      this.reloadTabState()
    }

    // TODO: this doesn't actually seem to be used anywhere
    // Channel image is provided if top frame is adapted
    if (tabState.frameStates[0].adapted) {
      const { host } = new URL(senderUrl)
      this.favIcons
        .getFavicon(host)
        .then(favicon => {
          this.tabStates.set(tabId, { favicon })
        })
        .catch(e => {
          console.error(`failed to fetch favicon. e=${e.stack}`)
        })
    }
  }

  mayMonetizeSite(sender: chrome.runtime.MessageSender, initiatingUrl: string) {
    this.setFramePending(getFrameSpec(sender), initiatingUrl)
  }

  monetizeSite(sender: chrome.runtime.MessageSender, initiatingUrl: string) {
    this.setFrameMonetized(getFrameSpec(sender), initiatingUrl)
  }

  handleMonetizedSite(
    frame: FrameSpec,
    url: string,
    details: any
    //packet: { sentAmount: string }
  ) {
    const { tabId, frameId } = frame
    // console.log(details)
    const tabState = this.tabStates.get(tabId)
    const frameTotal = tabState?.frameStates[frameId]?.total ?? 0
    const newFrameTotal = frameTotal + Number(details?.sentAmount ?? 0)
    //TODO: look at return message from service to set this status
    // console.log(`handle monetized ${newFrameTotal}`)
    if (newFrameTotal < MONETIZED_TRIGGER) {
      this.setFramePending({ tabId, frameId }, url, newFrameTotal)
    } else {
      this.setFrameMonetized({ tabId, frameId }, url, newFrameTotal)
    }
  }

  adaptedSite(data: AdaptedSite['data'], sender: MessageSender) {
    const { frameId, spec } = getFrameSpec(sender)
    if (frameId === 0 && data.channelImage) {
      this.tabStates.set(this.activeTab, {
        favicon: data.channelImage
      })
    }
    this.tabStates.setFrame(spec, {
      adapted: data.state
    })
  }

  reloadTabState(opts: { from?: string } = {}) {
    const { from } = opts

    const tab = this.activeTab
    const state = () => this.tabStates.get(tab)
    this.setLocalStorageFromState(state())
    this.setBrowserActionStateFromAuthAndTabState()
    // Don't work off stale state, set(...) creates a copy ...
    this.popup.setBrowserAction(tab, state())
    if (from) {
      this.log(
        `reloadTabState tab=${tab}`,
        `from=${from}`,
        JSON.stringify(state(), null, 2)
      )
    }
  }

  private setLocalStorageFromState(state: TabState) {
    const frameStates = Object.values(state.frameStates)

    state && state.moneystreamSite
      ? this.storage.set('moneystreamSite', state.moneystreamSite)
      : this.storage.remove('moneystreamSite')
    // TODO: Another valid case might be a singular adapted iframe inside a non
    // monetized top page.
    this.storage.set('adapted', Boolean(state?.frameStates[0]?.adapted))
    state && frameStates.find(f => f.monetized)
      ? this.storage.set('monetized', true)
      : this.storage.remove('monetized')
    state && frameStates.find(f => f.pending)
      ? this.storage.set('pending', true)
      : this.storage.remove('pending')
    state && frameStates.find(f => f.error)
      ? this.storage.set('error', true)
      : this.storage.remove('error')

    if (state && state.playState && state.stickyState) {
      this.store.playState = state.playState
      this.store.stickyState = state.stickyState
    } else if (state) {
      this.store.playState = null
      this.store.stickyState = null
    }

    if (state) {
      const total = frameStates.reduce((acc, val) => acc + val.total, 0)
      this.storage.set('monetizedTotal', total)
    }
    this.storage.set(
      'monetizedFavicon',
      (state && state.favicon) || '/res/icon-page.svg'
    )
  }

  async checkIFrameIsAllowedFromIFrameContentScript(sender: MessageSender) {
    let frame = getFrameSpec(sender) as FrameSpec
    const { tabId, frameId } = frame

    if (frameId !== 0) {
      let allowed = true
      while (allowed) {
        const frameDetails = await this.framesService.getFrameAsync(frame)
        const parentId = frameDetails?.parentFrameId
        if (typeof parentId === 'undefined') {
          throw new Error(
            `expecting ${JSON.stringify(frame)} to have parentFrameId
            frameDetails=${JSON.stringify(frameDetails)}
            tabFrames=${JSON.stringify(
              this.framesService.getFrames(frame.tabId)
            )}
            `
          )
        }
        allowed = await this.framesService.sendCommand<
          CheckIFrameIsAllowedFromBackground,
          boolean
        >(
          { tabId, frameId: parentId },
          {
            command: 'checkIFrameIsAllowedFromBackground',
            data: {
              frame
            }
          }
        )
        if (parentId === 0) {
          break
        } else {
          frame = { tabId: frame.tabId, frameId: parentId }
        }
      }
      return allowed
    } else {
      throw new Error(`sender must be non top frame`)
    }
  }

  async reportCorrelationIdFromIFrameContentScript(
    request: ReportCorrelationIdFromIFrameContentScript,
    sender: MessageSender
  ) {
    const frame = getFrameSpec(sender)
    const parentId = (await this.framesService.getFrameAsync(frame))
      ?.parentFrameId
    if (typeof parentId === 'undefined') {
      throw new Error(`expecting ${frame} to have parentFrameId`)
    }
    const message: ReportCorrelationIdToParentContentScript = {
      command: 'reportCorrelationIdToParentContentScript',
      data: {
        frame,
        correlationId: request.data.correlationId
      }
    }
    this.api.tabs.sendMessage(frame.tabId, message, { frameId: parentId })
  }

  async startWebMonetization(
    request: StartWebMonetization,
    sender: MessageSender
  ) {
    const frame = getFrameSpec(sender)
    const { tabId, frameId } = frame

    this.tabStates.logLastMonetizationCommand(frame, 'start')
    // This used to be sent from content script as a separate message
    // console.log(request.data)
    this.mayMonetizeSite(sender, request.data.initiatingUrl)

    if (!request?.data?.paymentPointer) {
      // eslint-disable-next-line no-console
      console.warn('startWebMonetization cancelled; missing payment pointer')
      this.sendSetMonetizationStateMessage(frame, 'stopped')
      // TODO: another way to do this?
      this.storage.set('error', true)
      return false
    }
    // This may throw so do after mayMonetizeSite has had a chance to set
    // the page as being monetized (or attempted to be)
    const spspEndpoint = resolvePaymentEndpoint(request.data.paymentPointer)

    const userBeforeReAuth = this.store.user
    let emittedPending = false
    const emitPending = () =>
      this.sendSetMonetizationStateMessage(frame, 'pending')

    // If we are optimistic we have an active subscription (things could have
    // changed since our last cached whoami query), emit pending immediately,
    // otherwise wait until recheck auth/whoami, potentially not even emitting.
    if (userBeforeReAuth?.subscription?.active) {
      emittedPending = true
      emitPending()
    }

    this.log('startWebMonetization, request', request)
    const { requestId } = request.data

    this.log('loading token for monetization', requestId)
    const token = await this.auth.getTokenMaybeRefreshAndStoreState()
    if (!token) {
      // not signed in.
      // eslint-disable-next-line no-console
      console.warn('startWebMonetization cancelled; no token')
      this.sendSetMonetizationStateMessage(frame, 'stopped')
      return false
    }
    // if (!this.store.user?.subscription?.active) {
    //   this.sendSetMonetizationStateMessage(frame, 'stopped')
    //   this.log('startWebMonetization cancelled; no active subscription')
    //   return false
    // }

    if (!emittedPending) {
      emitPending()
    }

    const lastCommand = this.tabStates.getFrameOrDefault(frame).lastMonetization
      .command
    if (lastCommand !== 'start' && lastCommand !== 'pause') {
      this.log('startWebMonetization cancelled via', lastCommand)
      return false
    }

    this.log('starting stream', requestId)
    this.assoc.setStreamId(frame, requestId)
    this.assoc.setFrame(requestId, { tabId, frameId })
    this.streams.beginStream(requestId, {
      token,
      spspEndpoint,
      ...request.data,
      initiatingUrl: request.data.initiatingUrl
    }, this.wallet)

    if (lastCommand === 'pause') {
      // TODO: why do we need the timeout here ?
      setTimeout(() => {
        this.doPauseWebMonetization(frame)
      }, 0)
    }
    return true
  }

  private async sendTip(): Promise<{ success: boolean }> {
    const tabId = this.activeTab
    const streamId = this.assoc.getStreamId({ tabId, frameId: 0 })
    if (!streamId) {
      this.log('can not find top frame for tabId=%d', tabId)
      return { success: false }
    }
    const stream = this.streams.getStream(streamId)
    const token = this.auth.getStoredToken()

    // TODO: return detailed errors
    if (!stream || !token) {
      this.log(
        'sendTip: no stream | token. !!stream !!token ',
        !!stream,
        !!token
      )
      return { success: false }
    }

    const receiver = stream.getPaymentPointer()
    const { assetCode, assetScale, exchangeRate } = stream.getAssetDetails()
    const amount = Math.floor(1e9 * exchangeRate).toString() // 1 USD, assetScale = 9

    try {
      this.log(`sendTip: sending tip to ${receiver}`)
      const result = await this.client.query({
        query: `
          mutation sendTip($receiver: String!) {
            sendTip(receiver: $receiver) {
              success
            }
          }
        `,
        token,
        variables: {
          receiver
        }
      })
      this.log(`sendTip: sent tip to ${receiver}`, result)
      const message: TipSent = {
        command: 'tip',
        data: {
          paymentPointer: receiver,
          amount,
          assetCode,
          assetScale
        }
      }
      this.api.tabs.sendMessage(tabId, message, { frameId: 0 })
      return { success: true }
    } catch (e) {
      this.log(`sendTip: error. msg=${e.message}`)
      return { success: false }
    }
  }

  private doPauseWebMonetization(frame: FrameSpec) {
    this.tabStates.logLastMonetizationCommand(frame, 'pause')
    const id = this.assoc.getStreamId(frame)
    if (id) {
      this.log('pausing stream', id)
      this.streams.pauseStream(id)
      this.sendSetMonetizationStateMessage(frame, 'stopped')
    }
    return true
  }

  private doResumeWebMonetization(frame: FrameSpec) {
    this.tabStates.logLastMonetizationCommand(frame, 'resume')
    // this.log(frame)
    const id = this.assoc.getStreamId(frame)
    // this.log(id)
    if (id) {
      this.log('resuming stream', id)
      this.sendSetMonetizationStateMessage(frame, 'pending')
      this.streams.resumeStream(id)
    } else {
      this.log(`Could not resume frame ${JSON.stringify(frame)}`)
    }
    return true
  }

  pauseWebMonetization(request: PauseWebMonetization, sender: MessageSender) {
    if (this.tabStates.get(getTab(sender)).stickyState === 'sticky') {
      return
    }
    return this.doPauseWebMonetization(getFrameSpec(sender))
  }

  resumeWebMonetization(request: ResumeWebMonetization, sender: MessageSender) {
    if (this.tabStates.get(getTab(sender)).playState === 'paused') {
      return
    }
    return this.doResumeWebMonetization(getFrameSpec(sender))
  }

  private handleStreamsAbortEvent() {
    this.streams.on('abort', requestId => {
      this.log('aborting monetization request', requestId)
      const frame = this.assoc.getFrame(requestId)
      if (frame) {
        this.doStopWebMonetization(frame)
      }
    })
  }

  stopWebMonetization(sender: MessageSender) {
    return this.doStopWebMonetization(getFrameSpec(sender))
  }

  private doStopWebMonetization(frame: FrameSpec) {
    this.tabStates.logLastMonetizationCommand(frame, 'stop')
    const requestId = this.assoc.getStreamId(frame)
    const closed = this._closeStreams(frame.tabId, frame.frameId)
    // May be noop other side if stop monetization was initiated from
    // ContentScript
    this.sendSetMonetizationStateMessage(frame, 'stopped', requestId)
    const message: MonetizationStop = {
      command: 'monetizationStop',
      data: {
        requestId: requestId || '',
        paymentPointer: '', finalized:true
      }
    }
    this.api.tabs.sendMessage(frame.tabId, message, { frameId:frame.frameId })
  if (closed) {
      this.tabStates.clearFrame(frame)
    }
    this.reloadTabState({
      from: 'stopWebMonetization'
    })
    return true
  }

  sendSetMonetizationStateMessage(
    { tabId, frameId }: FrameSpec,
    state: MonetizationState,
    requestId?: string
  ) {
    const message: SetMonetizationState = {
      command: 'setMonetizationState',
      data: {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        requestId: (this.assoc.getStreamId({ tabId, frameId }) ?? requestId)!,
        state
      }
    }
    console.log(message)
    this.api.tabs.sendMessage(tabId, message, { frameId })
  }

  _closeStreams(tabId: number, frameId?: number) {
    const streamIds = this.assoc.getTabStreams(tabId)
    const haveFrameId = typeof frameId !== 'undefined'

    let closed = 0
    if (streamIds) {
      Object.entries(streamIds).forEach(([innerFrameId, streamId]) => {
        if (haveFrameId && Number(innerFrameId) !== frameId) {
          return
        }

        this.log('closing stream with id', streamId)
        this.streams.closeStream(streamId)
        this.assoc.clearFrame(streamId)
        closed++
      })
      if (haveFrameId) {
        this.assoc.clearStream({ tabId, frameId: frameId as number })
      } else {
        this.assoc.clearTabStreams(tabId)
      }
    }
    return !!closed
  }

  // This feature is no longer used
  async isRateLimited() {
    return {
      limitExceeded: false
    }
  }

  private logout(_: MessageSender) {
    for (const tabId of this.tabStates.tabKeys()) {
      // Make a copy as _closeStreams mutates and we want to actually close
      // the streams before we set the state to stopped.
      const requestIds = { ...this.assoc.getTabStreams(tabId) }
      this._closeStreams(tabId)
      this.tabStates.clear(tabId)
      Object.entries(requestIds).forEach(([frameId, requestId]) => {
        // TODO: this is hacky, but should do the trick for now
        const message: SetMonetizationState = {
          command: 'setMonetizationState',
          data: { state: 'stopped', requestId }
        }
        this.api.tabs.sendMessage(tabId, message, { frameId: Number(frameId) })
      })
    }
    // Clear the token and any other state the popup relies upon
    // reloadTabState will reset them below.
    this.storage.clear()
    this.tabStates.setIcon(this.activeTab, 'unavailable')
    this.reloadTabState()
    return true
  }

  private setStreamControls(request: SetStreamControls, _: MessageSender) {
    const tabId = this.activeTab
    this.log('setStreamControls', request)

    this.tabStates.set(tabId, {
      stickyState: request.data.sticky,
      playState: request.data.play
    })
    if (request.data.action === 'togglePlayOrPause') {
      const tabState = this.tabStates.get(tabId)
      const framesForTab = Object.keys(tabState.frameStates).map(Number)
      this.log({ framesForTab })
      if (request.data.play === 'paused') {
        framesForTab.forEach(frameId => {
          this.doPauseWebMonetization({ frameId, tabId })
        })
      } else if (request.data.play === 'playing') {
        framesForTab.forEach(frameId => {
          this.doResumeWebMonetization({ frameId, tabId })
        })
      }
    }
    this.reloadTabState({ from: request.command })
    return true
  }

  private contentScriptInit(request: ContentScriptInit, sender: MessageSender) {
    const { tabId, frameId, spec } = getFrameSpec(sender)
    // Content script used to send a stopWebMonetization message every time
    // it loaded. Noop if no stream for tab.
    this._closeStreams(tabId, frameId)
    this.tabStates.clearFrame(spec)
    this.reloadTabState({
      from: 'onTabsUpdated status === contentScriptInit'
    })
    return true
  }

  private async onFrameAllowedChanged(
    request: OnFrameAllowedChanged,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _: MessageSender
  ) {
    // Send message to all relevant frames in the tab
    const frames = [request.data.frame.frameId].concat(
      this.framesService.getChildren(request.data.frame).map(f => f.frameId)
    )
    frames.forEach(frameId => {
      const tabId = request.data.frame.tabId
      this.api.tabs.sendMessage(tabId, request, { frameId })
    })
  }
}
