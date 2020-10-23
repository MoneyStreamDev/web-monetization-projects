import React, {useState} from 'react'
import Long from 'long'
import IconButton from '@material-ui/core/IconButton'
import { Button } from '@material-ui/core'
import { IndexingService } from 'moneystream-wallet'
import { PopupProps } from '../types'
import { WalletBalance } from './WalletBalance'

export const SendWallet = (props: PopupProps) => {
    const [walletBalance, setWalletBalance] = useState(props.context.wallet?.balance)
    const [amount, setAmount] = useState(0)
    const [address, setAddress] = useState('')

    const {
        context: {
          moneystreamDomain,
          runtime: { tabOpener },
          wallet
        }
    } = props

    async function walletRefresh() {
        await wallet?.loadUnspent()
        await setWalletBalance(wallet?.balance)
        //TODO: update background wallet
    }
    
    async function walletSend(addr:string, amt:number) {
        if (!amt || amt ===0 || !addr) return
        // reduce amt by mining fee
        const buildResult = await wallet?.makeSimpleSpend(
            Long.fromNumber(amt-300), 
            wallet?.selectedUtxos, 
            addr
        )
        const api = new IndexingService()
        const broadcastResult = await api.broadcastRaw(buildResult.hex)
        alert(JSON.stringify(broadcastResult))
        await walletRefresh()
        // if sucess then clear the form
        if (broadcastResult && broadcastResult.toString().length === 64) {
            setAddress('')
            setAmount(0)
        }
    }

    const changeAddress = (event:any) => {
        console.log(event)
        setAddress(event.target.value)
    }

    const changeAmount = (event:any) => {
        console.log(event)
        setAmount(event.target.value)
    }
    const changeSendAll = (event:any) => {
        console.log(event)
        if (event.target.value) {
            setAmount(wallet?.balance||0)
        }
    }
    
    return (
        <div>
            <div>
                <WalletBalance context={props.context} />
            </div>
            <div>
                <input type="checkbox"
                onChange={changeSendAll}></input>
                <label>Send All?</label>
            </div>
            <div>
                <div>
                <label>Enter BSV address</label>
                </div>
                <input type="text"
                value={address}
                onChange={changeAddress}></input>
            </div>
            <div>
                <div>
                <label>Enter Amount</label>
                </div>
                <input type="number" value={amount}
                onChange={changeAmount}></input>
            </div>
            <div>
            <Button 
                onClick={() => walletSend(address,amount)} size="medium"
                color="primary" aria-label="Send">
                Send
            </Button>
            </div>
        </div>
    )
} 
