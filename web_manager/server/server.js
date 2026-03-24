const path = require('path');
const app = require('./config/express.js');
const routes = require('./routes/index.route.js');
const pagesRouters = require('./routes/pages.route.js');
const pagesRoutersMarket = require('./routes/page.market.router.js');
//const swagger = require('./config/swagger.js');

// Swagger API documentation
/*app.get('/swagger.json', (req, res) => {
  res.json(swagger);
});*/
// Router
app.use('/api', routes);
console.log("process.env.APP_MODE",process.env.APP_MODE);
if(process.env.APP_MODE=="NEWS"){
  app.use('/', pagesRouters);
}
else
{
  app.use('/', pagesRoutersMarket);
}


app.get('/u', (req, res) => {
  res.send(JSON.stringify({sample:false}));
  // res.sendFile(path.join(__dirname, '../public/dist/index.html'));
});

app.get('/comment/product', (req, res) => {
  //res.send(JSON.stringify({sample:false}));
   res.sendFile(path.join(__dirname, '../public/tool/comment/index.html'));
});

app.listen(app.get('port'), app.get('host'), () => {
  console.log(`Server is running at http://${app.get('host')}:${app.get('port')}`);
});

app.use('/change-lang/:lang', (req, res) => { 
  console.log('/change-lang/:lang', req.params.lang);
  res.cookie('lang', req.params.lang, { maxAge: 9000000 });
  res.redirect('back');
});
//module.exports =  app;
