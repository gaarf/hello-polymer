/*global require, module, process, __dirname */

var Q = require('q'),
    pkg = require('../package.json'),
    morgan = require('morgan'),
    express = require('express'),
    compression = require('compression'),
    finalhandler = require('finalhandler'),
    serveFavicon = require('serve-favicon'),
    bodyParser = require('body-parser'),
    colors = require('colors/safe'),
    ROOT_PATH = require('path').normalize( __dirname + '/..');
    DIST_PATH = ROOT_PATH + '/dist';

module.exports = {
  appPromise: function () {
    // returning a promise for potential async config retrieval
    return Q.when(makeApp());
  }
};

morgan.token('ms', function (req, res){
  if (!res._header || !req._startAt) { return ''; }
  var diff = process.hrtime(req._startAt);
  var ms = diff[0] * 1e3 + diff[1] * 1e-6;
  return Math.ceil(ms)+'ms';
});

var httpStaticLogger = morgan(colors.green('http')+' :method :url :ms :status');
var httpIndexLogger = morgan(colors.inverse('http')+' :method :url :ms :status');

var render404 = function (req, res) {
  finalhandler(req, res)(false);
};

function makeApp () {

  var app = express();
  console.log(colors.underline(pkg.name) + ' v' + pkg.version + ' starting up...');

  // middleware
  try { app.use(serveFavicon(DIST_PATH + '/assets/img/favicon.png')); }
  catch(e) { console.error('Favicon missing! Did you run `gulp build`?'); }
  app.use(compression());
  app.use(bodyParser.json());


  // serve own static assets
  app.use('/assets', [
    httpStaticLogger,
    express.static(DIST_PATH + '/assets'),
    render404
  ]);

  // serve bower_components
  app.use('/bower_components', [
    httpStaticLogger,
    express.static(ROOT_PATH + '/bower_components'),
    render404
  ]);

  app.get('/robots.txt', [
    httpStaticLogger,
    function (req, res) {
      res.type('text/plain');
      res.send('User-agent: *\nDisallow: /');
    }
  ]);

  // any other path, serve index.html
  app.all('*', [
    httpIndexLogger,
    function (req, res) {
      res.sendFile(DIST_PATH + '/index.html');
    }
  ]);

  return app;

}
