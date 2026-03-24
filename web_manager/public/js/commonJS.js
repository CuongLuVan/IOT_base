const TypeErrorShow = {
   // authen
   error101: "Đăng nhập lỗi ,Xin vui lòng thử lại",
   error102: "Sai Tên đăng nhập hoặc mật khẩu",
   error103: "Định dạng dữ liệu không đúng",
   error104: " Xin vui lòng đăng nhập !",
   error105: " Không tồn tại tài khoản , vui lòng kiểm tra tài khoản hoặc đăng ký tài khoản mới !",
   error106: " Bạn dang đăng nhập tài khoản hơn 2 lần trong 1s. Chúng tôi nghi ngờ bạn đang sử dụng phần mềm hack!= ",
   
   // data 
   error201: "Dữ liệu nhập lỗi",
   error202: "Kết nối mạng có vấn đề, xin vui lòng kiểm tra",
   error203: "Không thể truy cập vào phòng",
   error204: "server bận",
   error210: "Không thể upload file",
   error220: "Không thể truy cập vào bảng này",
   error230: "Số điện thoại hoặc email đã đăng ký, xin vui lòng sử dụng tài khoản khác!",
   error231: "Dữ liệu không tồn tại,Dữ liệu trống",
   error232: "Dữ liệu không tồn tại,Dữ liệu trống", //ACCAO_EXSITING
   error235: "Dữ liệu không hợp lệ ", //ACCAO_EXSITING

   // action
   error_default:"Kết nối mạng có vấn đề, xin vui lòng kiểm tra lại kết nối mạng"

};

async function showAlertSwal(obj){
  try
    {
        await Swal.fire(obj);
    }
  catch(ie){

  }
}
 function showAlertInfoMessage(string){
  try
    {
         Swal.fire({
          title: "Thông báo !",
          html: string, 
          confirmButtonText: "<u>Đồng ý</u>", 
          showCloseButton: true
        });
    }
  catch(ie){

  }
}

async function checkErrorData(data){
    try{
      if(data.hasOwnProperty("error_code")){
          var errorDetail = "error"+  data.error_code;
          if(TypeErrorShow.hasOwnProperty(errorDetail)){
              if(data.error_code==104){
                localStorage.setItem('customer', "");
                localStorage.setItem('token', "");
                if(typeof onReloadUser === "function"){
                  onReloadUser();
                }
                if(typeof onReloadMenu === "function"){
                  onReloadMenu();
                }
              }else if(data.error_code==235){
                await showAlertSwal({
                    title: "Lỗi nhập dữ liệu !",
                    html: "<i>"+data.error.message+"</i>", 
                    confirmButtonText: "<u>Đồng ý</u>", 
                    showCloseButton: true
                  });
                
                return;   
              }
              
              await showAlertSwal({
                title: "Thông báo !",
                html: "<i>"+TypeErrorShow[errorDetail]+"</i>", 
                confirmButtonText: "<u>Đồng ý</u>", 
                showCloseButton: true
              });
             
            return;
          }
      }
      await showAlertSwal({
        title: "Thông báo !",
        html: "<i>Kết nối mạng có vấn đề, xin vui lòng kiểm tra lại kết nối mạng</i>",   
        confirmButtonText: "<u>Đồng ý</u>", 
        showCloseButton: true
      });
    }
    catch(ie){

    }

}

async function showLoadingSwal(){
    try
      {
          await  Swal.showLoading();
      }
    catch(ie){

    }
}

async function hiddenLoadingSwal(){
  try
    {
      await Swal.hideLoading();
      await  Swal.close();
    }
  catch(ie){

  }
}

async function getInfoDataPublic(urlLink,callBack) {
      try
      {
          await showLoadingSwal();
          var data = await $.ajax({
              type: 'GET',
              enctype: 'multipart/form-data',
              url: urlLink,
              data: {},
              processData: false, //prevent jQuery from automatically transforming the data into a query string
              contentType: false,
              cache: false});
            await hiddenLoadingSwal();
            if(callBack==null) return data;
            callBack(data); 
      }
      catch(ie){
        hiddenLoadingSwal();
        await checkErrorData(ie.responseJSON);
        if(callBack==null) return false;
        callBack(false);
      }
}

async function getInfoHtml(urlLink,callBack){
  try
  {
      await showLoadingSwal();
      var data = await $.ajax({
                      type: 'GET',
                    enctype: 'multipart/form-data',
                    url: urlLink,
                    data: {},
                    processData: false, //prevent jQuery from automatically transforming the data into a query string
                    contentType: false,
                    cache: false});
        await  hiddenLoadingSwal();
        if(callBack==null) return data;
        callBack(data); 
  }
  catch(ie){
    await  hiddenLoadingSwal();
    await checkErrorData(ie.responseJSON);
    if(callBack==null) return false;
    callBack(false);
  }
}

