import { injectable } from 'inversify'

import { logger, Logger } from './utils'

@injectable()
export class MetanetService {
  constructor(
    @logger('MetanetService')
    private log: Logger
  ) {}

  async fetchPaymail(url: string) {
    let resp: Response
    try {
      resp = await fetch(url, {
        mode: 'same-origin',
        cache: 'only-if-cached'
      })
    } catch (e) {
      resp = await fetch(url)
    }

    if (!resp.ok || !resp.body) {
      return null
    } else {
      const chunk = await resp.text()

      this.log('searching page length', chunk.length)
      //const searcher = /"channelId":"(.*?)"|data-channel-external-id="(.*?)"/g
      const searcher = /<a class='username' [^>]+>[^(]+ \(([^)]+)\)/i
      let searched: RegExpExecArray | null = null
      let found: string | null = null
      // do {
        searched = searcher.exec(chunk)
        if (searched) {
          this.log(searched)
          found = searched[1]
          this.log('found', found)
         } //else {
      //     this.log('not found')
      //   }
      // } while (searched)
      return found ?? null
    }
  }
}
