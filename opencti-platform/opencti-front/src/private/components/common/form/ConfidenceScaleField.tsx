import React from 'react';
import makeStyles from '@mui/styles/makeStyles';
import Slider from '@mui/material/Slider';

const useStyles = makeStyles(({
  container: {
    margin: '20px 0',
  },
  thumb: {
    background: 'white',
  },
  mark: {
    background: 'black',
  },
  rail: {
    background: 'linear-gradient(to right, red, orange, blue, green);',
  },
  track: {
    background: 'none',
    border: 'none',
  },
  valueLabel: {
    '&>*': {
      background: 'black',
    },
  },
}));

const marks = new Array(11).fill(1).map((_, i) => ({
  label: i * 10,
  value: i * 10,
}));

const ConfidenceScaleField = () => {
  const classes = useStyles();
  const onSliderChange = (e, b) => {
    console.log(e, b);
    e.preventDefault();
  };

  return (
    <div className={classes.container}>
      <Slider
        classes={{
          thumb: classes.thumb,
          rail: classes.rail,
          track: classes.track,
          valueLabel: classes.valueLabel,
          mark: classes.mark,
        }}
        defaultValue={[20, 40, 60, 80]}
        aria-labelledby="discrete-slider"
        valueLabelDisplay="auto"
        step={10}
        marks={marks}
        min={0}
        max={100}
        onChange={onSliderChange}
      />
    </div>
  );
};

export default ConfidenceScaleField;
