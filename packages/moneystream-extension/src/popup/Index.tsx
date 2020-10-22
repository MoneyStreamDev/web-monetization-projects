import React, { useEffect, useState } from 'react'
import { styled } from '@material-ui/core'

import { ToPopupMessage } from '../types/commands'
import { Colors } from '../shared-theme/colors'

import { Container } from './components/util/Container'
import { AccountBar } from './components/AccountBar'
import { WebMonetizedBar } from './components/WebMonetizedBar'
import { Status } from './components/Status'
import { PayToUrlPage } from './components/PayToUrl'
import { HistoryPage } from './components/History'
import { SettingsPage } from './components/Settings'
import { PopupProps } from './types'
import { MemoryRouter, Switch, Route } from 'react-router-dom'
import { NavBar } from './components/NavBar'

const MoneystreamContainer = styled(Container)(({ theme }) => ({
  paddingRight: `${theme.spacing(4)}px`,
  paddingLeft: `${theme.spacing(4)}px`,
  paddingTop: `${theme.spacing(2)}px`,
  paddingBottom: `${theme.spacing(2)}px`,
  backgroundColor: Colors.Grey99
}))

//this affects the extension size on screen
const OuterDiv = styled('div')({
  minWidth: '308px',
  //  maxWidth: '308px',
  height: 'auto',
  minHeight: '600px'
})

export function Index(props: PopupProps) {
//export class Index extends React.Component<PopupProps> {
    const [_, setLastMonetizationProgress] = useState(Date.now())

  function syncStoreAndSetState() {
    props.context.store.sync()
    setLastMonetizationProgress(Date.now())
  }

  function bindMessageListener(): void {
    props.context.runtime.onMessageAddListener((message: ToPopupMessage) => {
      if (message.command === 'localStorageUpdate') {
        syncStoreAndSetState()
      }
      return false
    })
  }

  useEffect(bindMessageListener, [])

  const context = { ...props.context }
  //refresh = () => this.forceUpdate()

  return (
    <OuterDiv>
      <AccountBar context={context} />
      <MoneystreamContainer>
        {/* <Status context={context} /> */}
        <MemoryRouter>
          <Switch>
            <Route path='/status' component={() => <Status context={context}/>} />
            <Route path='/settings' component={() => <SettingsPage context={context}/>} />
            <Route path='/history' component={() => <HistoryPage context={context}/>} />
            <Route path='/paytourl' component={() => <PayToUrlPage context={context}/>} />
            {/* <Route path='/settings' component={Settings} /> */}
            <Route path='/' component={() => <Status context={context}/>} />
          </Switch>
          <WebMonetizedBar context={context} />
          <NavBar context={context} />
        </MemoryRouter>
      </MoneystreamContainer>
    </OuterDiv>
  )
}
