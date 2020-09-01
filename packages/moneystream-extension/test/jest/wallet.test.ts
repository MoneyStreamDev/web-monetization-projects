import { Wallet, OutputCollection, UnspentOutput, KeyPair } from 'moneystream-wallet'
import * as Long from 'long'

const someHashBufString = '1aebb7d0776cec663cbbdd87f200bf15406adb0ef91916d102bcd7f86c86934e'

function createUtxos(count:number, satoshis:number):OutputCollection {
    const lotsOfUtxos = new OutputCollection()
    for (let index = 0; index < count; index++) {
      const testUtxo = new UnspentOutput(
        satoshis,
        new KeyPair().fromRandom().toOutputScript(),
        someHashBufString,
        index
      )
      lotsOfUtxos.add(testUtxo)
    }
    return lotsOfUtxos
  }

describe('wallet functions', () => {
    it ('should make a simple transaction', async () => {
        const w = new Wallet()
        expect(w).toBeInstanceOf(Wallet)
        w.loadWallet()
        w.selectedUtxos = createUtxos(1, 2000)
        const sats = w.balance - 500
        expect(sats).toBeGreaterThan(500)
        const buildResult = await w.makeSimpleSpend(Long.fromNumber(sats), undefined, '1SCVmCzdLaECeRkMq3egwJ6yJLwT1x3wu')
        expect(buildResult.tx.txIns.length).toBeGreaterThan(0)
        expect(buildResult.tx.txOuts[0].valueBn.toNumber()).toBeGreaterThan(546)
        w.logDetailsLastTx()
    })
    it ('should make a spendable transaction', async () => {
        const w = new Wallet()
        expect(w).toBeInstanceOf(Wallet)
        w.loadWallet()
        w.selectedUtxos = createUtxos(1,1000)
        const buildResult = await w.makeStreamableCashTx(
          Long.fromNumber(100)
        )
        expect(buildResult.tx.txIns.length).toBe(1)
        w.logDetailsLastTx()
    })
    it ('should error making empty transaction', async () => {
        const w = new Wallet()
        expect(w).toBeInstanceOf(Wallet)
        w.loadWallet()
        w.selectedUtxos = createUtxos(1,1000)
        const buildResult = await w.makeStreamableCashTx(
            Long.fromNumber(250),
            null,true, new OutputCollection(),
            Buffer.from('moneystream')
          )
        expect(buildResult.tx.txIns.length).toBe(1)
    })
    it ('should load wallet balance', async () => {
        const w = new Wallet()
        expect(w).toBeInstanceOf(Wallet)
        w.loadWallet()
        w.selectedUtxos = createUtxos(1,1000)
        expect(w.balance).toBeGreaterThan(0)
    })
})