import React from 'react'
import { Grid } from '@material-ui/core'

import { PopupProps } from '../types'

import { StatusTypography } from './util/StatusTypography'
import { StatusButton } from './StatusButton'

export const MoneystreamPopup = (props: PopupProps) => {
  const {
    context: {
      runtime: { tabOpener },
      moneystreamDomain
    }
  } = props
  const onClick = tabOpener(moneystreamDomain + '/explore')
  return (
    <Grid container justify='center' alignItems='center'>
      <div>
        <StatusTypography variant='subtitle2' align='center'>
          Welcome to MoneyStream
        </StatusTypography>
        <StatusTypography variant='subtitle1' align='center'>
          Check out our Discover page to explore Web-Monetized content.
        </StatusTypography>
        <StatusButton
          text='Discover now'
          variant='contained'
          onClick={onClick}
        />
      </div>
    </Grid>
  )
}
