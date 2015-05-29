var express = require('./server/express.js'),
    colors = require('colors/safe'),
    http = require('http'),
    PORT = 8080;

express.appPromise().then(function (app) {

  var server = http.createServer(app);

  server.listen(PORT, '0.0.0.0', function () {
      console.info(colors.yellow('http')+' listening on port %s', PORT);
  });

});
