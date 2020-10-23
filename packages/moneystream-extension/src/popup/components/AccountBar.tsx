import React, { FormEvent, useState } from 'react'
import { Link, withRouter, MemoryRouter as Router } from 'react-router-dom'
// import PropTypes from 'prop-types'
import IconButton from '@material-ui/core/IconButton'
import Typography from '@material-ui/core/Typography'
import Toolbar from '@material-ui/core/Toolbar'
import More from '@material-ui/icons/MoreVert'
import Menu from '@material-ui/core/Menu'
import MenuItem from '@material-ui/core/MenuItem'
import ListItem from '@material-ui/core/ListItem'
import ListItemIcon from '@material-ui/core/ListItemIcon'
import ListItemText from '@material-ui/core/ListItemText'
import { styled, withStyles } from '@material-ui/core'
import {
  Home as HomeIcon,
  VpnKey as SignInIcon,
  Settings as SettingsIcon,
} from '@material-ui/icons'

import { Colors } from '../../shared-theme/colors'
import { PopupProps } from '../types'
import { getMonthAndDay, isXMASPeriod } from '../../util/seasons'

const Flex = styled('div')({
  flex: 1
})

const Muted = styled('p')({
  color: Colors.Grey500,
  fontSize: '14px'
})

const MoneystreamImg = styled('img')({
  marginRight: '4px'
})

const MoneystreamToolbar = styled(Toolbar)({
  backgroundColor: Colors.White,
  borderBottom: `0.5px solid ${Colors.Grey89}`,
  height: '52px'
})

const MoneystreamMenu = withStyles({
  paper: {
    minWidth: '113px'
  }
})(Menu)

type ClickEvent = FormEvent<HTMLElement>

export const MoneystreamLogoImg = () => {
  const [month, day] = getMonthAndDay()
  const isXMAS = isXMASPeriod(month, day)
  const logo = isXMAS
    ? '/res/MoneystreamLogoXMAS.svg'
    : '/res/MoneystreamLogo.svg'
  const logoWidth = isXMAS ? 28 : 32
  const style = isXMAS ? { marginTop: '-3px' } : {}
  return (
    <MoneystreamImg
      style={style}
      width={logoWidth}
      height={logoWidth}
      src={logo}
      alt=''
    />
  )
}

export const AccountBar = (props: PopupProps) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  const handleMenuClick = (event: ClickEvent) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = (event: ClickEvent) => {
    setAnchorEl(null)
  }
  const context = props.context
  const {
    moneystreamDomain,
    store: { loggedIn, user },
    runtime: { tabOpener }
  } = context

  const onExploreClick = tabOpener(`https://monstr.link`)
  const onAboutClick = tabOpener(`https://moneystreamdev.github.io/moneystream-project/`)
  const onPayToUrlClick = () => {
     //context.router.history.push('/paytourl')
  }

  return (
    <MoneystreamToolbar>
      <MoneystreamLogoImg />
      {loggedIn && user ? (
        <Typography variant='body1'>{user.fullName}</Typography>
      ) : (
        <Muted>Not Logged in</Muted>
      )}
      <Flex />
      <IconButton aria-label='Menu' onClick={handleMenuClick}>
        <More />
      </IconButton>

      <MoneystreamMenu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left'
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left'
        }}
        getContentAnchorEl={null}
      >

        <MenuItem
          divider
          dense
          component='a'
          onClick={onAboutClick}
          target='_blank'
        >
          <Typography variant='caption'>About</Typography>
        </MenuItem>

        <MenuItem
          dense
          component='a'
          onClick={onExploreClick}
          target='_blank'
        >
          <Typography variant='caption'>Explore</Typography>
        </MenuItem>

        {/* <MenuItem dense component='a' 
          onClick={onExploreClick} target='_blank'>
          <Typography variant='caption'>Discover</Typography>
        </MenuItem> */}

        {/* <MenuItem dense component='a' 
          onClick={onSettingsClick} target='_blank'>
          <Typography variant='caption'>Settings</Typography>
        </MenuItem> */}
      </MoneystreamMenu>
    </MoneystreamToolbar>
  )
}
