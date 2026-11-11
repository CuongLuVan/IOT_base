import React from 'react';
import {
    Button,
  } from '@material-ui/core';

// disabled: blocks "Xác nhận" while the request is running (optional).
const ButtonOkCancelLayout = ({ handleClose, onChange, disabled = false }) => {
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
                disabled={disabled}
                onClick={onChange}
            >
                Xác nhận
            </Button>
        </div>
    );
}

export default ButtonOkCancelLayout;
