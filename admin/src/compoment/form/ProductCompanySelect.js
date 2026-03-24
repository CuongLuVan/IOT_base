import React, { useState , useEffect} from 'react'; 
import PropTypes from 'prop-types';
import {
  MenuItem,
  Select,
} from '@material-ui/core';
import ManagerData from '../../actions/ManagerData.js'
import classNames from 'classnames';

import {exportColumeData,getLstInfoToSearch } from '../../config/table/ManagerToView.js';
import { fillterDataInfo ,fillterDataSearch } from '../../utils/commonUtil.js';

const ProductCompanySelect = ({ image_id,onChange }) => {
   const [lstCompany, setLstCompany] = useState([]);
   const [companySelect, setCompanySelect] = useState(0);
   const [lstImageProductOfCompany, setLstImageOfProduct] = useState([]);
   const [image_productSelect, setImageProductSelect] = useState(image_id);

   const [lstProduct, setLstProduct] = useState([]);
   const [productSelect, setProductSelect] = useState(0);

    useEffect(()  =>  {
        loadLstCompany(null);

        /*if(image_id!=0){
            ManagerData.httpPostData('users/get_image_product',{image_id:image_id,product_id:companySelect})
            .then((data)=>{
                setLstImageProductOfCompany([data]); 
                setLstCompany([data]);
                setLstProduct([data]);
            });
        }
        else
        {
            loadLstCompany(null);
        }*/
    }, [image_id]);

    const loadLstCompany = (stringTofind) => {
        var dataFind= null;
        if(stringTofind!=null){
            var lstInfoFind =  getLstInfoToSearch('company');
            dataFind =  fillterDataSearch("companyname",lstInfoFind,stringTofind);
        }
        ManagerData.getLstDataPromise('company',dataFind).then(()=>{
            setLstCompany(ManagerData.getTable("company"));
        });
    }

    const loadProductOfCompany = (stringTofind) => {
        ManagerData.httpPostData('users/get_all_product_of_company',{company_id:stringTofind})
        .then((data)=>{
            setLstProduct(data);
        });
    }
    const loadImageProductOfCompany = (stringTofind) => {
        ManagerData.httpPostData('users/get_all_image_of_product',{product_id:stringTofind})
        .then((data)=>{
            setLstImageOfProduct(data);
        });
    }
    const selectCompany = (id) => {
        setCompanySelect(id);
        loadProductOfCompany(id);
    }
    const selectProduct= (id) => {
        setProductSelect(id);
        loadImageProductOfCompany(id);
    }
    const selectImage= (id) => {
        setImageProductSelect(id);
        onChange(id,companySelect);
    }
    
    return (
        <div>

            Sản phẩm :
                <Select
                    labelId="role"
                    id="role"
                    className="enterprise-form1 permison-box"
                    label={"Công ty"}
                    value={companySelect}
                    onChange={(event) => {
                        console.log("selectCompany ..................",event);
                        selectCompany(event.target.value);
                    }}
                    >
                    {lstCompany.map((vars) => (
                            <MenuItem value={vars.company_id} key={vars.company_id} >
                                {vars.companyname}
                            </MenuItem>
                    ))}
                </Select>
                <Select
                    labelId="role"
                    id="role"
                    className="enterprise-form1 permison-box"
                    label={"Sản phẩm"}
                    value={productSelect}
                    onChange={(event) => {
                        selectProduct(event.target.value);
                    }}
                    >
                    {lstProduct.map((vars) => (
                            <MenuItem value={vars.product_id} key={vars.product_id} >
                                {vars.name}
                            </MenuItem>
                    ))}
                </Select>

                <Select
                    labelId="role"
                    id="role"
                    className="enterprise-form1 permison-box"
                    label={"Hình ảnh"}
                    value={image_productSelect}
                    onChange={(event) => {
                        selectImage(event.target.value);
                    }}
                    >
                    {lstImageProductOfCompany.map((vars) => (
                            <MenuItem value={vars.image_id} key={vars.image_id} >
                                {vars.name_image_detail}
                            </MenuItem>
                    ))}
                </Select>
        </div>
        
        
    );
}

export default ProductCompanySelect;
