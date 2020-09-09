export const ADAPTED_REGEX: Record<string, RegExp> = {
  twitch: /https?:\/\/(www\.)?twitch\.tv(\/.*)?/i,
  youtube: /https?:\/\/(www\.)?youtube\.com\/(watch|channel)(.*)/i,
  powping: /https?:\/\/(www\.)?powping\.com\/posts\/[0-9a-fA-F]{64}?/i,
}

const ADAPTED_SITES = Object.keys(ADAPTED_REGEX)

export function getAdaptedSite(url: string) {
  for (const site of ADAPTED_SITES) {
    if (ADAPTED_REGEX[site].test(url)) {
      return site
    }
  }
  return null
}
