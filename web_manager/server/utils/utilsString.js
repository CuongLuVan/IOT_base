

exports.getRamdomData = (length)=> {
    var dataTocken = '';
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      for (var i = 0; i < length; i++)
      {
        dataTocken += possible.charAt(Math.floor(Math.random() * possible.length));
      }      
    return dataTocken;
  }
  