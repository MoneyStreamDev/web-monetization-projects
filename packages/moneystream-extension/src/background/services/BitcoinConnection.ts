import { EventEmitter } from 'events'
import * as Long from 'long'
import { Logger, logger } from './utils'
import { BitcoinStream } from './BitcoinStream'
import { Wallet, OutputCollection, Merkle } from 'moneystream-wallet'
import { Tx } from 'bsv'
import { portableFetch, SPSPResponse } from '@web-monetization/polyfill-utils'
import { Favicons } from './Favicons'

// set to true to store metadata onchain and locally
const historyKey = 'monetizationHistory'
const maxsessionfundingKey = 'maxsessionfunding'
const enjoyKey = 'monetizationEnjoyment'
const metaurl = "http://localhost:3013/api"

const TXT_CHANNEL = "moneystream"
const TXT_TAGS = ["moneystream"]
const TXT_CONTENT = "[See onchain](https://whatsonchain.com/tx/$TXID)  \n"

// if you do not specify a data-service-provider
// in your meta tag then it will use this default
// to manage the stream
// there is a service fee paid by the web site
const defaultServiceProvider 
  = 'https://cash.bitcoinofthings.com/stream/'

// interaction for building and sending one bitcoin packet
class SendBitcoinBundle {
  buildResult: any
  meta: any
  metahash: Buffer|null = null
  managerEvent: string = ''
  managerResponse: any
}

//for now, a placeholder stub 
// that will induce BitcoinStream to emit money
export class BitcoinConnection extends EventEmitter {
    protected _startTime: number = Math.floor(Date.now())/1000
    protected _closed: boolean
    protected sending: boolean
    protected connected: boolean
    protected _totalDelivered: Long
    protected _stream! : BitcoinStream
    //TODO: might have to move, manage it with _stream?
    protected _lastStreamableBundle: SendBitcoinBundle|null = null
    protected _sessionUtxos: OutputCollection|null = null
    private readonly _log: Logger
    private _payto: SPSPResponse = {destinationAccount:'unknown', sharedSecret: Buffer.from('secret','utf8')}
    private _initiatingUrl: string = ''
    private _serviceProvider: string
    protected _wallet: Wallet
    protected _merkle: Merkle = new Merkle()
    protected _favIcon: Favicons = new Favicons()
    destinationAssetCode:string = 'BSV'
    destinationAssetScale:number = 8
    sourceAssetCode:string = 'BSV'
    sourceAssetScale:number = 8
    // requestId is like a sessionId
    private _requestId: string
    private historyValue: string|null = null
    private maxsessionfundingValue: string|null = null
    private enjoyValue: string|null = null
    private doMeta:boolean = false

