import React, { useState, useEffect } from 'react'
import { Grid, styled, Switch } from '@material-ui/core'

import { Colors } from '../../shared-theme/colors'
import { PopupProps } from '../types'

import { StatusButton } from './StatusButton'
import { StatusTypography } from './util/StatusTypography'
import { makeStyles } from '@material-ui/core/styles'
import { STORAGE_KEY } from '../../types/storage'
import MoneyButton from '@moneybutton/react-money-button'
import Long from 'long'
import { IndexingService } from 'moneystream-wallet'

const subheading1 = 'Only fund using a few pennies.'
const footerString = 'No subscription nor membership required!'

const Muted = styled('p')({
  color: Colors.Grey500,
  fontSize: '12px',
  fontWeight: 600
})

const Button = styled(StatusButton)({
  paddingLeft: '10px',
  paddingRight: '10px'
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

const exchange_url = `https://cash.bitcoinofthings.com/exchange`

export const Unfunded = (props: PopupProps) => {
  const [walletBalance, setWalletBalance] = useState(props.context.wallet?.balance)
  const [balanceUnits, setBalanceUnits] = useState('Satoshis')
  const [extensionName, setExtensionName] = useState('MS')
  const [extensionVersion, setExtensionVersion] = useState('v0.0.0')
  const [state, setState] = useState({
    checkedCutOff: localStorage.getItem(STORAGE_KEY.kill)
  })
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

  useEffect(() => {
    getInfo()
    showBalance()
  })

  function getInfo() {
    chrome.runtime.sendMessage(
      {command: "info"}, 
      response => {
        if (!chrome.runtime.lastError) {
          console.log(response)
            setExtensionName(response?.name)
            setExtensionVersion(response?.version)
        }
      })
  }

  function elapsed(from: Date) {
    const time = new Date()
    const timeElapsed = time.getTime() - from.getTime()
    const secondsElapsed = timeElapsed / 1000
    return secondsElapsed
  }

  async function getExchange() {
    let exchangeValue = localStorage.getItem(STORAGE_KEY.exchangeRate) || ''
    let exchangeUpdate = localStorage.getItem(STORAGE_KEY.exchangeUpdate) || ''
    if (!exchangeValue) {
        const response = await fetch(exchange_url)
        const exchange = await response.json()
        exchangeValue = exchange.data?.rate || ''
        exchangeUpdate = new Date().toUTCString()
        localStorage.setItem(STORAGE_KEY.exchangeRate, exchangeValue)
        localStorage.setItem(STORAGE_KEY.exchangeUpdate, exchangeUpdate)
    }
    const elapsedSeconds = elapsed(new Date(exchangeUpdate))
    if (elapsedSeconds > 60 * 30) {
      const response = await fetch(exchange_url)
      const exchange = await response.json()
      exchangeValue = exchange.data?.rate || ''
      exchangeUpdate = new Date().toUTCString()
      localStorage.setItem(STORAGE_KEY.exchangeRate, exchangeValue)
      localStorage.setItem(STORAGE_KEY.exchangeUpdate, exchangeUpdate)
    }
    return Number(exchangeValue)
  }

  async function showBalance() {
    let balance = wallet?.balance
    const unitsValue = localStorage.getItem(STORAGE_KEY.unitDisplay)
    let units = 'Satoshis'
    if (unitsValue) {
      const unitsNumber = Number(unitsValue)
      if (unitsNumber === 50) {
        //TODO: get exchange
        const exchangeNumber = await getExchange()
        const SAT_PER_CENT = 1e8/(exchangeNumber*100)
        balance = Math.floor((balance || 0) / SAT_PER_CENT *100) / 10000
        units = 'USD'
      }
      if (unitsNumber === 100) {
        const enjoyValue = localStorage.getItem(STORAGE_KEY.enjoy) || 0
        const enjoyNumber = Number(enjoyValue)
        let enjoyRate = 20
        if (enjoyNumber === 50) enjoyRate = 40
        if (enjoyNumber === 100) enjoyRate = 60
        balance = Math.floor((balance || 0) / enjoyRate / 60)
        units = 'Minutes'
      }
    }
    await setWalletBalance(balance)
    await setBalanceUnits(units)
    //TODO: update background wallet

  }

  // payment was received or sent
  async function walletRefresh() {
    await wallet?.loadUnspent()
    showBalance()
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

  const handleChange = (event:any) => {
    setState({ ...state, [event.target.name]: event.target.checked })
    localStorage.setItem(STORAGE_KEY.kill, event.target.checked)
  }

  function getCutOff() : boolean|undefined {
    // interpret initial state as monetization on
    if (state.checkedCutOff === null) return true
    return state.checkedCutOff.toString() === "true"
  }

  const classes = useStyles()
  return (
    <Grid spacing={1} container justify='center' alignItems='center'>
      <div>
        <StatusTypography variant='subtitle1' align='center'>
          Monetization {getCutOff() ? "ON":"OFF"}
          <Switch
          checked={getCutOff()}
          onChange={handleChange}
          name="checkedCutOff"
          inputProps={{ 'aria-label': 'primary checkbox' }}
          />
        </StatusTypography>
        <StatusTypography variant='h6' align='center'>
          {`${extensionName} ${extensionVersion} Alpha`}
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
        <StatusTypography variant='subtitle1'>
          {`${walletBalance} ${balanceUnits}`}&nbsp;
          <Button variant="text" onClick={walletRefresh} text="refresh"></Button>
        </StatusTypography>

        <Grid container spacing={0}>
        <Grid container item xs={12} spacing={0}>
          <Grid item xs={6} spacing={0}>
            <Muted>
              <Button variant="outlined" onClick={showAddressSummary} text="Summary"></Button>
            </Muted>
          </Grid>
          <Grid item xs={6} spacing={0}>
            <Muted>
              <Button variant="outlined" onClick={showUnspent} text="Unspent"></Button>
            </Muted>
          </Grid>
        </Grid>
        <Grid container item xs={12} spacing={0}>
          <Grid item xs={6} spacing={0}>
            <Muted>
            <Button variant="outlined" onClick={showHistory} text="History"></Button>
            </Muted>
          </Grid>
          <Grid item xs={6} spacing={0}>
            <input id="wif" name="wif" type="hidden" value={`${wallet?.toJSON().wif}`}></input>
            <Muted>
              <Button variant="outlined" onClick={wifToClipboard} text="Copy&nbsp;Key"></Button>
            </Muted>
          </Grid>
        </Grid>
      </Grid>

      </div>
    </Grid>
  )
}
