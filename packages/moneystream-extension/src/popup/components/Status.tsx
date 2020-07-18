import React, { useState, useEffect } from 'react'
import { PopupProps } from '../types'

import { NoWallet } from './NoWallet'
import { Unfunded } from './Unfunded'
// import { PaidViews } from './PaidViews'
import { Wallet } from 'moneystream-wallet'

export interface IUser {
  wallet: Wallet
}

export class Status extends React.Component<PopupProps> {
//export const Status =({context}:{context:any}) => {
    //const { validToken, user } = props.context.store
    //const validToken = false
    //TODO: add routing, for now always show wallet page
  refresh = () => this.forceUpdate()

  render () {
    //const { context } = this.props
    const context = this.props.context
    return (
    <div>
    { !context.wallet && <NoWallet context={context} refresh = {this.refresh} /> }
    { context.wallet && <Unfunded context={context} /> }
    {/* { context.wallet?.balance && <PaidViews context={context} /> } */}
    </div>
  )
    }
}
