
import React, { useState } from 'react';
import {
    FormControl,
    Button,
    InputLabel,
    MenuItem,
    Select,
    TextField
  } from '@material-ui/core';
import ManagerData from '../../actions/ManagerData.js'

const SearchPageData =({ id_select,sub_id_select ,changeID})=> {
        var pagesContent =ManagerData.getTable("gro_pages_content");
        if(sub_id_select!=0) pagesContent= pagesContent.filter(o=>o.group_content_sub_id==sub_id_select);
        const [state, setState] = useState(id_select);
        const uploadMainID=(event)=>{
            console.log("Content: " + event.target.value);
            setState(event.target.value);
            changeID(event.target.value);
        }
        return (
            <FormControl variant="outlined" className={'input-pages-register'}>
                <InputLabel className={'register-label'} shrink id="demo-simple-select-menu-search">
                    Chuyên mục
                </InputLabel>
                <Select
                    className={'margin-right-register'}
                    labelId="demo-simple-select-menu-search"
                    id="status"
                    value={state}
                    onChange={(event) => {
                        uploadMainID(event,"id");
                    // setRole(event.target.value);
                    }}
                >
                    <MenuItem value={0} key={0}>
                        Chuyên mục đơn lẻ
                    </MenuItem>
                    <MenuItem value={-1} key={-1}>
                        Chuyên mục chính
                    </MenuItem>
                    {pagesContent ? pagesContent.map((vars) => (
                        <MenuItem value={vars.pages_content_id} key={vars.pages_content_id}>
                        {vars.title}
                        </MenuItem>
                    )):""}
                </Select>
            </FormControl>
        );
}

export default SearchPageData;

