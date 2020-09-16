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

const marks = [
  {
    value: 0,
    label: 'Frugal',
  },
  {
    value: 50,
    label: 'Balanced',
  },
  {
    value: 100,
    label: 'Max Fun',
  },
]

function valuetext(value: number) {
  return `${value}`;
}

function valueLabelFormat(value: number) {
  return marks.findIndex(mark => mark.value === value) + 1;
}

export default function EnjoymentMeter() {
  const [state, setState] = React.useState({
    enjoyValue: localStorage.getItem(STORAGE_KEY.enjoy)
  })
  const classes = useStyles()

  const changed = (event:any, newValue:any) => {
    setState({ ...state, [event.target.name]: newValue })
    localStorage.setItem(STORAGE_KEY.enjoy, newValue)
  }

  function getEnjoy():number {
    if (state.enjoyValue === null) return 1
    return parseInt(state.enjoyValue.toString(),10)
  }

  return (
    <div className={classes.root}>
      <div className={classes.margin} />
      <Typography id="discrete-slider-restrict" gutterBottom>
        Choose your web experience
      </Typography>
      <Slider 
        name = "enjoyValue"
        defaultValue={getEnjoy()}
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