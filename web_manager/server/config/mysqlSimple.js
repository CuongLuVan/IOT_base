/*const database = require('../config/database.js');
var mysql = require('mysql');
var con = mysql.createConnection(database.connection);
con.connect(function(err) {
    if (err) throw err;
    console.log("Connected!",database.connection );
});


var mysqlSimple={};

mysqlSimple.query = function(stringSql) {
    return new Promise( ( resolve, reject ) => {
        con.query( stringSql, function (err, result, fields) {
            if ( err )
                return reject( err );
            resolve( result );
        } );
    } );
}

module.exports =  mysqlSimple; */
