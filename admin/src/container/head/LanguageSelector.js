import React from 'react';
import { FormControl, MenuItem, Select } from '@material-ui/core';
import { useLocale, useSetLocale } from 'react-admin';

const LanguageSelector = () => {
  const locale = useLocale();
  const setLocale = useSetLocale();

  return (
    <FormControl variant="outlined" size="small" style={{ minWidth: 112, marginRight: 16 }}>
      <Select
        value={locale}
        onChange={event => setLocale(event.target.value)}
        inputProps={{ 'aria-label': 'Language' }}
        style={{ color: 'inherit' }}
      >
        <MenuItem value="en">English</MenuItem>
        <MenuItem value="zh">中文</MenuItem>
        <MenuItem value="vi">Tiếng Việt</MenuItem>
      </Select>
    </FormControl>
  );
};

export default LanguageSelector;
