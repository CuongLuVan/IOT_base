import React, { useState,Component } from 'react';
import PropTypes from 'prop-types';
import {
  MenuItem,
  Select,
} from '@material-ui/core';
import ManagerData from '../../actions/ManagerData.js'
import classNames from 'classnames';
import {exportColumeEdit,exportColumeAdd  } from '../../config/table/ManagerToView.js';


class SelectInTable extends Component {
    static propTypes = {
        onChange: PropTypes.func.isRequired,
        value:PropTypes.number.isRequired,
        table: PropTypes.string.isRequired,
    };
    constructor(props) {
        super(props);
        this.state = {
            infoTitle: {},
            data:[],
          
        }
    }

    componentDidMount(){
        this.setState({ infoTitle: exportColumeEdit(this.props.table)});
        ManagerData.getLstDataPromise(this.props.table)
        .then((data)=>{
            var dataInfo = JSON.parse(JSON.stringify(ManagerData.getTable(this.props.table)));
            var dataAdd ={};
            if(this.props.value==null){
                dataAdd[this.state.infoTitle.mainID]= 0;
                dataAdd[this.state.infoTitle.mainInfo.field]= "Lựa chọn";
                dataInfo.push(dataAdd);
            }
            else  if(this.props.value<1){
                dataAdd[this.state.infoTitle.mainID]= this.props.value;
                dataAdd[this.state.infoTitle.mainInfo.field]= "Lựa chọn";
                dataInfo.push(dataAdd);
            }
            this.setState({ data: dataInfo});
        });
    }
    handleRowSelection = (e) => {
        console.log("handleRowSelection",e);
        if(!!this.props.onChange){
            this.props.onChange(e);
            console.log("handleRowSelection",e);
        } 
    }

    render() {
        if(!!!this.state.infoTitle.mainID){
            return (
                <Select
                    labelId="role"
                    id="role"
                    className="enterprise-form1 permison-box"
                    label={"Dữ liệu"}
                    value={this.props.value}
                    >
                </Select>
            )
        }
        else
        {
            return (
                <Select
                    labelId="role"
                    id="role"
                    className="enterprise-form1 permison-box"
                    label={this.state.infoTitle.mainInfo.headerName}
                    value={this.props.value==null?0:this.props.value}
                    onChange={(event) => {
                        this.handleRowSelection(event);
                    }}
                    >
                    {this.state.data.map((vars) => (
                            <MenuItem value={vars[this.state.infoTitle.mainID]} 
                                key={vars[this.state.infoTitle.mainInfo.field]} >
                                {vars[this.state.infoTitle.mainInfo.field]}
                            </MenuItem>
                    ))}
                </Select>
            )
        }
        
    }
}

export default SelectInTable;
