import React, { useState } from 'react';
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select
} from '@material-ui/core';
import ManagerData from '../../actions/ManagerData.js';
import { MODE_PAPER_LIBRARRY } from '../../config/config.js';

const PAPER_LIBRARY_SUBCATEGORY_IDS = {
  1: 1,
  2: 21,
  3: 31,
  4: 41
};

const sameId = (left, right) => String(left) === String(right);

const SelectGroupContentSub = ({ detailValue, onChange }) => {
  const groupContentSub = ManagerData.getTable('group_content_sub');
  const groupContent = ManagerData.getTable('group_content');
  const selectedSubcategory = groupContentSub.find((item) =>
    sameId(item.group_content_sub_id, detailValue)
  );
  const initialCategoryId = selectedSubcategory ? selectedSubcategory.group_content_id : 0;
  const [detailInfo, setDetailInfo] = useState({
    id: initialCategoryId,
    sub_id: detailValue
  });

  const availableSubcategories = groupContentSub.filter((item) =>
    sameId(item.group_content_id, detailInfo.id)
  );

  const onCategoryChange = (event) => {
    const categoryId = event.target.value;
    const subcategoryId = MODE_PAPER_LIBRARRY
      ? (PAPER_LIBRARY_SUBCATEGORY_IDS[categoryId] || 0)
      : 0;
    const nextDetail = { id: categoryId, sub_id: subcategoryId };
    setDetailInfo(nextDetail);

    // Paper Library has exactly one configured subcategory per top-level
    // category, so selecting the parent also updates the form value.
    if (MODE_PAPER_LIBRARRY) onChange({ target: { value: subcategoryId } });
  };

  const onSubcategoryChange = (event) => {
    const nextDetail = Object.assign({}, detailInfo, { sub_id: event.target.value });
    setDetailInfo(nextDetail);
    onChange(event);
  };

  return (
    <div className="dp-i">
      <FormControl variant="outlined" className="input-pages-register">
        <InputLabel className="register-label" shrink id="group-content-label">
          Chuyên mục (menu)
        </InputLabel>
        <Select
          className="margin-right-register"
          labelId="group-content-label"
          id="group-content"
          value={detailInfo.id}
          onChange={onCategoryChange}
        >
          {groupContent.map((item) => (
            <MenuItem value={item.group_content_id} key={item.group_content_id}>
              {item.group_content}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {!MODE_PAPER_LIBRARRY && (
        <FormControl variant="outlined" className="input-pages-register">
          <InputLabel className="register-label" shrink id="group-content-sub-label">
            Chuyên mục chi tiết
          </InputLabel>
          <Select
            className="margin-right-register"
            labelId="group-content-sub-label"
            id="group-content-sub"
            value={detailInfo.sub_id}
            onChange={onSubcategoryChange}
          >
            {availableSubcategories.map((item) => (
              <MenuItem value={item.group_content_sub_id} key={item.group_content_sub_id}>
                {item.group_content}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
    </div>
  );
};

export default SelectGroupContentSub;
