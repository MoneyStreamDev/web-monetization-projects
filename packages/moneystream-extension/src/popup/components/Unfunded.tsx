import React, { useState } from 'react'
import { Grid, styled } from '@material-ui/core'

import { Colors } from '../../shared-theme/colors'
import { PopupProps } from '../types'

import { StatusButton } from './StatusButton'
import { StatusTypography } from './util/StatusTypography'
import { makeStyles } from '@material-ui/core/styles'
import MoneyButton from '@moneybutton/react-money-button'
import Long from 'long'
import { IndexingService } from 'moneystream-wallet'

const titleString = 'MoneyStream is early Alpha!'
const subheading1 = 'Only fund using a few pennies.'
const footerString = 'No subscription nor membership required!'

const Muted = styled('p')({
  color: Colors.Grey500,
  fontSize: '12px',
  fontWeight: 600
})

const Button = styled(StatusButton)({
  paddingLeft: '29px',
  paddingRight: '29px'
})

const useStyles = makeStyles((theme) => ({
  container: {
    textAlign: 'center'
  },
  address: {
    padding: '1rem',
    border: '1px solid #333',
    marginTop: theme.spacing(1),
  },
  paper: {
    marginTop: theme.spacing(8),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  moneybutton: {
    width: '115px',
    marginTop: theme.spacing(1),
  },
}))

export const Unfunded = (props: PopupProps) => {
  const [walletBalance, setWalletBalance] = useState(props.context.wallet?.balance)
  const {
    context: {
      moneystreamDomain,
      runtime: { tabOpener },
      wallet
    }
  } = props
  const showAddressSummary = tabOpener(`https://whatsonchain.com/address/${wallet?.keyPair.toAddress().toString()}`)
  const showUnspent = tabOpener(`https://api.whatsonchain.com/v1/bsv/main/address/${wallet?.keyPair.toAddress().toString()}/unspent`)
  const showHistory = tabOpener(`https://api.whatsonchain.com/v1/bsv/main/address/${wallet?.keyPair.toAddress().toString()}/history`)

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
      //console.log(buildResult)
      const broadcastResult = await api.broadcastRaw(buildResult.hex)
      //console.log(broadcastResult)
      alert(JSON.stringify(broadcastResult))
      await walletRefresh()
    }
  }

  function wifToClipboard(/*e*/) {
    const elWif = document.getElementById("wif") as HTMLInputElement
    if (elWif) {
      elWif.type = 'text'
      elWif.select()
      document.execCommand('copy')
      elWif.type='hidden'
      alert('Your Private Key has been copied to your clipboard. Paste it into a safe place during the testing period.')
    }
  }

  function onPayment (payment:any) {
    const payDesc = `Your wallet was funded
    Amount: ${payment.amount} ${payment.currency}
    Satoshis: ${payment.satoshis}
    Status: ${payment.status}`
    alert(payDesc)
    walletRefresh()
    //TODO: update background wallet
    
  }

  const classes = useStyles()
  return (
    <Grid container justify='center' alignItems='center'>
      <div>
        <StatusTypography variant='h6' align='center'>
          {titleString}
        </StatusTypography>
        <StatusTypography variant='subtitle1' align='center'>
          {subheading1}
        </StatusTypography>
        <StatusTypography variant='subtitle1' align='center'>
          {`Your Address is ${wallet?.keyPair.toAddress().toString()}`}
        </StatusTypography>
        {/* <Button
          text='Fund&nbsp;Your&nbsp;Wallet'
          variant='contained'
          onClick={onClick}
        /> */}
        <div className={classes.moneybutton}>
          <MoneyButton
            editable={true}
            to={wallet?.keyPair.toAddress().toString()}
            amount='0.05'
            currency='USD'
            onPayment = {onPayment}
          />
        </div>
        <Muted>
          {`Balance ${walletBalance}`}&nbsp;
          <button onClick={walletRefresh}>refresh</button>
          &nbsp;
          <button onClick={walletSend}>send</button>
        </Muted>
        <Muted>
          <button onClick={showAddressSummary}>Summary</button>
        </Muted>
        <Muted>
          <button onClick={showUnspent}>Unspent Outputs</button>
        </Muted>
        <Muted>
          <button onClick={showHistory}>Tx History</button>
        </Muted>
        <input id="wif" name="wif" type="hidden" value={`${wallet?.toJSON().wif}`}></input>
        <Muted>
          <button onClick={wifToClipboard}>Copy Private Key</button>
        </Muted>
      </div>
    </Grid>
  )
}