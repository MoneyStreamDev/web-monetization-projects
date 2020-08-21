import React from 'react'
import { PopupProps } from '../types'
import { makeStyles } from '@material-ui/core/styles'
import MoneyButton from '@moneybutton/react-money-button'

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
  
export const PayToUrlPage = (props: PopupProps) => {
    const {
        context: {
          moneystreamDomain,
          runtime: { tabOpener },
          wallet
        }
      } = props

      function onPayment (payment:any) {
        const payDesc = `You donated
        Amount: ${payment.amount} ${payment.currency}
        Satoshis: ${payment.satoshis}
        Status: ${payment.status}`
        alert(payDesc)
        //walletRefresh()
        //TODO: update background wallet
      }

    const classes = useStyles()

    const monetizedPayTo = "todo@moneybutton.com"

    return (
    <div>
        <div>
        Donate to {monetizedPayTo}
        </div>
        <div className={classes.moneybutton}>
          <MoneyButton
            editable={true}
            to={monetizedPayTo}
            amount='0.05'
            currency='USD'
            onPayment = {onPayment}
          />
        </div>
    </div>
    )
}