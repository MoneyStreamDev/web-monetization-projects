import React from 'react'
import { makeStyles, Theme, createStyles } from '@material-ui/core/styles'
import Typography from '@material-ui/core/Typography'
import TextField from '@material-ui/core/TextField'

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      width: 200,
    },
    margin: {
      height: theme.spacing(2),
      padding: '1rem',
    },
  }),
)

const maxsessionfundingKey = 'maxsessionfunding'

export default function MaxSessionFunding() {
  const [state, setState] = React.useState({
    maxsessionfundingValue: localStorage.getItem(maxsessionfundingKey)
  })
  const classes = useStyles()

  function getMax():number {
    if (state.maxsessionfundingValue === null) return 20000
    return parseInt(state.maxsessionfundingValue.toString(),10)
  }

  const handleChange = (event:any) => {
    console.log(event)
    setState({ ...state, [event.target.name]: event.target.value })
    localStorage.setItem(maxsessionfundingKey, event.target.value)
  }

  return (
    <div className={classes.root}>
      <div className={classes.margin} />
      <Typography id="discrete-slider-restrict" gutterBottom>
        Max Session Spend (Satoshis)
      </Typography>
      <TextField 
        id="maxValue" 
        type="number"
        defaultValue={getMax()}
        label="Max Spend (Satoshis)" 
        onChange={handleChange}
      />
      {/* <Slider 
        name = "enjoyValue"
        defaultValue={getMax()}
        valueLabelFormat={valueLabelFormat}
        getAriaValueText={valuetext}
        aria-labelledby="discrete-slider-restrict"
        step={null}
        valueLabelDisplay="auto"
        marks={marks}
        onChangeCommitted={changed}
      /> */}
    </div>
  )
}