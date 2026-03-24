import React from 'react';
import {
    Button,
  } from '@material-ui/core';

const ButtonOkCancelLayout = ({ handleClose, onChange }) => {
    return (
        <div className={'action-account1'}>
            <Button
                color="primary"
                variant="outlined"
                className={'margin-right-account'}
                onClick={handleClose}
            >
                Hủy
            </Button>
            <Button
                variant="contained"
                color="primary"
                className={'margin-right-account1 button-info-layout'}
                onClick={onChange}
            >
                Xác nhận
            </Button>
        </div>
    );
}

export default ButtonOkCancelLayout;
