/// <reference types="node" />
import { StorableBlindToken } from '@moneystream/privacypass-sjcl'
export declare function base64url(buf: Buffer): string
export declare const TOKEN_PREFIX = 'anonymous_token:'
export interface TimestampedSignature {
  signature: string
  month: string
}
export interface Token {
  token: string
  blindedTokenHash: string
  blindingFactor: string
}
export interface TokenStore {
  setItem: (key: string, value: string) => Promise<string>
  removeItem: (key: string) => Promise<void>
  iterate: (
    fn: (
      value: string,
      key: string,
      iterationNumber: number
    ) => StorableBlindToken | undefined
  ) => Promise<StorableBlindToken | undefined>
}
export { StorableBlindToken }
export interface AnonymousTokensOptions {
  redeemerUrl: string
  signerUrl: string
  store: TokenStore
  debug?: typeof console.log
  batchSize: number
}
export declare class AnonymousTokens {
  private redeemerUrl
  private signerUrl
  private store
  private tokenMap
  private debug
  private batchSize
  private storedTokenCount
  private _populateTokensPromise
  constructor({
    redeemerUrl,
    signerUrl,
    store,
    debug,
    batchSize
  }: AnonymousTokensOptions)
  getToken(moneystreamAuthToken: string): Promise<string>
  private _redeemToken
  private _getSignedToken
  removeToken(btpToken: string): Promise<void>
  private _removeSignedToken
  private _signToken
  private populateTokens
  private _populateTokensNow
  private _storeNewTokens
  private _getCommitments
  private _verifyProof
}
//# sourceMappingURL=index.d.ts.map
