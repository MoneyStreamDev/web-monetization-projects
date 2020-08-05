import { Wallet, KeyPair, OutputCollection } from 'moneystream-wallet'
import * as Long from 'long'

const demo_wif = 'L5bxi2ef2R8LuTvQbGwkY9w6KJzpPckqRQMnjtD8D2EFqjGeJnSq'
const keyPair = new KeyPair().fromRandom()
const DUST_LIMIT = 546

// stream from a real wallet
describe('browse stream', () => {
    it ('should select utxos', async () => {
        const w = new Wallet()
        expect(w).toBeInstanceOf(Wallet)
        w.loadWallet(demo_wif)
        await w.loadUnspent()
        expect(w.balance).toBeGreaterThan(0)
        //w.selectExpandableInputs()
    })
    it ('should browse session', async () => {
        const w = new Wallet()
        expect(w).toBeInstanceOf(Wallet)
        w.loadWallet(demo_wif)
        await w.loadUnspent()
        expect(w.balance).toBeGreaterThan(0)
        const packetsize = 500
        const iterations = Math.floor(w.balance/packetsize)
        let utxos!: OutputCollection
        console.log(`streaming ${iterations} money packets`)
        for( let x = 1; x < iterations; x++) {
            const buildResult = await w.makeStreamableCashTx(
                Long.fromNumber(packetsize*x),
                null, //keyPair.toOutputScript(),
                true,
                utxos
            )
            utxos = buildResult.utxos
            w.logDetailsLastTx()
            expect(buildResult.tx.txIns.length).toBeGreaterThan(0)
            // wallet should add utxos and not leave any dust outputs
            expect (buildResult.tx.txOuts[0].valueBn.toNumber()).toBeGreaterThan(DUST_LIMIT)
            expect(w.getTxFund(buildResult.tx)).toBe(packetsize*x)
            console.log(buildResult.hex)
        }
    })
})