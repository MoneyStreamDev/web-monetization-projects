import React from 'react'
import { PopupProps } from '../types'
import { Link } from 'react-router-dom'
import { makeStyles } from '@material-ui/core/styles'
import IconButton from '@material-ui/core/IconButton'
import HomeIcon from '@material-ui/icons/AccountBalanceWallet'
import HistoryIcon from '@material-ui/icons/History'
import SettingsIcon from '@material-ui/icons/Settings'
import SendIcon from '@material-ui/icons/Send'
import AttachMoneyIcon from '@material-ui/icons/AttachMoney'
// import { SendPage } from './Send'

const useStyles = makeStyles((theme) => ({
  root: {
    '& > *': {
      margin: theme.spacing(1),
    },
  },
}))

  export const NavBar = (props: PopupProps) => {

    const classes = useStyles()
    //const context = { ...props.context }

    return (
      <div className={classes.root}>
        <Link to='/'>
          <IconButton aria-label="Home" 
            color="primary" size="small">
            <HomeIcon />
          </IconButton>
        </Link>

        <Link to='/settings'>
          <IconButton aria-label="Settings" 
          color="primary" size="small">
            <SettingsIcon />
          </IconButton>
        </Link>
        {/* <Link to='/history'>
          <IconButton aria-label="History"  color="primary">
            <HistoryIcon />
          </IconButton>
        </Link> */}

        {/* <SendPage context={context}></SendPage> */}
        <Link to='/sendwallet'>
          <IconButton aria-label="Settings" 
          color="primary" size="small">
              <SendIcon />
          </IconButton>
        </Link>

        {/* <Link to='/paytourl'>
          <IconButton color="primary" aria-label="Payment">
            <AttachMoneyIcon />
          </IconButton>
        </Link> */}
      </div>
    )

  }
