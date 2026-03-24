import React, {useState,useEffect } from 'react';
import classNames from 'classnames';
import {
  Button,
} from '@material-ui/core';

const AcessButton = ({id,name,onClick}) => {
    if(id==0){
        return (
            <Button variant="contained" 
                onClick={onClick}
                disableElevation color="primary">
                {"Tạo "+ name}
            </Button> 
        );

    }
    else
    {
        return (
            <Button variant="contained" 
                onClick={onClick}
                disableElevation color="primary">
                {"Sửa" + name}
            </Button> 
        );
    }



}
export default AcessButton;




