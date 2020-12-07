// Don't like how StreamAttempt deals with Stream
// need to abort attempt, how to get ref to Stream?

// const makeDebug = require('debug')
import { EventEmitter } from 'events'

import { BitcoinConnection } from './BitcoinConnection'
import { BitcoinStream } from './BitcoinStream'
import { Wallet } from 'moneystream-wallet'
import { STORAGE_KEY } from '../../types/storage'
import {
  AdaptiveBandwidth,
  asyncUtils,
  getSPSPResponse,
  PaymentDetails,
  SPSPError,
  SPSPResponse,
  getFarFutureExpiry
} from '@web-monetization/polyfill-utils'
import { Container, inject, injectable } from 'inversify'
import { BandwidthTiers } from '@moneystream/polyfill-utils'

import { notNullOrUndef } from '../../util/nullables'
import * as tokens from '../../types/tokens'
import { BTP_ENDPOINT } from '../../webpackDefines'

import { AnonymousTokens } from './AnonymousTokens'
import { Logger, logger } from './utils'
import { Offers } from './Offers'

const { timeout } = asyncUtils

// This determines how often transactions will be generated
const UPDATE_AMOUNT_TIMEOUT = 5000 //2000
let ATTEMPT = 0

// @sharafian explained to me that the extension popup shows source amounts,
// while the web-monetization-scripts which use the monetizationprogress
// event show received amounts.
export interface StreamMoneyEvent {
  /**
   * Currently means packet number for a given StreamAttempt.
   * Could change.
   */
  packetNumber: number

  requestId: string
  paymentPointer: string
  initiatingUrl: string
  serviceProviderUrl: string

  msSinceLastPacket: number
  sentAmount: string

  // dest=received
  amount: string
  assetCode: string
  assetScale: number

  // source=source
  sourceAmount: string
  sourceAssetCode: string
  sourceAssetScale: number

  receipt?: string
}

type OnMoneyEvent = {
  sentAmount: string
  amount: number
  assetCode: string
  assetScale: number
  sourceAmount: string
  sourceAssetCode: string
  sourceAssetScale: number
  receipt?: string
}

@injectable()
export class Stream extends EventEmitter {
  private readonly _requestId: string
  private readonly _spspUrl: string
  private readonly _paymentPointer: string
  private _authToken: string

  private readonly _server: string
  private readonly _tiers: BandwidthTiers
  private readonly _initiatingUrl: string
  private readonly _serviceProviderUrl: string

  private _lastDelivered: number
  private _lastOutgoingMs!: number
  private _packetNumber!: number
  private _active: boolean
  private _looping: boolean
  private _attempt: StreamAttempt | null
  private _moneystreamDomain: string
  private _anonTokens: AnonymousTokens

  private _assetCode: string
  private _assetScale: number
  private _exchangeRate: number
  private _wallet!: Wallet
  private _offers!: Offers

  constructor(
    @logger('Stream')
    private readonly _debug: Logger,
    private container: Container,
    @inject(tokens.StreamDetails)
    {
      requestId,
      spspEndpoint,
      paymentPointer,
      token,
      initiatingUrl,
      serviceProviderUrl
    }: PaymentDetails & {
      token: string
      spspEndpoint: string
      initiatingUrl: string
      serviceProviderUrl: string
    },
    wallet: Wallet
  ) {
    super()
    this._wallet = wallet
    this._offers = container.get(Offers)
    this._paymentPointer = paymentPointer
    this._requestId = requestId
    this._spspUrl = spspEndpoint
    this._authToken = token
    this._tiers = container.get(BandwidthTiers)
    this._moneystreamDomain = container.get(tokens.MoneystreamDomain)
    this._anonTokens = container.get(AnonymousTokens)

    this._assetCode = ''
    this._assetScale = 0
    this._exchangeRate = 1

    this._active = false
    this._looping = false
    this._attempt = null
    this._lastDelivered = 0
    this._initiatingUrl = initiatingUrl
    this._serviceProviderUrl = serviceProviderUrl

    const server = new URL(this._moneystreamDomain)
    server.pathname = '/btp'
    this._server = server.href.replace(/^http/, 'btp+ws')

    if (BTP_ENDPOINT) {
      this._server = BTP_ENDPOINT
    }
  }