    constructor (
      log: Logger, 
      serviceProvider: string, 
      requestId:any, 
      wallet: Wallet
      ) {
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

    //returns url with ending slash
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
  initiatingUrl(url: string) {
    this._initiatingUrl = url
  }

  async createStream (): Promise<BitcoinStream> {
    const stream = new BitcoinStream({id:999,isServer:false,connectionId:"badconx"}, this._log)
      this._stream = stream
      this.historyValue = localStorage.getItem(historyKey)
      this.maxsessionfundingValue = localStorage.getItem(maxsessionfundingKey)
      this.enjoyValue = localStorage.getItem(enjoyKey)
      this.doMeta = this.historyValue === null ? false : this.historyValue === "true"
      
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
          const bundle = await this.sendBitcoin(this._wallet)
          if (bundle.buildResult.hex){
            this._lastStreamableBundle = bundle
            this._log(`made ${this._lastStreamableBundle.buildResult.hex}`)
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
    if (this._lastStreamableBundle) {
      const managerResponse = this.closeTheStream(this._lastStreamableBundle)
      //this.storeMeta(managerResponse, this._lastStreamableBundle)
    }
  }

  async closeTheStream(bundle: SendBitcoinBundle) {
    // send the final tx to svc provider
    const managerResponse = await this.sendManager('stop', bundle)
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

  // metadata about the transaction
  // TODO: add more context
  getSessionData(amount:Long) {
    return {
      start: this._startTime,
      stop: Math.floor(Date.now())/1000,
      sessionId: this._requestId,
      amount: amount.toNumber(),
      site: this._initiatingUrl,
      payTo: this._payto?.destinationAccount
    }
  }

  getNextEvent(wallet:Wallet, bundle: SendBitcoinBundle) {
    // if no outputs then stop
    if (bundle.buildResult.tx 
      && wallet.countOutputs(bundle.buildResult.tx) === 0) {
        return 'stop'
    }
    // check user maximum session amount policy
    if (this.maxsessionfundingValue === null) {
      // use reasonable defaults
      if (this.enjoyValue === null) {
        // no info to work from, make some default
        if (this._totalDelivered.toNumber() >= 20000) {
          return 'stop'
        }
      } else {
        const enjoyNumber = Number(this.enjoyValue)
        if (enjoyNumber < 33) {
          if (this._totalDelivered.toNumber() >= 20000) {
            return 'stop'
          }
        }
        if (enjoyNumber < 67) {
          if (this._totalDelivered.toNumber() >= 40000) {
            return 'stop'
          }
        }
        if (this._totalDelivered.toNumber() >= 60000) {
          return 'stop'
        }
    }
    } else {
      if (this._totalDelivered.toNumber() >= Number(this.maxsessionfundingValue)) {
        return 'stop'
      }
    }
    return 'progress'
  }

  /**
   * raise event that will send bitcoin
   * TODO: refer to ilp-protocol-stream:Connection
   * where most of original code has been left out
   * of here
   * @private
   */
  protected async sendBitcoin (wallet: any): Promise<SendBitcoinBundle> {
    // Actually send on the next tick of the event loop in case multiple streams
    // have their limits raised at the same time
    await new Promise((resolve, reject) => setImmediate(resolve))
    const bundle = new SendBitcoinBundle()
    bundle.buildResult = {hex:"", tx:new Tx(), utxos:undefined}
    let amountToSendFromStream = this._stream._getAmountAvailableToSend()
    this._log(`sendBitcoin ${amountToSendFromStream}`)
    // wallet could make amount less than requested
    if (amountToSendFromStream.toNumber() > 0) {
      try {
        if (this.doMeta === true) {
          bundle.meta = this.getSessionData(amountToSendFromStream)
          this._log(bundle.meta)
          bundle.metahash = this._merkle.hash(bundle.meta)
        }
        bundle.buildResult = await wallet.makeStreamableCashTx(
          amountToSendFromStream,
          null,true,this._sessionUtxos,
          bundle.metahash
        )
        // TODO: get amount actually funded from tx
        this._totalDelivered = amountToSendFromStream
        this._sessionUtxos = bundle.buildResult.utxos || null
      }
      catch (error) {
        // will error when wallet runs out of funds
        this._log(`session utxos: ${this._sessionUtxos?.satoshis}-${amountToSendFromStream.toNumber()}`)
        this._log(`wallet utxos: ${wallet.selectedUtxos?.satoshis}`)
        this._log(error)
        // if there is an error on our wallet making a tx then abort the stream
        this._stream.emit('error')
      }
      try {
        // stop stream if there are no outputs
        bundle.managerEvent = this.getNextEvent(wallet, bundle)
        bundle.managerResponse = 
          bundle.managerEvent === 'stop' ? 
            await this.closeTheStream(bundle)
            : await this.sendManager(bundle.managerEvent, bundle)
        this.logManagerResponse(bundle.managerResponse)
        if (bundle.managerResponse && bundle.managerResponse.status) {
            if (bundle.managerResponse.status === 'Missing Inputs') {
              throw new Error(`Error from stream manager: ${bundle.managerResponse.status}`)
            }
            if (bundle.managerResponse.status === "broadcast skipped, funding change below dust") {
              throw new Error(`Error from stream manager: ${bundle.managerResponse.status}`)
            }            
        } else {
          this._log(`no response?`)
          this._log(bundle)
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
    return bundle
  }

  //TODO: make this full featured text replacement
  getContent(managerResponse:any, bundle: SendBitcoinBundle) {
    return TXT_CONTENT.replace('$TXID', managerResponse?.txid)
  }

  getBaseUrl(site:string) {
    const path = site.split('/')
    if (path.length<3) return this.cleanUrl(site)
    return `${path[0]}//${path[2]}/`
  }

  getDomain(site:string) {
    const path = `${site}/`.split('/')
    if (path.length<3) return this.cleanUrl(site)
    return `${path[2]}`
  }

  async getImage(bundle: SendBitcoinBundle):Promise<string|null> {
    const baseurl = `${this.getDomain(bundle?.meta?.site)}`
    try {
      const favurl = await this._favIcon.getFavicon(baseurl)
      if (favurl.startsWith('http')) return favurl
      return `${baseurl}${favurl}`
    }
    catch {
      return null
    }
  }

  async storeMeta(
    managerResponse:any, 
    bundle: SendBitcoinBundle
  ) {
    const txid = managerResponse?.txid
    const hex = managerResponse?.hex
    // post
    const txt = {
      channel: TXT_CHANNEL,
      set: {
        [txid]: {
          tags: TXT_TAGS,
          meta: { 
            title: `${bundle.meta.site}`, 
            description: `${bundle.meta.sessionId}`,
            content: this.getContent(managerResponse,bundle),
            image: await this.getImage(bundle)
          },
          data: bundle.meta
        }
      }
    }
    // this._log(txt)
    try {
      const response = await portableFetch(metaurl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(txt)
      })
      const storageResponse = await response.json()
      if (!response.ok) {
        throw Error(`failed storage POST`)
      }
      this._log(storageResponse)
    }
    catch (err) {
      this._log(err)
    }
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
  // method parameter overrides whatever is in bundle
  async sendManager(
    method:string, 
    bundle: SendBitcoinBundle
  ) {
    if (!bundle.buildResult.hex) {
      return null
    } else {
      const manager = `${this._serviceProvider}${method}`
      const response = await portableFetch(manager, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          session: this._requestId,
          hex: bundle.buildResult.hex,
          obj: bundle.buildResult.txjson,
          payTo: this._payto.destinationAccount
        })
      })
      //use response.text() for non-json response
      const managerResponse = await response.json()
      if (!response.ok) {
        throw Error(`failed manager POST`)
      } else {
        if (this.doMeta === true && method === 'stop') {
          this.storeMeta(managerResponse, bundle)
        }
        // update monetization status here
        if (managerResponse 
          && managerResponse.returnResult
          && managerResponse.returnResult === "monetizing"
        ) {
          const current = localStorage.getItem('monetized')
          if (current === null || current !== 'true') {
            localStorage.setItem('monetized', 'true')
          }
        }
      }
      return managerResponse
    }
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
