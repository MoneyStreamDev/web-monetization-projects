import React from 'react'
import { Grid, styled } from '@material-ui/core'

import { Colors } from '../../shared-theme/colors'
import { PopupProps } from '../types'

import { StatusButton } from './StatusButton'
import { StatusTypography } from './util/StatusTypography'
import { makeStyles } from '@material-ui/core/styles'
import MoneyButton from '@moneybutton/react-money-button'

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
  const {
    context: {
      moneystreamDomain,
      runtime: { tabOpener },
      wallet
    }
  } = props
  const onClick = tabOpener(moneystreamDomain + '/settings/payment')

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
            amount='0.02'
            currency='USD'
          />
        </div>
        <Muted>{`Balance ${wallet?.balance}`}</Muted>
        <input id="wif" name="wif" type="hidden" value={`${wallet?.toJSON().wif}`}></input>
        <Muted>
          <button onClick={wifToClipboard}>Copy Private Key</button>
        </Muted>
      </div>
    </Grid>
  )
}
