import React, { useState, useEffect } from 'react'
import { Switch } from '@material-ui/core'
import { StatusTypography } from './util/StatusTypography'
import { STORAGE_KEY } from '../../types/storage'

export default function StorageSwitch() {
    const [state, setState] = useState({
        checkedValue: localStorage.getItem(STORAGE_KEY.exportBalance)
      })

    function getValue() : boolean|undefined {
      // initial state needs to be a prop
      if (state.checkedValue === null) return false
      return state.checkedValue.toString() === "true"
    }

    const handleChange = (event:any) => {
      setState({ ...state, [event.target.name]: event.target.checked })
      localStorage.setItem(STORAGE_KEY.exportBalance, event.target.checked)
    }
    
    return (
      <div>
        <StatusTypography variant='subtitle1' align='center'>
          Export Balance {getValue() ? "ON":"OFF"}
          <Switch
          checked={getValue()}
          onChange={handleChange}
          name="checkedValue"
          inputProps={{ 'aria-label': 'primary checkbox' }}
          />
        </StatusTypography>
    </div>
    )
}