import React from 'react';
import { makeStyles, Theme, createStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Slider from '@material-ui/core/Slider';
import { STORAGE_KEY } from '../../types/storage'

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      width: 200,
    },
    margin: {
      // height: theme.spacing(2),
      // padding: '1rem',
    },
  }),
)

const marks = [{
    value: 0,
    label: 'Satoshis',
  },{
    value: 50,
    label: 'USD',
  },{
    value: 100,
    label: 'Minutes',
  }]

function valuetext(value: number) {
  return `${value}`;
}

function valueLabelFormat(value: number) {
  return marks.findIndex(mark => mark.value === value) + 1
}

export default function UnitSelector() {
  const [state, setState] = React.useState({
    unitValue: localStorage.getItem(STORAGE_KEY.unitDisplay)
  })
  const classes = useStyles()

  const changed = (event:any, newValue:any) => {
    setState({ ...state, [event.target.name]: newValue })
    localStorage.setItem(STORAGE_KEY.unitDisplay, newValue)
  }

  function getValue():number {
    if (state.unitValue === null) return 1
    return parseInt(state.unitValue.toString(),10)
  }

  return (
    <div className={classes.root}>
      <div className={classes.margin} />
      <Typography id="discrete-slider-restrict" gutterBottom>
        Choose unit display
      </Typography>
      <Slider 
        name = "unitValue"
        defaultValue={getValue()}
        valueLabelFormat={valueLabelFormat}
        getAriaValueText={valuetext}
        aria-labelledby="discrete-slider-restrict"
        step={null}
        valueLabelDisplay="auto"
        marks={marks}
        onChangeCommitted={changed}
      />
    </div>
  )
}