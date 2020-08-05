import React from 'react'
import Typography from '@material-ui/core/Typography'
import { styled } from '@material-ui/core'

import { Colors } from '../../shared-theme/colors'
import { PopupProps } from '../types'

const MoneystreamBar = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  borderTop: `0.5px solid ${Colors.Grey89}`,
  backgroundColor: Colors.White,
  height: '40px',
  textAlign: 'center'
})

const BarBadge = styled('img')({
  position: 'relative',
  top: '0.13em',
  marginRight: '4px'
})

export const WebMonetizedBar = (props: PopupProps) => {
  const { monetized, pending, error, adapted, moneystreamSite } = props.context.store
  if (moneystreamSite && !monetized) {
    return null
  } else {
    // TODO: adapted here should mean adaptable
    const contentOrSite = adapted ? 'content' : 'site'
    return (
      <MoneystreamBar>
        <Typography variant='caption'>
          { !monetized && !pending && !error ? (<BarBadge src='/res/nodollar.svg' width='13' height='14' />) : null }
          { monetized && !pending && !error ? (<BarBadge src='/res/dollar.svg' width='13' height='14' />) : null }
          { pending ? (<BarBadge src='/res/pending.svg' width='13' height='14' />) : null }
          { error ? (<BarBadge src='/res/error.svg' width='13' height='14' />) : null }
          {adapted && monetized
            ? ' Moneystream can donate to this channel'
            : ' This ' + contentOrSite + ' is'}
          {monetized ? '' : ' not'}
          {monetized && adapted ? '' : ' Web-Monetized'}
        </Typography>
      </MoneystreamBar>
    )
  }
}
