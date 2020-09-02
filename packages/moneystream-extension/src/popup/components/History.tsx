import React from 'react'
import { PopupProps } from '../types'
import { makeStyles } from '@material-ui/core/styles'
import { Link } from '@material-ui/core'
import Switch from '@material-ui/core/Switch'

const useStyles = makeStyles((theme) => ({
    container: {
      textAlign: 'center'
    },
    address: {
      padding: '1rem',
      border: '1px solid #333',
      marginTop: theme.spacing(1),
    },
    paper: {
      marginTop: theme.spacing(8),
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    },
  }))
  
export const HistoryPage = (props: PopupProps) => {
    const [state, setState] = React.useState({
      checkedHistory: true
    })
    const {
      context: {
        moneystreamDomain,
        runtime: { tabOpener },
        wallet
      }
    } = props

    const classes = useStyles()

    const handleChange = (event:any) => {
      setState({ ...state, [event.target.name]: event.target.checked })
    }

    const onHistoryClick = tabOpener(`http://localhost:3013/`)

    return (
    <div>
        <div>
          <Link
            onClick={onHistoryClick}
          >View History in TXT</Link>
        </div>
        <div>
        <Switch
          checked={state.checkedHistory}
          onChange={handleChange}
          name="checkedHistory"
          inputProps={{ 'aria-label': 'primary checkbox' }}
        />
        </div>
    </div>
    )
}