async function postInfoData(urlLink,dataInfo,callBack=null){
    try
    {
      await showLoadingSwal();
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

      await  hiddenLoadingSwal();
      if(callBack==null) return {error:false,data:dataReturn};
      callBack({error:false,data:dataReturn});
    }
    catch(e){
      await  hiddenLoadingSwal();
      await checkErrorData(e.responseJSON);
      if(callBack==null) return {error:true,data:e.responseJSON};
      callBack({error:true,data:e.responseJSON});
    }
    
}

async function getInfoData(urlLink,dataInfo,callBack){
    try
    {
        await showLoadingSwal();
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
        await  hiddenLoadingSwal();
        if(callBack==null) return dataReturn;
        callBack(dataReturn);
    }
    catch(e){
      await  hiddenLoadingSwal();
      await checkErrorData(e.responseJSON);
      if(callBack==null) return false;
      callBack(false);
    }
  
}



function setItemFormITemAds(item){
  var html='<div class="div-left-hust-tech"> <label class="sb-font-hust-tech" >'
                +item.title+'</label></div>' ;

    /*var html=' <div class="sb-img-hust-tech ">  <img class="image-hust-tech-menu" src ="'+item.content_img+'"/>'
                +'</div>' 
                +'<div class="div-left-hust-tech"> <label class="sb-font-hust-tech" >'
                +item.title+'</label></div>' ;*/
    return html;
}

function setFormToMenuShowAds(dataJson,itemToSet){
    var textHtml="";
    for(var i =0;i<dataJson.length;i++){
        if(dataJson[i].is_main_pages_id==-1){
            textHtml += ' <a class="side-menu-item sb-border-hust-tech"  href="../group_page/'+
               dataJson[i].pages_content_id +'" >'+setItemFormITemAds(dataJson[i])+'</a>'; 
        }
        else
        {
            var linkEdit= dataJson[i].filesave.replaceAll('/', '+');
            textHtml += ' <a class="side-menu-item sb-border-hust-tech"  href="../detail_page_1/'+
            linkEdit +'" >'+setItemFormITemAds(dataJson[i]) +'</a>'; 
        }
    }
    $(itemToSet).html(textHtml); 
  }



    function setFormToShowPages(item,urlDetail){
      var start =  '<div class="rs-about style9 pt-20 md-pt-70"><div class="container container-title-hust-tech">';
      var limkUrl= '<a href="'+urlDetail;
      if(item.is_main_pages_id==-1){
        limkUrl += 'group_page/'+item.pages_content_id +'" style="font-size: 20px;">';
        }
        else
        {
          limkUrl +='page_detail/'+ item.name_short  +'" style="font-size: 20px;">';
        }
      
      var content = ' <div class="row align-items-center">  <div class="col-lg-3"> <div class="img-part js-tilt">'           
                 + '<img src="' +item.content_img +'" alt="chợ xanh 4 mùa"  />  </div> </div>'
                 +'<div class="col-lg-9"> <div class="div-font-title-hust-tech">'+item.title +'</div> <div class="content div-font-info-hust-tech "><br/>' +item.content
                 + '</div></div></div></div></div>';

      return (limkUrl +start+content + ' </a>');
    }


    async   function  getInfoDetailPages(nameDivControl,dataView,urlDetail){
      try
      {
        await showLoadingSwal();
        var data = await $.ajax({
            type: 'GET',
            enctype: 'multipart/form-data',
            url: '/api/document/document_detail/'+dataView,
            data: {},
            processData: false, //prevent jQuery from automatically transforming the data into a query string
            contentType: false,
            cache: false,
        });

        await  hiddenLoadingSwal();
        console.log(data);
        var dataJson =data
        console.log(dataJson);
        var textHtml ="";
        dataJson= dataJson.sort(function (a, b) {
                return (a.group_content_sub_id-b.group_content_sub_id);
        });
        console.log(dataJson);
        var titleSub="";
        for(var i =0;i<dataJson.length;i++){
          if(dataJson[i].group_content!=titleSub){
            titleSub = dataJson[i].group_content;
            textHtml+= "<center><H2>"+dataJson[i].group_content+"</H2></center>";
          }
          textHtml += setFormToShowPages(dataJson[i],urlDetail);
        }
        
        $('#'+nameDivControl).html(textHtml); //.replaceAll("</p>","<br/>").replaceAll("<p>","<br/>")
      }
      catch(ie){
        await  hiddenLoadingSwal();
        await checkErrorData(e.responseJSON);
      }
      
    }

    async  function getInfoAbs(nameDivControl,dataView) {
      try
      {
        await showLoadingSwal();
        var data = await $.ajax({
          type: 'GET',
          enctype: 'multipart/form-data',
          url: '/api/document/lastest_detail/'+dataView,
          data: {},
          processData: false, //prevent jQuery from automatically transforming the data into a query string
          contentType: false,
          cache: false,
        });

        await  hiddenLoadingSwal();
        console.log(data);
        setFormToMenuShowAds(data, nameDivControl); 
      }
      catch(e){
        await  hiddenLoadingSwal();
        await checkErrorData(e.responseJSON);
      }
    }


    var isMobile = {
      Android: function() {
          return navigator.userAgent.match(/Android/i);
      },
      BlackBerry: function() {
          return navigator.userAgent.match(/BlackBerry/i);
      },
      iOS: function() {
          return navigator.userAgent.match(/iPhone|iPad|iPod/i);
      },
      Opera: function() {
          return navigator.userAgent.match(/Opera Mini/i);
      },
      Windows: function() {
          return navigator.userAgent.match(/IEMobile/i) || navigator.userAgent.match(/WPDesktop/i);
      },
      any: function() {
          return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
      }
  };


  function getInfoLink(item){
    var linkAcess ='http://' + window.location.hostname +':' +window.location.port ;
    if(item.is_main_pages_id==-1){
        return (linkAcess+'/group_page/' +item.pages_content_id);
    }
    else
    {
      var content =   `?typePage=${item.pages_content_id}&file=${item.filesave}`;
      if(item.group_content_sub_id==7) 
        return (linkAcess+'/recruitment/page' + content);
      else 
        return (linkAcess+'/page_detail/' +item.name_short); 

    }
}

