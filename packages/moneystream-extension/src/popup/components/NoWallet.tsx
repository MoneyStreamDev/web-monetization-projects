import React from 'react'
import { Grid } from '@material-ui/core'

import { PopupProps } from '../types'

//import { Link } from './util/Link'
import { StatusTypography } from './util/StatusTypography'
import { StatusButton } from './StatusButton'

import { Wallet } from 'moneystream-wallet'
import WalletStore from '../../background/services/WalletStore'

const titleString = 'Welcome to MoneyStream'
const subheading1 =
  'MoneyStream pays the websites you love with a small stream of money.'
const footerString = "Your wallet is not set up yet"

// User directed here when there is no wallet
// Creates wallet for user
export const NoWallet = (props: PopupProps) => {
  const {
    context: { moneystreamDomain }
  } = props

  async function createWallet() {
    const store = new WalletStore()
    const currentWallet = await store.get()
    if (currentWallet) {
      alert(`A wallet already exits!`)
    } else {
      const wallet = new Wallet(store)
      wallet.loadWallet()
      const stored = await wallet.store(wallet.toJSON())
      // console.log(stored)
      alert(`created ${stored}`)
      if (props.refresh) props.refresh()
    }
  }

  return (
    <Grid container justify='center' alignItems='center'>
      <div>
        <StatusTypography variant='subtitle2' align='center'>
          {titleString}
        </StatusTypography>
        <StatusTypography variant='subtitle1' align='center'>
          {subheading1}
        </StatusTypography>
        <StatusButton
          //href={moneystreamDomain + '/login'}
          onClick={()=>{createWallet()}}
          text='Create Wallet'
          variant='contained'
        />
        <StatusTypography variant='subtitle1' align='inherit'>
          {footerString}{' '}
          {/* <Link href={moneystreamDomain + '/signup'} target='_blank'>
            Create Wallet
          </Link> */}
        </StatusTypography>
      </div>
    </Grid>
  )
}
