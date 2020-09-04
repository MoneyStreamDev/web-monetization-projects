import React from 'react'
import { PopupProps } from '../types'
import { makeStyles } from '@material-ui/core/styles'
import Typography from '@material-ui/core/Typography';
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

const historyKey = 'monetizationHistory'

export const HistoryPage = (props: PopupProps) => {
    const [state, setState] = React.useState({
      checkedHistory: localStorage.getItem(historyKey)
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
      localStorage.setItem(historyKey, event.target.checked)
    }

    function getSetting() : boolean|undefined {
      if (state.checkedHistory === null) return undefined
      return state.checkedHistory.toString() === "true"
    }
  
    const onHistoryClick = tabOpener(`http://localhost:3013/`)

    return (
    <div>
      <Typography id="discrete-slider-restrict" gutterBottom>
        Control your browser history
      </Typography>
        <div>
          <Link
            onClick={onHistoryClick}
          >View History in TXT</Link>
        </div>
        <div>
          History {getSetting() ? "ON":"OFF"}
        <Switch
          checked={getSetting()}
          onChange={handleChange}
          name="checkedHistory"
          inputProps={{ 'aria-label': 'primary checkbox' }}
        />
        </div>
    </div>
    )
}