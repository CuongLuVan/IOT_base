
var fs = require('fs');
var dataView = "";


class DocumentFileAndFloder{
    constructor() {
      this.checkfileAndWrite=this.checkfileAndWrite.bind(this);
      this.setPathData=this.setPathData.bind(this);
      this.generateRandomString=this.generateRandomString.bind(this);
    }

    setPathData(patch){
        dataView=patch;
    }
    generateRandomString(length) {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
         
        for (var i = 0; i < length; i++)
          text += possible.charAt(Math.floor(Math.random() * possible.length));
         
        return text;
    }

    checkfileAndWrite(floder,path,content){
       
        var dir =  './public/'+floder;
        try {
            if (!fs.existsSync(dir)){
                fs.mkdirSync(dir,{ recursive: true });
            }
            dir=dir+"/"+path;
           
            fs.writeFile(dir, content, (err) => {
                // throws an error, you could also catch it here
                if (err) throw err;
            });
          } catch(err) {
            console.error(err)
            return null;
          }
        return (floder+"/"+path);
    }
    
    createNewfile(content,floder){
        var ts = 'file'+this.generateRandomString(20)+ (new Date().getTime())+".html";
        return  this.checkfileAndWrite(floder,ts,content);
    }

    checkfileAndWriteLocal(floder,path,content){
        return new Promise( ( resolve, reject ) => {
            var dir =  './public/'+floder;
            try {
                if (!fs.existsSync(dir)){
                    fs.mkdirSync(dir,{ recursive: true });
                }
                dir=dir+"/"+path;
            
                fs.writeFile(dir, content, (err) => {
                    // throws an error, you could also catch it here
                    if (err) reject(err);
                    else  resolve( (floder+"/"+path));
                });
            } catch(err) {
                reject(err);  
            }
        });
    }

    async createNewFileToS3(content,floder){
        var ts = 'file'+this.generateRandomString(20)+ (new Date().getTime())+".html";
        return await  this.checkfileAndWriteLocal(floder,ts,content);
    }

    readFileInFolder(input){
        var dir = dataView+'\\storeHtml\\' +input;
        return new Promise( ( resolve, reject ) => {
            try {
                fs.readFile(dir, {encoding: 'utf-8'}, function(err,data){
                    if (!err) {
                        resolve(data);
                    } else {
                        reject(err);
                    }
                });
            }
            catch(err) {
                reject(err);
            }
        });
    }
    
}

module.exports = DocumentFileAndFloder;