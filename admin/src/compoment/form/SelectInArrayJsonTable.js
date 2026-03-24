import React, { useState,Component } from 'react';
import PropTypes from 'prop-types';
import {
  MenuItem,
  Select,
} from '@material-ui/core';



class SelectInArrayJsonTable extends Component {
    static propTypes = {
        onChange: PropTypes.func.isRequired,
        value:PropTypes.number.isRequired,
        dataInfo: PropTypes.array.isRequired,
        dataIDMain: PropTypes.string.isRequired,
        dataLabelMain: PropTypes.string.isRequired,
        label:PropTypes.string.isRequired,
        fatherId:PropTypes.string.isRequired,
        fatherIdMain:PropTypes.string.isRequired,


    };
    constructor(props) {
        super(props);
        this.state = {data:[] };
    }
    checkValueSetting=()=>{
        if(this.props.fatherId>0){
            this.setState({ data: this.props.dataInfo.filter((product) => product[this.props.fatherIdMain] == this.props.fatherId)});
        } else if(this.props.fatherId==-1){
            this.setState({ data: this.props.dataInfo});
        }
    }
    
    componentDidMount() {
        this.checkValueSetting();
    }

    componentDidUpdate(prevProps) {
        if (this.props.fatherId !== prevProps.fatherId) {
            this.checkValueSetting();
        }
      }

    handleRowSelection = (e) => {
        console.log("handleRowSelection",e);
        if(!!this.props.onChange){
            this.props.onChange(e);
            console.log("handleRowSelection",e);
        } 
    }

    render() {
        return (
                <Select
                    labelId="role"
                    id="role"
                    className="enterprise-form1 permison-box"
                    label={this.state.label}
                    value={this.props.value}
                    onChange={(event) => {
                        this.handleRowSelection(event);
                    }}
                    >
                    {this.state.data.map((vars) => (
                            <MenuItem value={vars[this.props.dataIDMain]}  key={vars[this.props.dataIDMain]} >
                                {vars[this.props.dataLabelMain]}
                            </MenuItem>
                    ))}
                </Select>
        );
        
    }
}

export default SelectInArrayJsonTable;
