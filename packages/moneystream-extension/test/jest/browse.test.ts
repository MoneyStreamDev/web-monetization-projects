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
        console.log(`streaming ${iterations} money packets. ${utxos?.count} utxos`)
        let lastBuild = null
        for( let x = 1; x < iterations; x++) {
            const buildResult = await w.makeStreamableCashTx(
                Long.fromNumber(packetsize*x),
                null, //keyPair.toOutputScript(),
                true,
                utxos
            )
            lastBuild = buildResult
            utxos = buildResult.utxos
            w.logDetailsLastTx()
            expect(buildResult.tx.txIns.length).toBeGreaterThan(0)
            // wallet should create multiple inputs and leave an output
            // TODO: wallet does not yet spend all of UTXOS
            expect (buildResult.tx.txOuts[0].valueBn.toNumber()).toBeGreaterThan(0)
            expect(w.getTxFund(buildResult.tx)).toBe(packetsize*x)
            //console.log(buildResult.hex)
        }
        // there should be enough utxos for one or two more spends
        if (lastBuild) {
            const lastChange = lastBuild.tx.txOuts[0].valueBn.toNumber()
            expect(lastChange).toBeGreaterThan(DUST_LIMIT)
            expect(lastChange).toBeLessThan(DUST_LIMIT*2)
            // fully spend the last utxo
            const lastFund = w.getTxFund(lastBuild.tx)
            const buildResult = await w.makeStreamableCashTx(
                Long.fromNumber(lastFund + lastChange),
                null,
                true,
                utxos
            )
            w.logDetailsLastTx()
            // should be no change outputs, all inputs signed NONE
            expect(buildResult.tx.txOuts.length).toBe(0)
            expect(w.getTxFund(buildResult.tx)).toBe(lastFund + lastChange)
        }
    })
})