import { Wallet } from 'moneystream-wallet'
import * as Long from 'long'

describe('wallet functions',() => {
    it ('should make a transaction', async () => {
        const w = new Wallet()
        expect(w).toBeInstanceOf(Wallet)
        w.loadWallet('L5o1VbLNhELT6uCu8v7KdZpvVocHWnHBqaHe686ZkMkyszyU6D7n')
        //'1KUrv2Ns8SwNkLgVKrVbSHJmdXLpsEvaDf'
        const buildResult = await w.makeStreamableCashTx(Long.fromNumber(100))
        expect(buildResult.tx.txIns.length).toBe(1)
        w.logDetailsLastTx()
        // console.log(w.lastTx.toJSON())
        // console.log(nftx)
    })
})