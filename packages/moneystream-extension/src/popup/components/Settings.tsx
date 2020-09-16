import React from 'react'
import { Grid } from '@material-ui/core'

import { PopupProps } from '../types'

import { StatusTypography } from './util/StatusTypography'
import EnjoymentMeter from './EnjoymentMeter'
import MaxSessionFunding from './MaxSessionFunding'
import { HistoryPage } from './History'
import UnitSelector from './UnitSelector'

export const SettingsPage = (props: PopupProps) => {
  const [state, setState] = React.useState({
    checkedCutOff: true
  })

  const context = props.context
  const {
    moneystreamDomain,
    store: { loggedIn, user },
    runtime: { tabOpener }
  } = context

  const onClick = tabOpener(`https://moneystreamdev.github.io/moneystream-project/`)
  const handleChange = (event:any) => {
    setState({ ...state, [event.target.name]: event.target.checked })
  }
  return (
    <Grid container justify='center' alignItems='center'>
      <div>
        <StatusTypography variant='h6' align='center'>
          Settings
        </StatusTypography>
        <EnjoymentMeter/>
        <div className="mb-20">
        <MaxSessionFunding/>
        </div>
        <HistoryPage context={context}/>
        <UnitSelector/>
      </div>
    </Grid>
  )
}
