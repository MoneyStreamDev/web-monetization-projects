import { Wallet } from 'moneystream-wallet'
import * as Long from 'long'

describe('wallet functions',() => {
    it ('should make a transaction', async () => {
        const w = new Wallet()
        expect(w).toBeInstanceOf(Wallet)
        w.loadWallet('L5o1VbLNhELT6uCu8v7KdZpvVocHWnHBqaHe686ZkMkyszyU6D7n')
        const nftx = await w.makeAnyoneCanSpendTx(Long.fromNumber(100),'1KUrv2Ns8SwNkLgVKrVbSHJmdXLpsEvaDf')
        expect(w.lastTx.txIns.length).toBe(1)
    })
})