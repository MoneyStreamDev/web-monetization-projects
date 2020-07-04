import React from 'react'

import { PopupProps } from '../types'

import { UnmonetizedPage } from './UnmonetizedPage'
import { MonetizedPage } from './MonetizedPage'
import { MoneystreamViews } from './MoneystreamViews'

//user sees this when they have a funded wallet
export const PaidViews = (props: PopupProps) => {
  const context = props.context
  const { monetized, moneystreamSite } = context.store

  if (moneystreamSite && !monetized) {
    return <MoneystreamViews context={context} />
  } else if (monetized) {
    return <MonetizedPage context={context} />
  } else {
    return <UnmonetizedPage context={context} />
  }
}
