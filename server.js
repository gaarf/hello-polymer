var express = require('./server/express.js'),
    colors = require('colors/safe'),
    http = require('http'),
    env = require('./server/env.js');

express.appPromise().then(function (app) {

  var server = http.createServer(app),
      port = env('port');

  server.listen(port, '0.0.0.0', function () {
      console.info(colors.yellow('http')+' listening on port %s', port);
  });

});

