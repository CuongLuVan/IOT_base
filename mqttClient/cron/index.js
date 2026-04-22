const cron = require('node-cron');
const axios = require('axios');

//Every day at midnight: '0 0 * * *'
cron.schedule('0 0 * * *', () => {
    console.log('I am ready');

     axios.put(process.env.MQTT_CLIENT + 'cron/delete_oauthen2_tables')
    .then(result => {
      console.log('success');
    })
    .catch(err => {
      console.log('error');
    })

    axios.get(process.env.MQTT_CLIENT + 'cron/data_delete_list')
    .then(data => {
      const tableNames = data.data.result.result;
      // console.log('first', tableNames)
        tableNames.map(async item => {
          let dataSend = {
            table: item.table_name
          };
          const itemData = await axios.post(process.env.MQTT_CLIENT + 'cron/data_delete_table', dataSend)
          .then(result => {
            const data = result.data.result.result;
            return data;
          })
          .catch(err => {
            // console.log(err)
            // extra code this case
          })
          if(!!itemData){
            // console.log('abc', itemData);
            axios.post(process.env.MQTT_CLIENT + 'cron/delete_data_table', itemData)
            .then(result => {
              console.log(result.data.result.message);
            })
            .catch(error => {

            })
          }  
         
        })
        // console.log('abc', dataDeleteTable);
        
    })
    .catch(err => {
            // extra code this case
            console.log(err)

    })
     
})