import { PaymentDetails } from '@web-monetization/polyfill-utils'
import { MonetizationState } from '@web-monetization/types'
import { Frame } from 'puppeteer'

import {
  PlayOrPauseState,
  StickyState,
  ToggleControlsAction
} from './streamControls'
import { FrameSpec } from './FrameSpec'

/**
 * browser.runtime.sendMessage
 */
export interface LocalStorageUpdate extends Command {
  command: 'localStorageUpdate'
  key: string
}

export interface Command<T = any> {
  command: string
  data?: T
}

/**
 * popup -> background
 * browser.runtime.sendMessage
 */
export interface SetStreamControls extends Command {
  command: 'setStreamControls'
  data: {
    sticky: StickyState
    play: PlayOrPauseState
    action: ToggleControlsAction
  }
}

/**
 * content -> background
 * browser.runtime.sendMessage
 */
export interface Info extends Command {
  command: 'info'
}
/**
 * content -> background
 * browser.runtime.sendMessage
 */
export interface Start extends Command {
  command: 'start',
  data: any
}
/**
 * content -> background
 * browser.runtime.sendMessage
 */
export interface Progress extends Command {
  command: 'progress',
  data: any
}

/**
 * content -> background
 * browser.runtime.sendMessage
 */
export interface Stop extends Command {
  command: 'stop'
}

/**
 * content -> background
 * browser.runtime.sendMessage
 */
export interface PaymentReceived extends Command {
  command: 'paymentReceived'
}

/**
 * content -> background
 * browser.runtime.sendMessage
 */
export interface Logout extends Command {
  command: 'logout'
}

/**
 * content -> background
 * browser.runtime.sendMessage
 */
export interface ContentScriptInit extends Command {
  command: 'contentScriptInit'
}

/**
 * content -> background
 * browser.runtime.sendMessage
 */
export interface PauseWebMonetization extends Command {
  command: 'pauseWebMonetization'
}

/**
 * content -> background
 * browser.runtime.sendMessage
 */
export interface ResumeWebMonetization extends Command {
  command: 'resumeWebMonetization'
}

/**
 * content -> background
 * browser.runtime.sendMessage
 */
export interface StartWebMonetization extends Command {
  command: 'startWebMonetization'
  data: PaymentDetails
}

/**
 * content -> background
 * browser.runtime.sendMessage
 */
export interface StopWebMonetization extends Command {
  command: 'stopWebMonetization'
  data: PaymentDetails
}

/**
 * content -> background
 * browser.runtime.sendMessage
 */
export interface LogCommand extends Command {
  command: 'log'
  data: string
}

/**
 * content -> background
 * browser.runtime.sendMessage
 */
export interface FetchYoutubeChannelId extends Command {
  command: 'fetchYoutubeChannelId'
  data: {
    youtubeUrl: string
  }
}

/**
 * content -> background
 * browser.runtime.sendMessage
 */
export interface FetchMetanet extends Command {
  command: 'fetchMetanet'
  data: {
    url: string
  }
}

/**
 * content -> background
 * browser.runtime.sendMessage
 */
export interface FrameStateChange extends Command {
  command: 'frameStateChange'
  data: {
    state: Document['readyState']
    href: string
  }
}

/**
 * content -> background, background -> content
 * browser.runtime.sendMessage, browser.tabs.sendMessage
 */
export interface OnFrameAllowedChanged extends Command {
  command: 'onFrameAllowedChanged'
  data: {
    frame: FrameSpec
    allowed: boolean
  }
}

/**
 * content -> background
 * browser.runtime.sendMessage
 */
export interface UnloadFrame extends Command {
  command: 'unloadFrame'
  // frameId is retrieved via MessageSender['frameId']
}

/**
 * content -> background
 * browser.runtime.sendMessage
 */
export interface ReportCorrelationIdFromIFrameContentScript extends Command {
  command: 'reportCorrelationIdFromIFrameContentScript'
  data: {
    correlationId: string
    // FrameSpec is implied
  }
}

/**
 * content -> background
 * browser.runtime.sendMessage
 */
