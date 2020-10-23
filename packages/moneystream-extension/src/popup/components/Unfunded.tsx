import React, { useState, useEffect } from 'react'
import { Grid, styled, Switch } from '@material-ui/core'
import { Colors } from '../../shared-theme/colors'
import { PopupProps } from '../types'
import { StatusButton } from './StatusButton'
import { StatusTypography } from './util/StatusTypography'
import { makeStyles } from '@material-ui/core/styles'
import { STORAGE_KEY } from '../../types/storage'
import FundingOptions from './FundingOptions'
import {WalletBalance} from './WalletBalance'

const footerString = 'No subscription nor membership required!'

const Muted = styled('div')({
  color: Colors.Grey500,
  fontSize: '12px',
  fontWeight: 600
})

const Button = styled(StatusButton)({
  paddingLeft: '10px',
  paddingRight: '10px',
  padingTop: '8px',
  padddingBottom: '8px',
  width: '130px'
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
    marginTop: theme.spacing(4),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  funding: {
    marginTop: theme.spacing(1),
  },
}))

export const Unfunded = (props: PopupProps) => {
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
    // showBalance()
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

  // payment was received or sent
  async function walletRefresh() {
    //TODO: publish wallet refresh event
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
          {`Your Address is ${wallet?.keyPair.toAddress().toString()}`}
        </StatusTypography>
        <div>
          <WalletBalance context={props.context} />
        </div>
        <div className={classes.funding}>
          <FundingOptions wallet={wallet} walletRefresh={walletRefresh}></FundingOptions>
        </div>
        <Grid container spacing={0}>
        <Grid container item xs={12} spacing={0} style={{marginTop:4,marginBottom:4}}>
          <Grid item xs={6} spacing={0} style={{marginTop:4,marginBottom:4}}>
            <Muted>
              <Button variant="outlined" onClick={showAddressSummary} text="Summary"></Button>
            </Muted>
          </Grid>
          <Grid item xs={6} spacing={0} style={{marginTop:4,marginBottom:4}}>
            <Muted>
              <Button variant="outlined" onClick={showUnspent} text="Unspent"></Button>
            </Muted>
          </Grid>
        </Grid>
        <Grid container item xs={12} spacing={0} style={{marginTop:4,marginBottom:4}}>
          <Grid item xs={6} spacing={0} style={{marginTop:4,marginBottom:4}}>
            <Muted>
            <Button variant="outlined" onClick={showHistory} text="History"></Button>
            </Muted>
          </Grid>
          <Grid item xs={6} spacing={0} style={{marginTop:4,marginBottom:4}}>
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
