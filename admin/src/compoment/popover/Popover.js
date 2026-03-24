import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import MuiPopover from '@material-ui/core/Popover';
import Button from '@material-ui/core/Button';

const useStyles = makeStyles((theme) => ({}));

export default function Popover({ trigger, children }) {
  const classes = useStyles();
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? 'simple-popover' : undefined;

  return (
    <div>
      <Button aria-describedby={id} variant="contained" onClick={handleClick}>
        {trigger}
      </Button>
      <MuiPopover
        className={classes.popover}
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        {children}
      </MuiPopover>
    </div>
  );
}
