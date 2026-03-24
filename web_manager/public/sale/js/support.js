var AccessKey = "keyAccess";


function SetLocalStorage(key, value) {
    localStorage.setItem(key, value);
}

function GetLocalStorage(key, defaultValue) {

    var val = localStorage.getItem(key);
    if (!!!val) {
        return defaultValue;
    }
    return val;
}

function  SetAccessKeyLogin(key) {
	SetLocalStorage(AccessKey,key);
}
function  GetAccessKeyLogin() {
	GetLocalStorage(AccessKey,null);
}

function ajax2Server(method, url, data, fncSuccess, funcErr) {

    var rootUrl = gcstrDOMAIN + url;
    var gcstrAccessKey = GetAccessKeyLogin();

    return $.ajax({
        timeout: 600000,
        type: method,
        url: url,
        dataType: "json",
        data: data,
        statusCode: {
            401: function (response) {
                //alert('Bạn không có quyền truy nhập');
                //window.location.href = gcstrRelativeDomain + "Login";
            }
        },
        success: fncSuccess,
        error: function(jqXHR, textStatus, err){

            if (jqXHR.status === 0) return;

            //Check authen then redirect to login
			if (jqXHR.status === 401 || jqXHR.statusCode === 401)
			{
				window.location.href = gcstrRelativeDomain + "Login";
				return;
            }

			if (typeof funcErr === "function"){
				funcErr(jqXHR, textStatus, err);
			}
        },
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Authorization": "Bearer " + gcstrAccessKey
        }
    });
}