function getDetailContent(id){
  const nameInfo =[{name:"Thông tin",info:["","Công nghệ mới","IT/AI","Điện tử","Cơ khí","Đời sống","Tin giả"]}
                    ,{name:"",info:[]}
                    ,{name:"Tài liệu",info:["","Toán/Vật lý","Lập trình","Điện tử","Cơ khí","Đồ án ","Kỹ năng"]}
                    ,{name:"",info:[]}
                    ,{name:"Công cụ",info:["","Toán học - vật lý","Kinh tế","Xử lý ảnh","Công cụ design","Công cụ IOT"]}];
  var mainId=Math.floor(id/10);
  var detailID=id%10;
  if(mainId<0) return"";
  if(mainId>5) return"";
  var stringInfo= nameInfo[mainId].name;
  if(nameInfo[mainId].info.length<=detailID) return stringInfo;
  stringInfo = stringInfo+" - " +nameInfo[mainId].info[detailID];
  return stringInfo;
}

function loadAllHtmlToShow (data, templateHtml) {
  var htmlDetail = "";
  data.forEach((element) => {
    let data = templateHtml(element)
    htmlDetail += data;
    // counter++;
    // console.log(element);
  });
  return htmlDetail;
}

function initCarouselMain (selector, numberOfSlide) {
  $(`${selector}`).owlCarousel({
      loop:true,
      nav:true,
      margin:0,
      responsiveClass:true,
      responsive:{
          0:{
              items:1,
          },
          600:{
              items:1,
          },
          820: {
              items: 2,
          },
          1000:{
              items:3,
          },
          1200:{
              items: numberOfSlide,
          }
      },
      navText : ["<i class='fa fa-chevron-left'></i>","<i class='fa fa-chevron-right'></i>"]
  });  
  // $('.related-products-carousel').owlCarousel('refresh');
}
// Ham de in ra data
var dataSaveInfo = {};
function setNewProduct(item, itemHtml, templateHtml, numberOfSlide) {
  dataSaveInfo["main"] = item;
  dataHtml = loadAllHtmlToShow(item, templateHtml);
  // htmlDetail = console.log(htmlDetail);
  $(itemHtml).html(dataHtml);
  initCarouselMain(itemHtml, numberOfSlide);
}


function setFillertProductToView(items, itemHtml,type="sale") {
  var html='';
  
  items.forEach((element) => {
    console.log("element ...........",element);
    var percent_HTML =`<del>${element.cost_real}VND</del>`;
    if(element.cost_real==element.cost_detail) percent_HTML= "";
    var dataInfo = `<div class="showcase">
                <div class="showcase-banner">
                  <img src="${element.image}" alt="chợ xanh 4 mùa" class="product-img default"
                    width="300">
                  <img src="${element.image}" alt="chợ xanh 4 mùa" class="product-img hover"
                    width="300" >
              
                  <p class="showcase-badge angle pink">${element.store==1?"Hết hàng": element.name_image_detail}</p>
              
                  <div class="showcase-actions">
                    <button class="btn-action">
                      <ion-icon name="heart-outline"></ion-icon>
                    </button>
              
                    <button class="btn-action">
                      <ion-icon name="eye-outline"></ion-icon>
                    </button>
              
                    <button class="btn-action">
                      <ion-icon name="repeat-outline"></ion-icon>
                    </button>
              
                    <button class="btn-action">
                      <ion-icon name="bag-add-outline"></ion-icon>
                    </button>
                  </div>
                </div>
              
                <div class="showcase-content">
                  <a href="/${type}/${setPadamDetailSale(element)}" class="showcase-category">${element.product_name}</a>
                  <h3>
                    <a href="/${type}/${setPadamDetailSale(element)}"  class="showcase-title">${(element.product_detail)}</a>
                  </h3>
                  <!---
                  <div class="showcase-rating">
                    <ion-icon name="star"></ion-icon>
                    <ion-icon name="star"></ion-icon>
                    <ion-icon name="star"></ion-icon>
                    <ion-icon name="star-outline"></ion-icon>
                    <ion-icon name="star-outline"></ion-icon>
                  </div> --->
                  <div class="price-box">
                    <p class="price">${element.cost_detail>0?element.cost_detail+" VND":"Liên hệ"}</p>
                    ${percent_HTML}
                  </div>
                </div>
              </div>`;
              
    html+=dataInfo;
  });
  $(itemHtml).html(html);
}

