export interface AdaptiveBandwidthTiers {
  getBandwidth(url: string): Promise<number>
}

const enjoyKey = 'monetizationEnjoyment'

export class AdaptiveBandwidth {
  // Fields for calculation of outgoing money
  private _timeStarted!: number
  private _sentAmount!: number

  constructor(
    private _pageUrl: string,
    private _tiers: AdaptiveBandwidthTiers,
    private _debug: (...args: unknown[]) => void = () => undefined
  ) {
    this.reset()
  }

  public reset() {
    this._timeStarted = Date.now()
    this._sentAmount = 0
    this._debug('reset amount parameters to 0')
  }

  addSentAmount(amount: string) {
    this._debug('adding sent amount of', amount)
    this._sentAmount += Number(amount) || 0
  }

  getSatoshisPerSecond() : number {
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
    const sendAmount = Math.floor(secondsElapsed * bandwidth - this._sentAmount)
    this._debug('current send amount is', sendAmount)
    return sendAmount
  }
}
