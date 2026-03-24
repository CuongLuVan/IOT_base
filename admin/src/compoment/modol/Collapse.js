
import React, {useState, Component } from 'react';
import TableDataView from '../../compoment/table/TableDataView.js';
import classNames from 'classnames';
import {
  withStyles,
  Collapse as MuiCollapse,
  Input,
  Paper,
  Divider,
} from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';


const Collapse = ({ expanded, placeholder, children, title, setExpand }) => {
    return (
      <Paper
        variant="outlined"
        className={classNames(
          'collapse-dm-message',
          expanded && 'expanded-dm-message'
        )}
      >
        <div className={'collapse-title-dm-message'} onClick={setExpand}>
          <h3>{title}</h3>
          {expanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
        </div>
        <Divider />
        {expanded && placeholder}
        <MuiCollapse
          in={expanded}
          timeout="auto"
          unmountOnExit
          className={'collapse-content-dm-message'}
        >
          {children}
        </MuiCollapse>
      </Paper>
    );
  };
  
  export default Collapse;
