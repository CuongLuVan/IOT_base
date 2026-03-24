//const URL_SP = `http://chat.techhust.com`;
const URL_SP = `http://localhost:3002`;

async function checkStatisticalPages(){
  try
  {
    var urlLink =  URL_SP+  `/api/history/page_statistical`;
    var dataInfo ={
      link_pages:window.location.href,
      value_vote:0,
      id_read:0,
      note:""
    };
    var data = localStorage.getItem('customer');
    if(data!=null&&data!==undefined&&data.length>1){ 
      dataInfo.id_read = data.customer_id
    }
    var dataReturn = await $.ajax({
        type: 'post',
        method: 'POST',
        url: urlLink,
        body: JSON.stringify(dataInfo), // body data type must match "Content-Type" header
        data: JSON.stringify(dataInfo), // body data type must match "Content-Type" header
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        credentials: 'same-origin', // include, *same-origin, omit
        redirect: 'follow', // manual, *follow, error
        referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        dataType: 'json',
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        credentials: 'same-origin', // include, *same-origin, omit
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': 'Beard ' + localStorage.getItem('token'),
            // 'Content-Type': 'application/x-www-form-urlencoded',
        },
    });
    return {error:false,data:dataReturn};
  }
  catch(e){
    return {error:true,data:e.responseJSON};
  }
  
}

async function checkStatisticalProduct(id){
  try
  {
    var urlLink =  URL_SP+ `/api/history/product_statistical?type=`+id;
    var dataReturn = await $.ajax({
        type: 'get',
        method: 'GET',
        url: urlLink,
        body: JSON.stringify(dataInfo), // body data type must match "Content-Type" header
        data: JSON.stringify(dataInfo), // body data type must match "Content-Type" header
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        credentials: 'same-origin', // include, *same-origin, omit
        redirect: 'follow', // manual, *follow, error
        referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        dataType: 'json',
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        credentials: 'same-origin', // include, *same-origin, omit
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': 'Beard ' + localStorage.getItem('token'),
            // 'Content-Type': 'application/x-www-form-urlencoded',
        },
    });
    return {error:false,data:dataReturn};
  }
  catch(e){
    return {error:true,data:e.responseJSON};
  }
  
}

async function voteProductInPages(id,vote,note){
  try
  {
    var urlLink =  URL_SP+ `/api/history/page_statistical`;
    var dataInfo ={
      id_product:id,
      number_vote:vote,
      id_vote:0,
      note:note
    };
    var data = localStorage.getItem('customer');
    if(data!=null&&data!==undefined&&data.length>1){ 
      dataInfo.id_vote = data.customer_id
    }
    var dataReturn = await $.ajax({
        type: 'post',
        method: 'POST',
        url: urlLink,
        body: JSON.stringify(dataInfo), // body data type must match "Content-Type" header
        data: JSON.stringify(dataInfo), // body data type must match "Content-Type" header
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        credentials: 'same-origin', // include, *same-origin, omit
        redirect: 'follow', // manual, *follow, error
        referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        dataType: 'json',
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        credentials: 'same-origin', // include, *same-origin, omit
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': 'Beard ' + localStorage.getItem('token'),
            // 'Content-Type': 'application/x-www-form-urlencoded',
        },
    });
    return {error:false,data:dataReturn};
  }
  catch(e){
    return {error:true,data:e.responseJSON};
  }
}


async function checkNoificationOfUser(type){
  try
  {
    var dataInfo = {all:type};
    var urlLink =  URL_SP+ `/api/history/noification`;
    var dataReturn = await $.ajax({
        type: 'get',
        method: 'GET',
        url: urlLink,
        body: dataInfo, // body data type must match "Content-Type" header
        data: dataInfo, // body data type must match "Content-Type" header
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        credentials: 'same-origin', // include, *same-origin, omit
        redirect: 'follow', // manual, *follow, error
        referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        dataType: 'json',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': 'Beard ' + localStorage.getItem('token'),
            // 'Content-Type': 'application/x-www-form-urlencoded',
        },
    });
    return {error:false,data:dataReturn};
  }
  catch(e){
    return {error:true,data:e.responseJSON};
  } 
}
