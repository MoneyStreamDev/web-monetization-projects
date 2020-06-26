type TestUrls = Record<string, string>

type Domain = string

const urls = {
  'https://moneystream.com': {
    twitchUrl: 'https://twitch.tv/vinesauce',
    youtubeUrl: 'https://www.youtube.com/watch?v=-QMbZx_w2_Y',
    externalSite: 'https://www.xrptipbot.com/',
    moneystreamArticle:
      'https://moneystream.com/p/thomasgardnerjr/Margaritaville-Jimmy-Buffett-cover-w-Sharper-s-Florist/dwntYG8d5'
  },
  'https://staging.moneystream.com': {
    moneystreamArticle:
      'https://staging.moneystream.com/p/androswong418/Andros-first-post/pD5aXIAvH'
  }
} as Record<Domain, TestUrls>

export const testUrls = urls
