

  function checkUserAuthen2() {
            var mname = localStorage.getItem("tocken_LVC");
            $.ajax({
                type: 'post',
                dataType: 'json',
                url: 'http://codexact.online/checkUserAuthen2',
                data: {
                    user: "check" 
                  },
                  beforeSend: function (xhr) {
                    xhr.setRequestHeader('Authorization', 'Bearer '+mname);
                },
                success: function (loadcofig) {
                    console.log("loadcofig........................");
                    console.log(loadcofig);
                    if(loadcofig){
                        console.log("loadcofig........................okkkkkkkkkkkkkkkkk");
                    }
                    else
                    {
                      //  $("#managerAuthen").attr("href", "login");
                      //  $("#managerAuthen").html('Login');
                       // window.location.href ="http://codexact.online/login";
                    
                    }
                  
                },
                 complete: function (loadcofig) {
                    console.log("loadcofig........................");
                    console.log(loadcofig.responseText);
                  },
                  error: function (loadcofig) {
                    console.log("loadcofig...................errorerrorerror.....");
                      console.log(loadcofig);
                  }
                });
  }

  function checkUserAuthenSecsion() {
    var mname = localStorage.getItem("tocken_LVC");
    $.ajax({
        type: 'post',
        dataType: 'json',
        url: 'http://codexact.online/checkUserAuthen2',
        data: { user: "check" },
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', 'Bearer '+mname);
        },
        success: function (loadcofig) {
            console.log("loadcofig........................");
            console.log(loadcofig);
            if(loadcofig){
                console.log("loadcofig........................okkkkkkkkkkkkkkkkk");
            }
            else
            {
                $("#managerAuthen").attr("href", "login");
                $("#managerAuthen").html('Login');
                window.location.href ="http://codexact.online/login";
            
            }
          
        },
         complete: function (loadcofig) {
            console.log("loadcofig........................");
            console.log(loadcofig.responseText);
          },
          error: function (loadcofig) {
            console.log("loadcofig...................errorerrorerror.....");
              console.log(loadcofig);
          }
        });
}

  function  gotoRegister(){
    window.location.href ="http://codexact.online/register";
  }
// When the user clicks anywhere outside of the modal, close it
