import React, { useState } from 'react';
import MuiModal from '@material-ui/core/Modal';
import Backdrop from '@material-ui/core/Backdrop';
import Fade from '@material-ui/core/Fade';
import { Divider, Typography } from '@material-ui/core';

const Modal = ({ title, children, open, onClose, className,type_model=1 }) => {
  return (
    <MuiModal
      aria-labelledby="transition-modal-title"
      aria-describedby="transition-modal-description"
      className={'modal-modal1' + ' ' + className}
      open={open}
      onClose={onClose}
      closeAfterTransition
      BackdropComponent={Backdrop}
      BackdropProps={{
        timeout: 500,
      }}
    >
      <Fade in={open}>
        <div className={type_model==1?'paper-modal1':'paper-modal'+type_model}>
          <Typography variant="h5">{title}</Typography>
          <Divider />
          {children}
        </div>
      </Fade>
    </MuiModal>
  );
};

export default Modal;
