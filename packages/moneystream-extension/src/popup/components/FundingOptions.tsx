import * as React from 'react'
import { makeStyles } from '@material-ui/core/styles'
import Accordion from '@material-ui/core/Accordion'
import AccordionSummary from '@material-ui/core/AccordionSummary'
import AccordionDetails from '@material-ui/core/AccordionDetails'
import { StatusTypography } from './util/StatusTypography'
import Typography from '@material-ui/core/Typography'
import ExpandMoreIcon from '@material-ui/icons/ExpandMore'
import MoneyButton from '@moneybutton/react-money-button'
import { QRCodeImport } from './QRCode'
import { RelayXButton } from './RelayXButton'
import { UnspentOutput } from 'moneystream-wallet'

const subheading1 = 'Only fund using a few pennies'

const useStyles = makeStyles((theme:any) => ({
  root: {
    width: '100%',
  },
  heading: {
    fontSize: theme.typography.pxToRem(15),
    fontWeight: theme.typography.fontWeightRegular,
  },
}));

export default function FundingOptions(props:any) {
  const classes = useStyles()

  // TODO: attempt add payment to wallet because WOC does not have it yet
  function addPaymentToWallet(payment: any) {
    try {
      if (payment && props.wallet) {
        // TODO: makes assumptions, buggy
        // could get this info from rawhex?
        const unspent = new UnspentOutput(
          payment.satoshis,
          props.wallet.keyPair.toOutputScript(),
          // Buffer.from(utxo0.tx_hash,'hex').reverse().toString('hex')
          payment.txid, 
          0 // assumption
        )
        props.wallet.selectedUtxos.add(unspent)
      }
    } catch (err) {
      console.error(`FundingOptions`, err)
    }
  }

  function onPayment (payment:any) {
    addPaymentToWallet(payment)
    props.walletRefresh({action:'funding', details:payment})
    const payDesc = `Your wallet was funded
    Amount: ${payment.amount} ${payment.currency}
    Satoshis: ${payment.satoshis}
    Status: ${payment.status}`
    //TODO: make a nice ui modal
    alert(payDesc)
  }

  function formatUrlHandcash() {
    const qrstring = `bitcoin:${props.wallet?.keyPair.toAddress().toString()}?sv&amount=${30000/1e8}&label=To+your+MoneyStream&avatarUrl=https://moneystreamdev.github.io/moneystream-project/img/logo.png`
    return qrstring
  }

  function formatUrlDotWallet() {
    const qrstring = `${props.wallet?.keyPair.toAddress().toString()}`
    return qrstring
  }

  function onChange() { 
    /* how to update balance when hc and dotwallet funded? */ 
  }

  return (
    <div className={classes.root}>
      <Accordion onChange={onChange}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1a-content"
        >
          <Typography className={classes.heading}>Fund from MoneyButton</Typography>
        </AccordionSummary>
        <AccordionDetails style={{"display":"block"}}>
          <div>
            <StatusTypography variant='subtitle1' align='center'>
              {subheading1}
            </StatusTypography>
          </div>
          <div>
            <MoneyButton
                editable={true}
                to={props.wallet?.keyPair.toAddress().toString()}
                amount='0.05'
                currency='USD'
                onPayment = {onPayment}
              />
            </div>
        </AccordionDetails>
      </Accordion>

      <Accordion onChange={onChange}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel2a-content"
        >
        <Typography className={classes.heading}>Fund from HandCash</Typography>
        </AccordionSummary>
        <AccordionDetails>
            <QRCodeImport address={formatUrlHandcash()}></QRCodeImport>
        </AccordionDetails>
      </Accordion>

      <Accordion onChange={onChange}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel2a-content"
        >
        <Typography className={classes.heading}>Fund from RelayX</Typography>
        </AccordionSummary>
        <AccordionDetails style={{"display":"block"}}>
          <div>
          <StatusTypography variant='subtitle1' align='center'>
            {subheading1}
          </StatusTypography>
          </div>
          <div>
          <RelayXButton 
            to={props.wallet?.keyPair.toAddress().toString()}
            onPayment = {onPayment}
          >
          </RelayXButton>
          </div>
        </AccordionDetails>
      </Accordion>

      <Accordion onChange={onChange}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel2a-content"
        >
        <Typography className={classes.heading}>Fund from DotWallet</Typography>
        </AccordionSummary>
        <AccordionDetails>
            <QRCodeImport address={formatUrlDotWallet()}></QRCodeImport>
        </AccordionDetails>
      </Accordion>

    </div>
  )
}