export interface CheckIFrameIsAllowedFromIFrameContentScript extends Command {
  command: 'checkIFrameIsAllowedFromIFrameContentScript'
  // data: {
  // FrameSpec is implied
  // }
}

export type ToBackgroundMessage =
  | PauseWebMonetization
  | ResumeWebMonetization
  | StopWebMonetization
  | SetStreamControls
  | LogCommand
  | Logout
  | AdaptedSite
  | InjectToken
  | StartWebMonetization
  | IsRateLimited
  | ContentScriptInit
  | FetchYoutubeChannelId
  | FetchMetanet
  | SendTip
  | FrameStateChange
  | UnloadFrame
  | CheckIFrameIsAllowedFromIFrameContentScript
  | ReportCorrelationIdFromIFrameContentScript
  | OnFrameAllowedChanged
  | PaymentReceived
  | Info
  | Start
  | Stop
  | Progress

export type IconState =
  | 'streaming-paused'
  | 'unavailable'
  | 'inactive'
  | 'monetized'
  | 'streaming'
  | 'pending'
  | 'error'

export interface AdaptedSite {
  command: 'adaptedSite'
  data: {
    state: boolean // adapted
    channelImage: string
  }
}

export interface InjectToken extends Command {
  command: 'injectToken'
  data: {
    token: string
  }
}

/**
 * popup -> background
 * browser.runtime.sendMessage
 */
export interface IsRateLimited extends Command {
  command: 'isRateLimited'
}

/**
 *  background -> content
 *  browser.tabs.sendMessage
 */
export interface CheckAdaptedContent {
  command: 'checkAdaptedContent'
  data: { from?: string }
}

/**
 *  background -> content
 *  browser.tabs.sendMessage
 */
export interface MonetizationProgress {
  command: 'monetizationProgress'
  data: {
    // received
    amount: string
    receipt?: string
    // source
    sentAmount: string
    assetCode: string
    assetScale: number
    requestId: string
    paymentPointer: string
    serviceProviderUrl: string
  }
}

/**
 *  background -> content
 *  browser.tabs.sendMessage
 */
export interface MonetizationStart {
  command: 'monetizationStart'
  data: {
    requestId: string
    paymentPointer: string
  }
}

/**
 *  background -> popup
 *  browser.tabs.sendMessage
 */
export interface ClosePopup {
  command: 'closePopup'
}

/**
 *  background -> content
 *  browser.tabs.sendMessage
 */
export interface SetMonetizationState {
  command: 'setMonetizationState'
  data: {
    state: MonetizationState
    requestId: string
    /**
     * Only the content script can be the source of a finalized event
     */
    finalized?: undefined
  }
}

/**
 * popup -> background
 * browser.runtime.sendMessage
 */
export interface SendTip {
  command: 'sendTip'
}

/**
 * background -> popup
 * reply to browser.runtime.sendMessage
 */
export interface SendTipResult {
  success: boolean
}

/**
 *  background -> content
 *  browser.tabs.sendMessage
 */
export interface TipSent {
  command: 'tip'
  data: {
    paymentPointer: string
    amount: string
    assetCode: string
    assetScale: number
  }
}

/**
 *  background -> content
 *  browser.tabs.sendMessage
 */
export interface CheckIFrameIsAllowedFromBackground {
  command: 'checkIFrameIsAllowedFromBackground'
  data: {
    frame: FrameSpec
  }
}

/**
 *  background -> content
 *  browser.tabs.sendMessage
 */
export interface ReportCorrelationIdToParentContentScript {
  command: 'reportCorrelationIdToParentContentScript'
  data: {
    frame: FrameSpec
    correlationId: string
  }
}

export type ToContentMessage =
  | CheckAdaptedContent
  | MonetizationProgress
  | MonetizationStart
  | SetMonetizationState
  | CheckIFrameIsAllowedFromBackground
  | ReportCorrelationIdToParentContentScript
  | OnFrameAllowedChanged
  | TipSent

export type ToPopupMessage = LocalStorageUpdate | ClosePopup
