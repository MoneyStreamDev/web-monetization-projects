import { EventEmitter } from 'events'
import * as Long from 'long'
import { Logger, logger } from './utils'
import { BitcoinStream } from './BitcoinStream'
import { Wallet, OutputCollection } from 'moneystream-wallet'
import { portableFetch, SPSPResponse } from '@web-monetization/polyfill-utils'
import WalletStore from './WalletStore'

// remove demo_wif once UI is ready
const demo_wif = 'L5o1VbLNhELT6uCu8v7KdZpvVocHWnHBqaHe686ZkMkyszyU6D7n'

// if you do not specify a data-service-provider
// in your meta tag then it will use this default
// to manage the stream
// there is a service fee paid by the web site
const defaultServiceProvider 
  = 'https://stream.bitcoinofthings.com/stream/'

//for now, a placeholder stub 
// that will induce BitcoinStream to emit money
export class BitcoinConnection extends EventEmitter {
    protected _closed: boolean
    protected sending: boolean
    protected connected: boolean
    protected _totalDelivered: Long
    protected _stream! : BitcoinStream
    //TODO: might have to move, manage it with _stream?
    protected _lastNonFinalTx: string = ''
    protected _sessionUtxos?: OutputCollection
    private readonly _log: Logger
    private _payto: SPSPResponse = {destinationAccount:'unknown', sharedSecret: Buffer.from('secret','utf8')}
    private _serviceProvider: string
    destinationAssetCode:string = 'BSV'
    destinationAssetScale:number = 8
    sourceAssetCode:string = 'BSV'
    sourceAssetScale:number = 8
    // requestId is like a sessionId
    private _requestId: string
    constructor (log: Logger, 
      serviceProvider: string, requestId:any) {
      super()
      this._closed = false
      this.sending = false
      this.connected = true
      this._totalDelivered = Long.UZERO
      this._log = log
      this._requestId = requestId
      this._serviceProvider = this.cleanUrl(serviceProvider)
    }

    cleanUrl(url:string):string {
      if (!url) return defaultServiceProvider
      let fixedurl = url
      if (!fixedurl.startsWith("https://")) fixedurl = `https://${fixedurl}`
      if (!fixedurl.endsWith("/")) fixedurl = `${fixedurl}/`
      return fixedurl
    }

    get closed (): boolean {
        return this._closed
    }
    
  /**
   * Total delivered so far, denominated in the connection plugin's units.
   */
  get totalDelivered (): string {
    return this._totalDelivered.toString()
  }

  //set monetization payment pointer
  payTo(spspDetails: any) {
    this._payto = spspDetails
  }

  createStream (): BitcoinStream {
      const stream = new BitcoinStream({id:999,isServer:false,connectionId:"badconx"}, this._log)
      this._stream = stream
      stream.on('_maybe_start_send_loop', this.startSendLoop.bind(this))
      return stream
  }

  /**
   * (Internal) Start sending packets with money and/or data, as necessary.
   * @private
   */
  protected async startSendLoop () {
    if (this.sending) {
      return
    }
    // if (this.remoteState === RemoteState.Closed) {
    //   this._log('remote connection is already closed, not starting another loop')
    //   this.safeEmit('_send_loop_finished')
    //   return
    // }
    // if (!this._destinationAccount) {
    //   this._log.debug('not sending because we do not know the client\'s address')
    //   this.safeEmit('_send_loop_finished')
    //   return
    // }

    this.sending = true
    this._log('starting send loop')

    const store = new WalletStore()
    const swallet = await store.get()
    let wjson = null
    if (swallet) wjson = JSON.parse(swallet)
    this._log(`Creating wallet. TODO: singleton service`)
    const wallet = new Wallet(store)
    wallet.loadWallet(wjson?.wif || demo_wif)
    //store the wallet local
    if (!wjson) {
      const stored = await wallet.store(wallet.toJSON())
      console.log(`stored ${stored}`)
    }
    try {
      while (this.sending) {
        if (!this.connected) {
          // exchange satoshis to local currency not currently supported
          //await this.setupExchangeRate()
          this.connected = true
        } else {
          // TODO Send multiple packets at the same time (don't await promise)
          // TODO Figure out if we need to wait before sending the next one
          const buildResult = await this.sendBitcoin(wallet)
          if (buildResult.hex){
            this._lastNonFinalTx = buildResult.hex
            this._log(`made ${this._lastNonFinalTx}`)
          }
        }
      }
    } catch (err) {
      // TODO should a connection error be an error on all of the streams?
      return this.destroy(err)
    }
    this._log('finished sending')
    this.safeEmit('_send_loop_finished')
    //TODO: reimplement multiple streams?
    //for (let [_, stream] of this.streams) {
      this._stream.emit('_send_loop_finished')
    //}
  }

  async finalizeStream() {
    if (this._lastNonFinalTx) {
      this.logManagerResponse(await this.sendManager('stop', this._lastNonFinalTx))
    }
  }

  // tell manager to close the bitcoin stream
  async end() {
    await this.finalizeStream()
    this._log('bitcoin connection ended')
  }

  destroy (err?: Error) {
      this._closed = true
  }

  /**
   * raise event that will send bitcoin
   * TODO: refer to ilp-protocol-stream:Connection
   * where most of original code has been left out
   * of here
   * @private
   */
  protected async sendBitcoin (wallet: any): Promise<any> {
    // Actually send on the next tick of the event loop in case multiple streams
    // have their limits raised at the same time
    await new Promise((resolve, reject) => setImmediate(resolve))
    let buildResult = {hex:"",utxos:undefined}
    let amountToSendFromStream = this._stream._getAmountAvailableToSend()
    this._log(`sendBitcoin ${amountToSendFromStream}`)
    this._totalDelivered = amountToSendFromStream
    if (amountToSendFromStream.toNumber() > 0) {
      try {
        //console.log(this._payto.destinationAccount)
        buildResult = await wallet.makeStreamableCashTx(
          amountToSendFromStream,
          null,true,this._sessionUtxos
        )
        this._sessionUtxos = buildResult.utxos
        //this._log(wallet.lastTx.toJSON())
        this.sendManager('progress', buildResult.hex)
          .then( response => this.logManagerResponse(response))
      }
      catch (error) {
          this._log(error)
      }
      this._stream.emit('outgoing_money')
    }
    this.sending = false
    return buildResult
  }

  logManagerResponse(response: any) {
    if (response) {
      if (response.error) console.error(response)
      else this._log(response)
    }
  }

  // forward money stream to stream manager
  // configure your stream manager url in meta tag
  // in attribute data-service-provider
  async sendManager(method:string, tx:string, txjson?:object) {
    const manager = `${this._serviceProvider}${method}`
    const response = await portableFetch(manager, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        session: this._requestId,
        hex: tx,
        obj: txjson,
        payTo: this._payto.destinationAccount
      })
    })
    //use response.text() for non-json response
    const managerResponse = await response.json()
    if (!response.ok) {
      console.log(`failed manager POST`)
    }
    return managerResponse
  }

  protected safeEmit (event: string, ...args: any[]) {
    try {
      const emitArgs:[string|symbol, ...any[]] = [event, args]
      //args.unshift(event)
      this.emit.apply(this, emitArgs)
    } catch (err) {
      this._log('error in %s handler: %s', event, err)
    }
  }
}
