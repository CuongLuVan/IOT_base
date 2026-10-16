const path = require('path');
const app = require('./config/express.js');
const routes = require('./routes/index.route.js');
const pagesRouterNews = require('./routes/pages.route.js');
const pagesRouterMarket = require('./routes/page.market.router.js');
const pagesLibrary = require('./routes/pages_library.route.js');
const oauthPages = require('./routes/Oauthen.router.js');

app.use('/api', routes);

console.log('process.env.APP_MODE', process.env.APP_MODE);
if (process.env.APP_MODE === 'NEWS') {
  app.use('/', pagesRouterNews);
} else if (process.env.APP_MODE === 'SHARE_LIBRARY') {
  app.use('/', pagesLibrary);
} else {
  app.use('/', pagesRouterMarket);
}
app.use('/', oauthPages);

app.get('/u', (req, res) => {
  res.send(JSON.stringify({ sample: false }));
});

app.get('/comment/product', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/tool/comment/index.html'));
});

app.listen(app.get('port'), app.get('host'), () => {
  console.log('Server is running at http://' + app.get('host') + ':' + app.get('port'));
});

app.use('/change-lang/:lang', (req, res) => {
  res.cookie('lang', req.params.lang, { maxAge: 9000000 });
  res.redirect('back');
});
