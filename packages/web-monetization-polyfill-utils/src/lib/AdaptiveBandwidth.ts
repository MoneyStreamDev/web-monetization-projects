export interface AdaptiveBandwidthTiers {
  getBandwidth(url: string): Promise<number>
}

//TODO: reference types or pass in
const enjoyKey = 'monetizationEnjoyment'

export class AdaptiveBandwidth {
  // Fields for calculation of outgoing money
  private _timeStarted!: number
  private _sentAmount!: number
  private _exchangeRate: string = ''

  constructor(
    private _pageUrl: string,
    private _tiers: AdaptiveBandwidthTiers,
    private _offer: any,
    private _debug: (...args: unknown[]) => void = () => undefined
  ) {
    this.reset()
  }

  public reset() {
    this._timeStarted = Date.now()
    this._sentAmount = 0
    // STORAGE_KEY.exchangeRate
    this._exchangeRate = localStorage.getItem('exchangeRate') || ''
    this._debug('reset amount parameters to 0')
  }

  addSentAmount(amount: string) {
    this._debug('adding sent amount of', amount)
    this._sentAmount += Number(amount) || 0
  }

  getTotalSec(duration:string) {
    // TODO '0:2:34'
    const dur = duration.split(':')
    const hours = Number(dur[0])*60*60
    const minutes = Number(dur[1])*60
    const seconds = Number(dur[2])
    return hours + minutes + seconds
  }

  getSatoshisPerCent() {
    // TODO, update default
    if (!this._exchangeRate) return 5000
    const dollars_per_coin = Number(this._exchangeRate)
    const cents_per_coin = dollars_per_coin*100
    const cents_per_satoshis = cents_per_coin/1e8
    const satoshis_per_cent = 1/cents_per_satoshis
    // console.log(`satoshis_per_cent`, satoshis_per_cent)
    return satoshis_per_cent
  }

  getSatoshisPerSecondFromOffer() {
    //offer amount is cents, translate to satoshis per second
    //{"session":...,"amount":25,"denomination":"cent","rate":"total","duration":"0:2:34"}
    // 25 cents per 2:34 min => 812 sat/sec
    const cents_total = this._offer.amount
    const total_sec = this.getTotalSec(this._offer.duration)
    // console.log(`total_sec`, total_sec)
    const cents_per_sec = cents_total/total_sec
    const satoshis_per_cent = this.getSatoshisPerCent()
    const satoshis_per_sec = cents_per_sec * satoshis_per_cent
    // console.log(`satoshis_per_sec`, satoshis_per_sec)
    return satoshis_per_sec
  }

  getSatoshisPerSecond() : number {
    if (this._offer 
      && this._offer.duration
      && this._offer.amount
    ) return this.getSatoshisPerSecondFromOffer()
    // This determines the monetization rate
    // 1 cent per minute ~83 
    try {
      const enjoyValue = localStorage.getItem(enjoyKey)
      if (enjoyValue === null) return 20
      const enjoyInt = parseInt(enjoyValue.toString(),10)
      if (enjoyInt > 67) return 60
      if (enjoyInt > 34) return 40
      return 20
    }
    catch { 
      return 20
    }
  }

  // noinspection DuplicatedCode
  async getStreamSendMax() {
    const time = Date.now()
    const timeElapsed = time - this._timeStarted
    const secondsElapsed = timeElapsed / 1000
    //TODO: reenable adaptive bandwidth
    //const bandwidth = await this._tiers.getBandwidth(this._pageUrl)
    const bandwidth = this.getSatoshisPerSecond()
    // console.log(`satoshispersec`,bandwidth)
    const sendAmount = Math.floor(secondsElapsed * bandwidth - this._sentAmount)
    this._debug('current send amount is', sendAmount)
    return sendAmount
  }
}
