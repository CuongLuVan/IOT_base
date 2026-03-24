import React, { Component } from 'react';
import TableDataView from '../../compoment/table/TableDataView.js'
const NomalTable =(props) =>{
  return (
      <TableDataView table ={props.resource} />
  )
};
export default NomalTable;
