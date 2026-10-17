import React from 'react';
import { MenuItem, Select } from '@material-ui/core';

const LANGUAGE_OPTIONS = [
  { id: 0, name: 'Tiếng Việt' },
  { id: 2, name: 'English' },
  { id: 3, name: '中文' }
];

const SelectLanggue = ({ typePermision, onChange }) => (
  <Select
    labelId="language"
    id="language"
    className="enterprise-form1 permison-box"
    label="Ngôn ngữ"
    value={typePermision}
    onChange={onChange}
  >
    {LANGUAGE_OPTIONS.map((language) => (
      <MenuItem value={language.id} key={language.id}>
        {language.name}
      </MenuItem>
    ))}
  </Select>
);

export default SelectLanggue;
