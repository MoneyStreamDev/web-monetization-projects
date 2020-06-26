import React from 'react'

import { PopupProps } from '../types'

import { MoneystreamPopup } from './MoneystreamPopup'
import { MoneystreamExplore } from './MoneystreamExplore'

export const MoneystreamViews = (props: PopupProps) => {
  const { moneystreamSite } = props.context.store
  const { pathname } = new URL(moneystreamSite)
  console.log('moneystream url=', moneystreamSite)
  if (pathname === '/explore') {
    return <MoneystreamExplore />
  } else {
    return <MoneystreamPopup {...props} />
  }
}
