import { EventEmitter } from 'events'
import * as Long from 'long'
import { Logger, logger } from './utils'
import { BitcoinStream } from './BitcoinStream'
import { Wallet, OutputCollection } from 'moneystream-wallet'
import { Tx } from 'bsv'
import { portableFetch, SPSPResponse } from '@web-monetization/polyfill-utils'

// if you do not specify a data-service-provider
// in your meta tag then it will use this default
// to manage the stream
// there is a service fee paid by the web site
const defaultServiceProvider 
  = 'https://cash.bitcoinofthings.com/stream/'

//for now, a placeholder stub 
// that will induce BitcoinStream to emit money
export class BitcoinConnection extends EventEmitter {
    protected _closed: boolean
    protected sending: boolean
    protected connected: boolean
    protected _totalDelivered: Long
    protected _stream! : BitcoinStream
    //TODO: might have to move, manage it with _stream?
    protected _lastStreamableTx: string = ''
    protected _sessionUtxos: OutputCollection|null = null
    private readonly _log: Logger
    private _payto: SPSPResponse = {destinationAccount:'unknown', sharedSecret: Buffer.from('secret','utf8')}
    private _serviceProvider: string
    protected _wallet: Wallet
    destinationAssetCode:string = 'BSV'
    destinationAssetScale:number = 8
    sourceAssetCode:string = 'BSV'
    sourceAssetScale:number = 8
    // requestId is like a sessionId
    private _requestId: string
    constructor (log: Logger, 
      serviceProvider: string, requestId:any, wallet: Wallet) {
      super()
      this._wallet = wallet
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

  async createStream (): Promise<BitcoinStream> {
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
    if (!this._sessionUtxos) this._log(`empty session utxos`)
    else this._log(`session utxos ${this._sessionUtxos.count}: ${this._sessionUtxos.satoshis}`)
    try {
      while (this.sending) {
        if (!this.connected) {
          // exchange satoshis to local currency not currently supported
          //await this.setupExchangeRate()
          this.connected = true
        } else {
          // TODO Send multiple packets at the same time (don't await promise)
          // TODO Figure out if we need to wait before sending the next one
          const buildResult = await this.sendBitcoin(this._wallet)
          if (buildResult.hex){
            this._lastStreamableTx = buildResult.hex
            this._log(`made ${this._lastStreamableTx}`)
          }
        }
      }
    } catch (err) {
      // TODO should a connection error be an error on all of the streams?
      this.destroy(err)
      //throw the error, should eventually abort monetization
      throw err
    }
    this._log('finished sending')
    this.safeEmit('_send_loop_finished')
    //TODO: reimplement multiple streams?
    //for (let [_, stream] of this.streams) {
      this._stream.emit('_send_loop_finished')
    //}
  }

  async finalizeStream() {
    if (this._lastStreamableTx) {
      this.closeTheStream(this._lastStreamableTx)
    }
  }

  async closeTheStream(txhex:string) {
    // send the final tx to svc provider
    const managerResponse = await this.sendManager('stop', txhex)
    // this.logManagerResponse(managerResponse)
    // TODO: should mark encumbered utxo spent
    // add the change output as spendable
    // i.e. chain the transactions
    // for now, do it the slow way, through index api
    this._sessionUtxos = null
    this._wallet.clear()
    return managerResponse
  }

  // tell manager to close the bitcoin stream
  async end() {
    await this.finalizeStream()
    this._log('bitcoin connection ended')
  }

  async disconnect() {
    // only to fire the onplugindisconnect code
    this.emit('disconnect')
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
    let buildResult = {hex:"", tx:new Tx(), utxos:undefined}
    let amountToSendFromStream = this._stream._getAmountAvailableToSend()
    this._log(`sendBitcoin ${amountToSendFromStream}`)
    // wallet could make amount less than requested
    if (amountToSendFromStream.toNumber() > 0) {
      try {
        buildResult = await wallet.makeStreamableCashTx(
          amountToSendFromStream,
          null,true,this._sessionUtxos
        )
        // TODO: get amount actually funded from tx
        this._totalDelivered = amountToSendFromStream
        this._sessionUtxos = buildResult.utxos || null
        //this._log(buildResult.utxos)
      }
      catch (error) {
        // will error when wallet runs out of funds
        console.log(`session utxos: ${this._sessionUtxos?.satoshis}-${amountToSendFromStream.toNumber()}`)
        console.log(`wallet utxos: ${wallet.selectedUtxos?.satoshis}`)
        this._log(error)
        // if there is an error on our wallet making a tx then abort the stream
        this._stream.emit('error')
      }
      try {
        // stop stream if there are no outputs
        const managerEvent = (buildResult.tx && buildResult.tx!.txOuts.length === 0) 
          ? 'stop' : 'progress'
        const managerResponse = 
          managerEvent === 'stop' ? 
            await this.closeTheStream(buildResult.hex)
            : await this.sendManager(managerEvent, buildResult.hex)
        this.logManagerResponse(managerResponse)
        if (managerResponse.status) {
            if (managerResponse.status === 'Missing Inputs') {
              throw new Error(`Error from stream manager: ${managerResponse.status}`)
            }
            if (managerResponse.status === "broadcast skipped, funding change below dust") {
              throw new Error(`Error from stream manager: ${managerResponse.status}`)
            }            
        }
        // triggers onMoney event handler for normal monetizing process
        this._stream.emit('outgoing_money')
      }
      catch (error) {
        // service provider has a problem. our wallet can keep monetizing
        // in case the service provider can heal itself and keep going
        this._log(error)
        // do not throw error or allow x seconds to see if service provider can recover
        // for now need to make monetization stop so throw it
        // throw error
        this._stream.emit('error')
      }
    }
    this.sending = false
    return buildResult
  }

  logManagerResponse(response: any):any {
    if (response) {
      if (response.error) console.error(response)
      else this._log(response)
    }
    return response
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
      throw Error(`failed manager POST`)
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
