import { Wallet } from 'moneystream-wallet'
import * as Long from 'long'

const demo_wif = 'L5bxi2ef2R8LuTvQbGwkY9w6KJzpPckqRQMnjtD8D2EFqjGeJnSq'

describe('wallet functions', () => {
    it ('should make a simple transaction', async () => {
        const w = new Wallet()
        expect(w).toBeInstanceOf(Wallet)
        w.loadWallet(demo_wif)
        await w.loadUnspent()
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
        w.loadWallet(demo_wif)
        //'1KUrv2Ns8SwNkLgVKrVbSHJmdXLpsEvaDf'
        const buildResult = await w.makeStreamableCashTx(Long.fromNumber(100))
        expect(buildResult.tx.txIns.length).toBe(1)
        w.logDetailsLastTx()
    })
    it ('should load wallet balance', async () => {
        const w = new Wallet()
        expect(w).toBeInstanceOf(Wallet)
        w.loadWallet(demo_wif)
        const utxos = await w.loadUnspent()
        expect(utxos.count).toBeGreaterThan(0)
        expect(w.balance).toBeGreaterThan(0)
        w.logUtxos(utxos.items)
    })
})