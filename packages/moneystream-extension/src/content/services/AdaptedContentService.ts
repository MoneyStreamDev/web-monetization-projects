import { inject, injectable } from 'inversify'
import { GraphQlClient } from '@moneystream/client'
import { DocumentMonetization } from '@web-monetization/wext/content'

import * as tokens from '../../types/tokens'
import { getAdaptedSite } from '../util/getAdaptedSite'
import { debug } from '../util/logging'
import { ContentRuntime } from '../types/ContentRunTime'
import { FetchYoutubeChannelId } from '../../types/commands'
import { FetchMetanet } from '../../types/commands'

import { Frames } from './Frames'

interface GetPageData {
  adaptedPage: {
    paymentPointer: string
    channelImage: string
  }
}

// for demo purposes! need a registration service
// for adapted site ownership
const DUMMY_POINTER = "fullcycle@moneybutton.com"
const DUMMY_URL = "https://www.youtube.com/watch?v=xV2RYQ1cTEU"

@injectable()
export class AdaptedContentService {
  // Keep track of invocations of checkAdaptedContent so we can abort
  // on stale operations
  private runs = 0

  private constructor(
    private monetization: DocumentMonetization,
    @inject(tokens.ContentRuntime)
    private contentRuntime: ContentRuntime,
    private window: Window,
    private client: GraphQlClient
  ) {}

  async fetchChannelId(videoUrl: string) {
    return new Promise<string | null>(resolve => {
      const message: FetchYoutubeChannelId = {
        command: 'fetchYoutubeChannelId',
        data: {
          youtubeUrl: videoUrl
        }
      }
      this.contentRuntime.sendMessage(message, resolve)
    })
  }

  async fetchMetanet(url: string) {
    return new Promise<string | null>(resolve => {
      const message: FetchMetanet = {
        command: 'fetchMetanet',
        data: { url: url }
      }
      this.contentRuntime.sendMessage(message, resolve)
    })
  }

  async adaptedPageDetails(url: string, site: string) {
    debug('fetching payment pointer for this page', url, site)

    let paymailPointer = null
    const variables = { url }
    if (site === 'powping') {
      console.log(`POWPING ${url}`)
      //TODO: fetch page
      //could get page or could get from metanet
      const paymail = await this.fetchMetanet(url)
      debug('paymail', { paymail })
      if (paymail) {
        debug('found paymail', paymail, 'for', url)
        // Object.assign(variables, { channelId })
        paymailPointer = paymail
      }
    }

    if (site === 'youtube') {
      const channelId = await this.fetchChannelId(url)
      debug('channelId', { channelId })
      if (channelId) {
        debug('found channel id', channelId, 'for', url)
        Object.assign(variables, { channelId })
      }

      // this hack is a stub. will need to call service
      // to get the paymail from youtube
      if (url.startsWith(DUMMY_URL)) {
        paymailPointer = DUMMY_POINTER
      }
    }

    const query = `query getPage($url: String!, $channelId: String) {
  adaptedPage(videoUrl: $url, channelId: $channelId) {
    paymentPointer
    channelImage
  }
}`

    // const paymentPointerQuery = await this.client.query<GetPageData>({
    //   query,
    //   token: null,
    //   variables
    // })

    // TODO: implement an adapted page service
    const paymentPointerQuery = {
      data:{
        adaptedPage: {
          paymentPointer: paymailPointer,
          channelImage: null
        }
      }
    }

    debug({ paymentPointerQuery })

    const data = paymentPointerQuery.data
    const adaptedPage = data?.adaptedPage
    const paymentPointer = adaptedPage?.paymentPointer
    const channelImage = adaptedPage?.channelImage
    return {
      channelImage,
      paymentPointer
    }
  }

  async checkAdaptedContent() {
    const run = ++this.runs
    const currentUrl = this.window.location.href
    debug('Checking for adapted content', currentUrl)
    const adaptedSite = getAdaptedSite(currentUrl)

    if (adaptedSite) {
      const { channelImage, paymentPointer } = await this.adaptedPageDetails(
        currentUrl,
        adaptedSite
      )
      if (this.runs !== run) {
        debug('stale checkAdaptedContent')
        return
      }
      if (!paymentPointer) {
        debug('page is not monetized. url=', currentUrl)
        this.monetization.setMetaTagContent(undefined)
      } else {
        this.contentRuntime.sendMessage({
          command: 'adaptedSite',
          data: {
            state: true,
            channelImage
          }
        })
        this.monetization.setMetaTagContent(paymentPointer)
      }
    }
  }
}
