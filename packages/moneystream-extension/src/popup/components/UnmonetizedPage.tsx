import React from 'react'
import { Grid } from '@material-ui/core'

import { PopupProps } from '../types'

import { Link } from './util/Link'
import { StatusTypography } from './util/StatusTypography'

export const UnmonetizedPage = (props: PopupProps) => {
  const {
    context: {
      runtime: { tabOpener }
    }
  } = props
  const onClick = tabOpener(`${props.context.moneystreamDomain}/learn-more`)
  return (
    <Grid container justify='center' alignItems='center'>
      <div>
        <StatusTypography variant='h6' align='center'>
          This website is not supported yet <img src='/res/tfwnowm.svg' />
        </StatusTypography>
        <StatusTypography variant='subtitle1' align='center'>
          <Link onClick={onClick} target='_blank'>
            {/* uses a non-breaking hyphen so it wraps correctly */}
            Learn how to make sites Web&#8209;Monetized.
          </Link>
        </StatusTypography>
      </div>
    </Grid>
  )
}
