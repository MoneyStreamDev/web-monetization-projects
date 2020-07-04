import React, { useState, useEffect } from 'react'

//import { PopupProps } from '../types'

import { NoWallet } from './NoWallet'
import { Unfunded } from './Unfunded'
import { PaidViews } from './PaidViews'
import { Wallet } from 'moneystream-wallet'

export interface IUser {
  wallet: Wallet
}
export const Status =({context}:{context:any}) => {
    //const { validToken, user } = props.context.store
    //const validToken = false
    //TODO: add funding to menu
  return (
    <div>
    { !context.wallet && <NoWallet context={context} /> }
    { !context.wallet?.balance && <Unfunded context={context} /> }
    { context.wallet?.balance && <PaidViews context={context} /> }
    </div>
  )
}
