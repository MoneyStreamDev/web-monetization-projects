import * as React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import Typography from '@material-ui/core/Typography';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import MoneyButton from '@moneybutton/react-money-button'
import {QRCodeImport} from './QRCode'

const useStyles = makeStyles((theme) => ({
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

  function onPayment (payment:any) {
    const payDesc = `Your wallet was funded
    Amount: ${payment.amount} ${payment.currency}
    Satoshis: ${payment.satoshis}
    Status: ${payment.status}`
    alert(payDesc)
    props.walletRefresh()
    //TODO: update background wallet
  }

  function formatUrl() {
    const qrstring = `bitcoin:${props.wallet?.keyPair.toAddress().toString()}?sv&amount=${30000/1e8}&label=To+your+MoneyStream&avatarUrl=https://moneystreamdev.github.io/moneystream-project/img/logo.png`
    console.log(qrstring)
    return qrstring
  }

  function onChange() {
    props.walletRefresh()
  }

  return (
    <div className={classes.root}>
      <Accordion onChange={onChange}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1a-content"
          id="panel1a-header"
        >
          <Typography className={classes.heading}>Fund from MoneyButton</Typography>
        </AccordionSummary>
        <AccordionDetails>
        <MoneyButton
            editable={true}
            to={props.wallet?.keyPair.toAddress().toString()}
            amount='0.05'
            currency='USD'
            onPayment = {onPayment}
          />
        </AccordionDetails>
      </Accordion>
      <Accordion onChange={onChange}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel2a-content"
          id="panel2a-header"
        >
        <Typography className={classes.heading}>Fund from HandCash</Typography>
        </AccordionSummary>
        <AccordionDetails>
            <QRCodeImport address={formatUrl()}></QRCodeImport>
        </AccordionDetails>
      </Accordion>

    </div>
  )
}