function checkGetQuerryForm(){
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('typePage');
    const nameFile = urlParams.get('file');
    var link="";

    if(type==1){
      link = `https://techhust.s3.ap-southeast-1.amazonaws.com/deploy/storeHtml/`+nameFile;
    }else if(type==2){
      link = `https://techhust.s3.ap-southeast-1.amazonaws.com/test/html/`  +nameFile;
    }else if(type==3){
      link = `https://techhust.s3.ap-southeast-1.amazonaws.com/deploy/static/`  +nameFile;
    }else if(type==4){
      link = `https://techhust.s3.amazonaws.com/deploy/storeHtml/`+nameFile;
    }else if(type==5){
      link = `https://techhust.s3.amazonaws.com/test/html/`  +nameFile;
    }else if(type==6){
      link = `https://techhust.s3.amazonaws.com/deploy/static/`  +nameFile;
    }else if(type==7){
      link = `https://techhust.s3.ap-southeast-1.amazonaws.com/deploy/html/`  +nameFile;
    }else if(type==8){
      link = `https://techhust.s3.amazonaws.com/deploy/html/`+nameFile;
    }
    return link;
}

function setGetQuerryForm(info){
  var type=1;
  var nameFile="";
  if(info.includes(`https://techhust.s3.ap-southeast-1.amazonaws.com/deploy/storeHtml/`)){
    type=1;
    nameFile=info.replace(`https://techhust.s3.ap-southeast-1.amazonaws.com/deploy/storeHtml/`,"");
  }else if(info.includes(`https://techhust.s3.ap-southeast-1.amazonaws.com/test/html/`)){
    type=2;
    nameFile=info.replace(`https://techhust.s3.ap-southeast-1.amazonaws.com/test/html/`,"");
  }else if(info.includes(`https://techhust.s3.ap-southeast-1.amazonaws.com/deploy/static/`)){
    type=3;
    nameFile=info.replace(`https://techhust.s3.ap-southeast-1.amazonaws.com/deploy/static/`,"");
  }if(info.includes(`https://techhust.s3.amazonaws.com/deploy/storeHtml/`)){
    type=4;
    nameFile=info.replace(`https://techhust.s3.amazonaws.com/deploy/storeHtml/`,"");
  }else if(info.includes(`https://techhust.s3.amazonaws.com/test/html/`)){
    type=5;
    nameFile=info.replace(`https://techhust.s3.amazonaws.com/test/html/`,"");
  }else if(info.includes(`https://techhust.s3.amazonaws.com/deploy/static/`)){
    type=6;
    nameFile=info.replace(`https://techhust.s3.amazonaws.com/deploy/static/`,"");
  }else if(info.includes(`https://techhust.s3.ap-southeast-1.amazonaws.com/deploy/html/`)){
    type=7;
    nameFile=info.replace(`https://techhust.s3.ap-southeast-1.amazonaws.com/deploy/html/`,"");
  }if(info.includes(`https://techhust.s3.amazonaws.com/deploy/html/`)){
    type=8;
    nameFile=info.replace(`https://techhust.s3.amazonaws.com/deploy/html/`,"");
  }
  //https://techhust.s3.amazonaws.com
  var padam=`?typePage=${type}&file=${nameFile}`
  return padam;
}

function setPadamDetailSale(element){
  return (`product_detail?type=`+element.product_id+`&block=`+element.product_group_id);
}


function setValueCost(value,type){
  let valueInfo= value.toString();
  let stringValue = "";
  
  for(let i =1;i<(valueInfo.length+1);i++){
    if(i<valueInfo.length&&((i%3)==0)) stringValue = "." + valueInfo[valueInfo.length-i] +stringValue;
    else stringValue =   valueInfo[valueInfo.length-i] + stringValue;
  }
  return (stringValue +" "+type);
}