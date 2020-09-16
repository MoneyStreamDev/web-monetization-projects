import React from 'react'
import { PopupProps } from '../types'
import { makeStyles, Theme } from '@material-ui/core/styles'
import Typography from '@material-ui/core/Typography';
import { Link } from '@material-ui/core'
import Switch from '@material-ui/core/Switch'
import { STORAGE_KEY } from '../../types/storage'

const useStyles = makeStyles((theme: Theme) => ({
    root: {
      width: 200,
    },
    margin: {
      height: theme.spacing(2),
      padding: '1rem',
    },
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
      checkedHistory: localStorage.getItem(STORAGE_KEY.history)
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
      localStorage.setItem(STORAGE_KEY.history, event.target.checked)
    }

    function getSetting() : boolean|undefined {
      if (state.checkedHistory === null) return undefined
      return state.checkedHistory.toString() === "true"
    }
  
    const onHistoryClick = tabOpener(`http://localhost:3013/`)

    return (
    <div className={classes.root}>
        <div className={classes.margin}/>
        <Typography id="discrete-slider-restrict" gutterBottom>
        Control your history
      </Typography>
        <div>
          <Link onClick={onHistoryClick}
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