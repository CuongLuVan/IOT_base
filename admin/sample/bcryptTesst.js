const bcrypt = require('bcrypt');
var myPlaintextPassword = '123456789';

bcrypt.genSalt(12, function(err, salt) {
    bcrypt.hash(myPlaintextPassword, salt, function(err, hash) {
        // Store hash in your password DB.
		console.log("user Inval 9 ",hash);
		console.log("user Inval err ",err);
    });
});
bcrypt.compare('12345678', '$2b$12$60EHiBeAiyLcu8CatwHxe.x/RuG6dzFlb7csxPLLnA7vyNFIADypu', function(err, result) {
    // result == true
	console.log("user Inval result ",result);
});

