import React, {useState, useEffect} from 'react'
import { styled } from '@material-ui/core'
import { PopupProps } from '../types'
import { StatusTypography } from './util/StatusTypography'
import { StatusButton } from './StatusButton'
import { STORAGE_KEY } from '../../types/storage'

const exchange_url = `https://cash.bitcoinofthings.com/exchange`

const Button = styled(StatusButton)({
    paddingLeft: '10px',
    paddingRight: '10px',
    padingTop: '3px',
    padddingBottom: '3px'
  })
  
export const WalletBalance = (props: PopupProps & { triggered?: number }) => {
    const [balanceUnits, setBalanceUnits] = useState('Satoshis')
    const [walletBalance, setWalletBalance] = useState(props.context.wallet?.balance)
    const {
        context: {
          moneystreamDomain,
          runtime: { tabOpener },
          wallet
        }
    } = props
    
    useEffect(() => {
      showBalance()
    })

    function raiseUpdateEvent(details: any) {
      props.context.runtime.sendMessage(
        {command: 'update', 
        from: `WalletBalance`,
        data:details}
      )
    }
    
    function elapsed(from: Date) {
      const time = new Date()
      const timeElapsed = time.getTime() - from.getTime()
      const secondsElapsed = timeElapsed / 1000
      return secondsElapsed
    }
        
    async function showBalance() {
      let balance = wallet?.balance
      const unitsValue = localStorage.getItem(STORAGE_KEY.unitDisplay)
      let units = 'Satoshis'
      let exchangeNumber = null
      if (unitsValue) {
        const unitsNumber = Number(unitsValue)
        if (unitsNumber === 50) {
          exchangeNumber = await getExchange()
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
      // ensures page get updated when user clicks refresh
      raiseUpdateEvent({
        balance: balance,
        units: units,
        exchange: exchangeNumber
      })
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
    
  // user click refresh button
  async function walletRefresh() {
    await wallet?.loadUnspent()
    showBalance()
  }

  return (
    <StatusTypography variant='subtitle1'>
      {`${walletBalance} ${balanceUnits}`}&nbsp;
      <Button variant="text" onClick={walletRefresh} text="refresh"></Button>
    </StatusTypography>
  )    
}