  async start() {
    if (this._active) return
    const kill = localStorage.getItem(STORAGE_KEY.kill)
    if (kill !== null) {
      if (kill === "false") {
        this._debug(`MoneyStream is turned off in configuration`)
        return
      }
      else this._debug(kill)
    }
    this._active = true

    // reset this upon every start *before* early exit while _looping
    this._packetNumber = 0

    if (this._looping) return
    this._looping = true

    if (this._attempt) {
      void this._attempt.stop()
      this._attempt = null
    }

    // Hack for for issue #144
    // Let pause() stream when tab is backgrounded have a chance to
    // to work to avoid wasted refreshBtpToken/SPSP queries
    await timeout(1)
    if (!this._active) return

    const _offer = this._offers.findUrl(this._initiatingUrl)
    // reset our timer when we start streaming.
    const bandwidth = new AdaptiveBandwidth(
      this._initiatingUrl,
      this._tiers,
      _offer,
      this._debug
    )

    while (this._active) {
      //let btpToken: string | undefined
      let plugin, attempt
      try {
        //btpToken = await this._anonTokens.getToken(this._authToken)
        //plugin = await this._makePlugin(btpToken)
        const spspDetails = await this._getSPSPDetails()
        this.container
          .rebind(tokens.NoContextLoggerName)
          .toConstantValue(`StreamAttempt:${this._requestId}:${++ATTEMPT}`)
        attempt = this._attempt = new StreamAttempt({
          bandwidth,
          onMoney: this.onMoney.bind(this),
          requestId: this._requestId,
          serviceProvider: this._serviceProviderUrl,
          plugin,
          spspDetails,
          debug: this.container.get(tokens.Logger),
          wallet: this._wallet,
          initiatingUrl: this._initiatingUrl
        }, this)
        if (this._active) {
          this._debug(`starting attempt`)
          await attempt.start()
          await timeout(1000)
        }
      } catch (e) {
        
        // To get here, need to emit error which will do a reject
        this.abort()

        if (e) {
          const { ilpReject } = e
          if (
            //btpToken &&
            ilpReject &&
            ilpReject.message === 'exhausted capacity.' //&&
            //ilpReject.data.equals(await sha256(Buffer.from(btpToken)))
          ) {
            this._debug(`anonymous token exhausted; retrying, err=${e.message}`)
            //this._anonTokens.removeToken(btpToken)
            continue
          }
          this._debug('error streaming. retry in 2s. err=', e.message, e.stack)
          if (this._active) await timeout(2000)
        }
      } finally {
        if (attempt) bandwidth.addSentAmount(attempt.getTotalSent())
        if (plugin) await plugin.disconnect()
      }
    }

    this._looping = false
    this._debug('aborted because stream is no longer active.')
  }

  async _makePlugin(btpToken: string) {
    // these are interspersed in order to not waste time if connection
    // is severed before full establishment
    if (!this._active) throw new Error('aborted monetization')

    // const plugin = new IlpPluginBtp({
    //   server: this._server,
    //   btpToken
    // })

    this._debug('connecting ilp plugin. server=', this._server)
    // createConnection(...) does this, so this is somewhat superfluous
    // await plugin.connect()
    // return plugin
  }

  async _getSPSPDetails(): Promise<SPSPResponse> {
    this._debug(
      'resolving payment pointer to bitcoin address. url=',
      this._spspUrl
    )
    let details: SPSPResponse
    try {
      //spsp converts payment pointer in meta to ilp acount
      //not sure if we will need a call similar to this
      //details = await getSPSPResponse(this._spspUrl, this._requestId)
      details = {
        destinationAccount: this._paymentPointer,
        //TODO: how to handle shared secret?
        sharedSecret: Buffer.from('secret', 'utf8')
      }
    } catch (e) {
      if (e instanceof SPSPError) {
        const status = e.response?.status
        // Abort on Bad Request 4XX
        if (!status || (status >= 400 && status < 500)) {
          this.abort()
        }
      }
      throw e
    }
    if (!this._active) throw new Error('aborted monetization')
    return details
  }

  onMoney(data: OnMoneyEvent) {
    if (data.amount <= 0) return

    const now = Date.now()
    const msSinceLastPacket = now - this._lastOutgoingMs
    this._lastOutgoingMs = now
    const event: StreamMoneyEvent = Object.assign(data, {
      paymentPointer: this._paymentPointer,
      packetNumber: this._packetNumber++,
      requestId: this._requestId,
      initiatingUrl: this._initiatingUrl,
      serviceProviderUrl: this._serviceProviderUrl,
      msSinceLastPacket: msSinceLastPacket,
      //not sure why there are two amounts but frame needs sentAmount
      sentAmount:data.amount,
      amount: data.amount.toString(),
      receipt: data.receipt
    })
    this._assetCode = data.assetCode
    this._assetScale = data.assetScale
    this._exchangeRate =
      (Number(data.amount) / Number(data.sourceAmount)) *
      (10 ** data.assetScale / 10 ** data.sourceAssetScale)
    this.emit('money', event)
  }

