import React, { useState } from 'react'
import Long from 'long'
import { Link } from 'react-router-dom'
import IconButton from '@material-ui/core/IconButton'
import SendIcon from '@material-ui/icons/Send'

import { PopupProps } from '../types'
import { IndexingService } from 'moneystream-wallet'

export const SendPage = (props: PopupProps) => {
    const [walletBalance, setWalletBalance] = useState(props.context.wallet?.balance)

    const {
        context: {
          moneystreamDomain,
          runtime: { tabOpener },
          wallet
        }
      } = props
    
  // payment was received or sent
  async function walletRefresh() {
    await wallet?.loadUnspent()
    await setWalletBalance(wallet?.balance)
    //TODO: update background wallet
  }

  async function walletSend() {
    await walletRefresh()
    //prompt for address
    const sats = (wallet?.balance || 0) - 500
    var address = prompt(`Send ${sats} to Address`, "")
    if (address) {
      const buildResult = await wallet?.makeSimpleSpend(Long.fromNumber(sats), wallet?.selectedUtxos, address)
      const api = new IndexingService()
      const broadcastResult = await api.broadcastRaw(buildResult.hex)
      alert(JSON.stringify(broadcastResult))
      await walletRefresh()
    }
  }

  return (
      <>
        <IconButton 
            onClick={walletSend} size="small"
            color="primary" aria-label="Send">
            <SendIcon />
        </IconButton>
      </>
  )
}