import { Wallet } from 'moneystream-wallet'
import * as Long from 'long'

const demo_wif = 'L5o1VbLNhELT6uCu8v7KdZpvVocHWnHBqaHe686ZkMkyszyU6D7n'

describe('wallet functions',() => {
    it ('should make a transaction', async () => {
        const w = new Wallet()
        expect(w).toBeInstanceOf(Wallet)
        w.loadWallet('L5o1VbLNhELT6uCu8v7KdZpvVocHWnHBqaHe686ZkMkyszyU6D7n')
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