  async stop() {
    this._active = false
    if (this._attempt) {
      await this._attempt.stop()
      this._attempt = null
    }
  }

  async pause() {
    this.stop()
  }

  async resume() {
    this.start()
  }

  private async abort() {
    // Don't call this.stop() directly, let BackgroundScript 
    // orchestrate the stop.
    this.emit('abort', this._requestId)
  }

  getPaymentPointer() {
    return this._paymentPointer
  }

  getAssetDetails() {
    return {
      assetCode: this._assetCode,
      assetScale: this._assetScale,
      exchangeRate: this._exchangeRate
    }
  }
}

interface StreamAttemptOptions {
  bandwidth: AdaptiveBandwidth
  onMoney: (event: OnMoneyEvent) => void
  requestId: string
  serviceProvider: string
  plugin: any //IlpPluginBtp
  //spspDetails contains destinationAccount
  spspDetails: SPSPResponse
  debug: Logger
  wallet: Wallet
  initiatingUrl: string
}

class StreamAttempt {
  private readonly _onMoney: (event: OnMoneyEvent) => void
  private readonly _bandwidth: AdaptiveBandwidth
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly _debug: Logger
  private readonly _plugin: any //IlpPluginBtp
  private readonly _spspDetails: SPSPResponse

  private _stream: Stream
  private _bitcoinStream!: BitcoinStream
  private _connection!: BitcoinConnection
  private _serviceProvider: string
  private _active = true
  private _isShuttingDown = false
  private _lastDelivered = 0
  private _requestId: string
  private _wallet: Wallet
  private _initiatingUrl: string

  constructor(opts: StreamAttemptOptions, stream: Stream) {
    this._stream = stream
    this._onMoney = opts.onMoney
    this._requestId = opts.requestId
    this._bandwidth = opts.bandwidth
    this._serviceProvider = opts.serviceProvider
    this._spspDetails = opts.spspDetails
    this._debug = opts.debug
    this._wallet = opts.wallet
    this._initiatingUrl = opts.initiatingUrl
  }

  async start(): Promise<void> {
    if (!this._active) return

    this._debug('Starting Bitcoin Connection')
    this._connection = new BitcoinConnection(
      this._debug, 
      this._serviceProvider, 
      this._requestId, 
      this._wallet)
    this._connection.payTo(this._spspDetails)
    this._connection.initiatingUrl(this._initiatingUrl)
    // this._connection = await createConnection({
    //   ...this._spspDetails,
    //   plugin,
    //   slippage: 1.0,
    //   exchangeRate: 1.0,
    //   maximumPacketAmount: '10000000',
    //   getExpiry: getFarFutureExpiry
    // })

    if (!this._active) return

    // send practically forever at allowed bandwidth
    this._debug('Createing Bitcoin stream')
    this._bitcoinStream = await this._connection.createStream()

    // TODO: if we save the tier from earlier we don't need to do this async
    // TODO: does doing this async allow a race condition if we stop right away
    const initialSendAmount = await this._bandwidth.getStreamSendMax()
    this._bitcoinStream.setSendMax(initialSendAmount)

    return new Promise((resolve, reject) => {
      const onMoney = (sentAmount: string) => {
        // Wait until `setImmediate` so that `connection.totalDelivered` has been updated.
        const receipt = this._bitcoinStream.receipt
          ? this._bitcoinStream.receipt.toString('base64')
          : undefined
        // console.log(`ONMONEY STREAM ${receipt}`)
        setImmediate(this.onMoney.bind(this), sentAmount, receipt)
      }

      const onPluginDisconnect = async () => {
        this._debug('onPluginDisconnect()')
        cleanUp()
        this._debug(
          'this._bitcoinStream.isOpen()',
          this._bitcoinStream.isOpen(),
          "this._connection['closed']",
          this._connection['closed'],
          'this._plugin.isConnected()',
          this._plugin?.isConnected()
        )

        if (this._bitcoinStream.isOpen()) {
          this._bitcoinStream.destroy()
        }

        if (!this._connection['closed']) {
          this._debug('waiting connection destroy')
          await this._connection.destroy()
          this._debug('connection destroyed')
        }

        // if (plugin.isConnected()) {
        //   this._debug('waiting plugin disconnect')
        //   await plugin.disconnect()
        //   this._debug('plugin disconnected')
        // }

        // resolve instead of reject to avoid delay
        this._debug('resolving')
        resolve()
      }

      const onConnectionError = (err: Error) => {
        this._debug(`onConnectionError(${err})`)
        cleanUp()
        reject(err)
      }

      const onStreamError = (err: Error) => {
        this._debug(`onStreamError(${err})`)
        // raise the stopmonetization back to page
        //this.stop()
        this._stream.emit('abort', this._requestId)
        cleanUp()
        reject(err)
      }

      const onUpdateAmountTimeout = async () => {
        // we set this before the async operation to prevent any race
        // conditions on cleanup
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        updateAmountTimeout = setTimeout(
          onUpdateAmountTimeout,
          UPDATE_AMOUNT_TIMEOUT
        )

        if (this._bitcoinStream.isOpen()) {
          const sendAmount = await this._bandwidth.getStreamSendMax()
          this._bitcoinStream.setSendMax(sendAmount)
        }
      }

      const cleanUp = () => {
        this._debug('cleanup()')
        this._bitcoinStream.removeListener('outgoing_money', onMoney)
        this._connection.removeListener('error', onConnectionError)
        //plugin.removeListener('disconnect', onPluginDisconnect)
        this._connection.removeListener('disconnect', onPluginDisconnect)
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        clearTimeout(updateAmountTimeout)
      }

      //plugin.once('disconnect', onPluginDisconnect)
      this._connection.once('disconnect', onPluginDisconnect)

      this._bitcoinStream.on('outgoing_money', onMoney)
      this._bitcoinStream.on('error', onStreamError)
      this._connection.once('error', onConnectionError)
      let updateAmountTimeout = setTimeout(
        onUpdateAmountTimeout,
        UPDATE_AMOUNT_TIMEOUT
      )
    })
  }

