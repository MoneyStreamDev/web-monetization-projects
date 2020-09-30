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
      // first search powping
      let searcher = /<a class='username' [^>]+>[^(]+ \(([^)]+)\)/i
      let searched: RegExpExecArray | null = null
      let found: string | null = null
      searched = searcher.exec(chunk)
      if (searched) {
        found = searched[1]
        this.log('found', found)
      }
      if (found) return found ?? null
      // search for powpress clipboard info
      searcher = /<p>signed:&nbsp;<a href="[\S]+"\>([\S]+)<\/a>/i
      searched = searcher.exec(chunk)
      if (searched) {
        found = searched[1]
        this.log('found', found)
      }
      return found ?? null
    }
  }
}
