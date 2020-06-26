import React from 'react'
import { Grid, styled } from '@material-ui/core'

import { Colors } from '../../shared-theme/colors'
import { PopupProps } from '../types'

import { StatusButton } from './StatusButton'
import { StatusTypography } from './util/StatusTypography'

const titleString = 'Fund your wallet'
const subheading1 = 'To use MoneyStream you need a funded wallet.'
const footerString = 'No membership required!'

const Muted = styled('p')({
  color: Colors.Grey500,
  fontSize: '12px',
  fontWeight: 600
})

const Button = styled(StatusButton)({
  paddingLeft: '29px',
  paddingRight: '29px'
})

export const Unsubscribed = (props: PopupProps) => {
  const {
    context: {
      moneystreamDomain,
      runtime: { tabOpener }
    }
  } = props
  const onClick = tabOpener(moneystreamDomain + '/settings/payment')

  return (
    <Grid container justify='center' alignItems='center'>
      <div>
        <StatusTypography variant='h6' align='center'>
          {titleString}
        </StatusTypography>
        <StatusTypography variant='subtitle1' align='center'>
          {subheading1}
        </StatusTypography>
        <Button
          text='Fund&nbsp;Your&nbsp;Wallet'
          variant='contained'
          onClick={onClick}
        />
        <Muted>{footerString}</Muted>
      </div>
    </Grid>
  )
}
