const express = require('express');
const router = express.Router();
const knex = require('../cron/config/knex.js')
const  { returnOK, returnFalse } = require('../utils/returnResponse.js');
const DataDelete = require('../cron/models/dataDelete.js')
const squel = require('squel');
const { now } = require('mongoose');
router.route('/delete_oauthen2_tables').put(async (req, res) => {
  let mysql = squel.update().table('oauthen2customer')
                  .set('deleteflag', 1)
                  .where('time_relase < NOW()')
  console.log(mysql.toString());

  const result = await knex.raw(mysql.toString());


})


  router.route('/data_delete_list').get(async (req, res) => {
    let mysql = `SELECT table_name FROM information_schema.tables WHERE table_schema = 'hust_tech'`;
    const tableNames = await knex.raw(mysql)
    
    // console.log(tableNames[0]);
    if(tableNames==null||tableNames[0].length<1)   return returnFalse(res,'Not found data');
    return returnOK(res,{result: tableNames[0]});
    // return res.status(HttpStatus.OK).json({
    //   result: tableNames[0],
    // });
  });
router.route('/data_delete_table').post(async (req, res) => {
    const table = req.body.table;
    let mysql = `SELECT * FROM ${table} WHERE deleteflag = 1`;
    const dataDelete = await knex.raw(mysql);
    let mysql2 = `SHOW INDEX FROM ${table} WHERE Key_name = 'PRIMARY';`;
    const primaryKey = await knex.raw(mysql2);

    // see again in the case: table no data to delete
    if(dataDelete==null||dataDelete[0].length<1)   return returnFalse(res,'Not found data');
    const result = dataDelete[0];
    const primaryKeyTable = primaryKey[0][0].Column_name;
    let dataToDelete = {
      table: table,
      primaryKey: primaryKeyTable,
      data: []
    };

    const ids = await result.map(item => {
      let infoSave = {
        table: table,
        data: item,
        value: item.oldid==0 ? item[primaryKeyTable]:item.oldid, // get pramary key
        originId: item[primaryKeyTable] // wrong
      }
      DataDelete.insertMany(infoSave, (err, data) => {
        if(err) {
          console.log('everything is not ok !!!');                   
        }
        else {

        }
      })
          return item[primaryKeyTable];
    })
    dataToDelete.data = ids;
    return returnOK(res,{result: dataToDelete});
    
});
router.route('/delete_data_table').post(async (req, res) => 
{
  let data = req.body;
  // console.log(data);
  let numbers = '';
  numbers = data.data[0];
  if(data.data.length > 1) {
    for(let i=1; i <= data.data.length - 1; ++i) {
      numbers+= ' OR '  + data.primaryKey + ' = '+ data.data[i] ;
    }
  }
  let sql = `DELETE FROM ${data.table} WHERE ${data.primaryKey} = ${numbers}`;
  // console.log('sql delete...', sql);
  const result  = await knex.raw(sql);
  if(!!result) {
    return returnOK(res,{message: 'Deleted data'});

  }

});
module.exports = router;
