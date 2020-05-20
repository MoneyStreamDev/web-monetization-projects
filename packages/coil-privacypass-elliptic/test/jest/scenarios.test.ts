import {
  hashAndInc,
  newRandomPointEl,
  randomBN
} from '@coil/privacypass-elliptic'
import * as elliptic from 'elliptic'
import BN from 'bn.js'

const p256 = new elliptic.ec('p256')
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const p256Order = p256.n!

const randSecret = () => randomBN(p256Order)
const randomPoint = () => {
  const random = newRandomPointEl()
  return random.point
}

type Point = elliptic.curve.base.BasePoint

const divPt = (pt: Point, divisor: BN) => {
  const divisorInverse = (divisor as any)._invmp(p256Order)
  return pt.mul(divisorInverse)
}

describe('PrivacyPass Scenarios as code scribbles', () => {
  it('should describe scenario 1', () => {
    // ### client issue request
    const T = randomPoint()
    const creds = 'trackMe'
    // The client takes a point on an elliptic curve T and sends it to the server.
    const issueRequest = { T, creds }

    // ### server issue response
    const s = randSecret()
    // The server applies a secret transformation
    // (multiplication by a secret number s)
    const sT = issueRequest.T.mul(s)
    // and sends it back.
    const issueResponse = { sT }
    // Cheekily we keep track of theses issues
    const trackerDB = new Map([[issueRequest.T, issueRequest.creds]])

    // ### client redeem request
    const redeemRequest = { sT: issueResponse.sT, T }

    // ### server redeem response
    expect(redeemRequest.T.mul(s).eq(redeemRequest.sT)).toBe(true)
    // ## Problem: Linkability
    // In this situation, the server knows T because it has seen it already.
    // This lets the server connect the two requests, something we’re trying to avoid.
    // This is where we introduce the blinding factor.
    // Unfortunately we *can* track them
    expect(trackerDB.get(redeemRequest.T)).toEqual('trackMe')
  })
  it('should describe scenario 2', () => {
    const creds = 'trackMe'

    // ### client issue request
    const T = randomPoint()
    // Rather than sending T, the client generates its own secret number b.
    const b = randSecret()
    // The client multiplies the point T by b
    const bT = T.mul(b)
    // before sending it to the server
    const issueRequest = { bT, creds }

    // ### server issue response
    const s = randSecret()
    // The server does the same thing as in scenario 1
    // (multiplies the point it receives by s).
    // s(bT)
    const sbT = issueRequest.bT.mul(s)
    const issueResponse = { sbT }

    // The client knows b.
    // noinspection UnnecessaryLocalVariableJS
    const knownB = b
    // s(bT) is equal to b(sT) because multiplication is
    // commutative.
    {
      const sT = T.mul(s)
      // b(sT)
      const bsT = sT.mul(knownB)
      expect(sbT.eq(bsT)).toBe(true)
    }

    // The client can compute sT from b(sT) by dividing by b.
    const bInverse = (knownB as any)._invmp(p256Order)
    // TODO: why does the above work ??

    // we can divide by b by multiplying by its inverse
    const sT = issueResponse.sbT.mul(bInverse)
    // works both ways
    expect(sT.mul(b).eq(sbT)).toBe(true)

    const redeemRequest = { T, sT }
    // Since only the server knows s, it can confirm that sT
    // is T multiplied by s and will verify the redemption.
    expect(redeemRequest.T.mul(s).eq(redeemRequest.sT)).toBe(true)

    // Problem: Malleability
    {
      const a = randSecret()
      const aT = redeemRequest.T.mul(a)
      const aST = redeemRequest.sT.mul(a)
      expect(aT.mul(s).eq(aST)).toBe(true)
    }
  })
  it('should describe scenario 3', () => {
    const creds = 'trackMe'
    // Instead of picking an arbitrary point T, the client can pick a number t.
    const t = randSecret()
    const b = randSecret()
    // The point T can be derived by hashing t to a point
    // on the curve using a one-way hash.
    const T = hashAndInc(t.toBuffer())

    // ### Client Issue Request
    const bT = T.mul(b)
    const issueRequest = { bT, creds }

    // ### Server Issue Response
    const s = randSecret()
    const sbT = issueRequest.bT.mul(s)
    const issueResponse = { sbT }

    // ### Client Redeem Request
    const sT = divPt(issueResponse.sbT, b)
    const redeemRequest = { t, sT }

    // ### Server Redeem Response
    {
      const recomputedT = hashAndInc(t.toBuffer())
      expect(recomputedT.mul(s).eq(redeemRequest.sT)).toBe(true)
    }

    // The hash guarantees that it’s hard to find another
    // number that hashes to aT for an arbitrary a.
    {
      //
    }
    // ## Problem: Redemption hijacking
    // If the values t and sT are sent across an unsecured network,
    // an adversary could take them and use them for their own redemption.

    // Sending sT is what lets attackers hijack a redemption.

    // Since the server can calculate sT from t on it’s own,
    // the client doesn’t actually need to send it.
    // All the client needs to do is prove that it knows sT.

    // A trick for doing this is to use t and sT to derive a HMAC key
    // and use it to sign a message that relates to the redemption.

    // Without seeing sT, the attacker will not be able to take this redemption
    // and use it for a different message because it won’t be able to compute
    // the HMAC key
  })

  it('should describe scenario 4', () => {})
  it('should describe scenario 5', () => {})
  it('should describe scenario 6', () => {})
  it('should describe scenario 7', () => {})
})