  async stop(): Promise<void> {
    this._active = false
    if (!this._connection || this._isShuttingDown) return
    this._isShuttingDown = true

    this._debug('initiating stream shutdown')
    if (this._bitcoinStream.isOpen()) {
      // Stop it sending any more than is already sent
      this._bitcoinStream.setSendMax(this._bitcoinStream.totalSent)
    }
    await this.waitHoldsUptoMs(2e3)
    await new Promise(resolve => {
      this._debug('severing bitcoin connection.')
      this._bitcoinStream.once('close', resolve)
      // don't destroy, need to resume later
      //this._bitcoinStream.destroy()
      this._connection.disconnect()
    })
    // this._debug(
    //   'stream close event fired; plugin connected=',
    //   this._plugin.isConnected()
    // )
    await this._connection.end()
    // stream createConnection() automatically closes the plugin as of
    // time of writing: https://github.com/interledgerjs/ilp-protocol-stream/blob/9b49b1cad11d4b7a71fb31a8da61c729fbba7d9a/src/index.ts#L69-L71
    // if (this._plugin.isConnected()) {
    //   this._debug('disconnecting plugin')
    //   await this._plugin.disconnect()
    //   this._debug('plugin disconnected')
    // }
  }

  getTotalSent(): string {
    return this._bitcoinStream ? this._bitcoinStream.totalSent : '0'
  }

  private onMoney(sentAmount: string, receipt?: string): void {
    const delivered = Number(this._connection.totalDelivered)
    const amount = delivered - this._lastDelivered
    this._debug('delivered', delivered, 'lastDelivered', this._lastDelivered)
    this._lastDelivered = delivered

    this._onMoney({
      sentAmount,
      // dest=received
      amount,
      assetCode: notNullOrUndef(this._connection.destinationAssetCode),
      assetScale: notNullOrUndef(this._connection.destinationAssetScale),
      receipt,
      // source=source
      sourceAmount: sentAmount,
      sourceAssetCode: this._connection.sourceAssetCode,
      sourceAssetScale: this._connection.sourceAssetScale
    })
  }

  private async waitHoldsUptoMs(totalMs: number): Promise<void> {
    while (totalMs > 0) {
      const holds = Object.keys(this._bitcoinStream['holds']).length
      this._debug({ holds: holds })
      if (holds === 0) {
        break
      } else {
        await timeout(100)
        totalMs -= 100
      }
    }
  }
}

async function sha256(preimage: Buffer): Promise<Buffer> {
  const digest = await crypto.subtle.digest({ name: 'SHA-256' }, preimage)
  return Buffer.from(digest)
}
