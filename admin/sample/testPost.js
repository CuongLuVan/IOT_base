const axios = require('axios')

axios.post( 'http://localhost:3000/api/social/check_email',
	{
		customer_id: '0',
		username: 'luvancuong0105',
		email: 'luvancuong0105@gmail.com',
		password: 'luvancuong0105',
		phone: '09992921',
		avatar: 'avartar',
		fullname: 'luvancuong0105',
		permission_id: '1',
		address: 'adress',
		note: 'note'
	},
	{ 
		headers: {
		  Accept: 'application/json',
		  'Content-Type': 'application/json',
		},
	}
).then((response) => {
        console.log(response.data);
      })
      .catch((error) => {
        console.log(error);
      });