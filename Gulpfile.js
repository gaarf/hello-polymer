var gulp = require('gulp'),
    plug = require('gulp-load-plugins')(),
    pkg = require('./package.json'),
    spawn = require('child_process').spawn,
    mkdirp = require('mkdirp'),
    path = require('path'),
    fs = require('fs'),
    del = require('del');

/*
  library CSS
 */
gulp.task('css:lib', ['fonts'], function() {

  return gulp.src([
      './bower_components/normalize.css/normalize.css'
    ])
    .pipe(plug.if('*.less', plug.less()))
    .pipe(plug.concat('lib.css'))
    .pipe(gulp.dest('./dist/assets/bundle'));
});


/*
  fonts
 */
gulp.task('fonts', function() {
  return gulp.src([
      './app/styles/fonts/*'
    ])
    .pipe(gulp.dest('./dist/assets/fonts'));
});


/*
  application CSS
 */
gulp.task('css:app', function() {
  return gulp.src([
      './app/styles/common.less'
    ])
    .pipe(plug.if('*.less', plug.less()))
    .pipe(plug.concat('app.css'))
    .pipe(plug.autoprefixer(["> 1%"], {cascade:true}))
    .pipe(gulp.dest('./dist/assets/bundle'));
});



/*
  library javascript
 */
gulp.task('js:lib', function() {
  return gulp.src([
      './bower_components/webcomponentsjs/webcomponents-lite.js',
      './bower_components/app-router/src/app-router.js',
      './bower_components/pushstate-anchor/src/pushstate-anchor.js'
    ])
    .pipe(plug.concat('lib.js'))
    .pipe(gulp.dest('./dist/assets/bundle'));
});



/*
  application javascript
 */
gulp.task('js:app', function() {
  var PKG = JSON.stringify({
    name: pkg.name,
    v: pkg.version
  });
  return gulp.src([
      './app/main.js',
      './app/**/*.js',
      '!./app/elements/**/*',
      '!./app/**/*-test.js'
    ])
    .pipe(plug.wrapper({
       header: '\n(function (PKG){ /* ${filename} */\n',
       footer: '\n})('+PKG+');\n'
    }))
    .pipe(plug.concat('app.js'))
    .pipe(gulp.dest('./dist/assets/bundle'));
});



/*
  images
  TODO: imgmin?
 */
gulp.task('img', function() {
  return gulp.src('./app/styles/img/**/*')
    .pipe(gulp.dest('./dist/assets/img'));
});





/*
  Markup
 */

gulp.task('html:elements', function() {
  return gulp.src('./app/elements/**/*')
      .pipe(gulp.dest('./dist/assets/elements'));
});

gulp.task('html:pages', function() {
  return gulp.src('./app/pages/**/*.html')
      .pipe(gulp.dest('./dist/assets/pages'));
});

gulp.task('html:main', function() {
  return gulp.src('./app/*.html')
      .pipe(gulp.dest('./dist'));
});

gulp.task('html:main:livereload', function() {
  return gulp.src('./app/*.html')
      .pipe(plug.replace('</body>', '<script '+
        'src="http://localhost:35729/livereload.js">'+
        '</script></body>'))
      .pipe(gulp.dest('./dist'));
});



/*
  JS hint
 */
gulp.task('lint', function() {
  return gulp.src(['./app/**/*.js', './server/*.js'])
    .pipe(plug.jshint())
    .pipe(plug.jshint.reporter())
    .pipe(plug.jshint.reporter('fail'));
});
gulp.task('jshint', ['lint']);
gulp.task('hint', ['lint']);




/*
  clean dist
 */
gulp.task('clean', function(cb) {
  del(['./dist/*'], cb);
});


/*
  minification
 */
gulp.task('minify:js', ['js'], function() {
  return gulp.src('./dist/assets/bundle/{app,lib}.js')
    .pipe(plug.uglify())
    .pipe(gulp.dest('./dist/assets/bundle'));
});

gulp.task('minify:css', ['css'], function() {
  return gulp.src('./dist/assets/bundle/*.css')
    .pipe(plug.minifyCss({keepBreaks:true}))
    .pipe(gulp.dest('./dist/assets/bundle'));
});


/*
  rev'd assets
 */

gulp.task('rev:manifest', ['minify'], function() {
  return gulp.src(['./dist/assets/bundle/*'])
    .pipe(plug.rev())
    .pipe(plug.size({showFiles:true, gzip:true, total:true}))
    .pipe(gulp.dest('./dist/assets/bundle'))  // write rev'd assets to build dir

    .pipe(plug.rev.manifest({path:'manifest.json'}))
    .pipe(gulp.dest('./dist/assets/bundle')); // write manifest

});

gulp.task('rev:replace', ['html:main', 'rev:manifest'], function() {
  var rev = require('./dist/assets/bundle/manifest.json'),
      out = gulp.src('./dist/*.html'),
      p = '/assets/bundle/';
  for (var f in rev) {
      out = out.pipe(
        plug.replace(
          f.indexOf('vulcan.html')===0 ? '/assets/elements/everything.html' : p+f,
          p+rev[f]
        )
      );
  };
  return out.pipe(gulp.dest('./dist'));
});


gulp.task('vulcanize', ['html:elements'], function (done) {

  /**
   * cf https://github.com/Polymer/vulcanize/issues/203
   */

  // return gulp.src('/dist/assets/elements/everything.html')
  //   .pipe(plug.vulcanize({
  //     abspath: __dirname
  //   }))
  //   .pipe(plug.concat('vulcan.html'))
  //   .pipe(gulp.dest('./dist/assets/bundle'));


  var output = [],
      child = spawn(
        './node_modules/gulp-vulcanize/node_modules/.bin/vulcanize',
        [ '--abspath', '.', 'dist/assets/elements/everything.html' ],
        { cwd: __dirname }
      );

  child.stdout.on('data', function (b) {
    output.push(b);
  });

  child.on('close', function() {
    var filename = __dirname + '/dist/assets/bundle/vulcan.html';
    mkdirp(path.dirname(filename), function() {
      fs.writeFile(filename, Buffer.concat(output), done);
    });
  });


});


/*
  alias tasks
 */
gulp.task('js', ['js:lib', 'js:app']);
gulp.task('css', ['css:lib', 'css:app']);
gulp.task('minify', ['minify:js', 'minify:css', 'vulcanize']);
gulp.task('build:assets', ['js', 'css', 'img', 'html:pages', 'html:elements']);
gulp.task('build:livereload', ['build:assets', 'html:main:livereload']);
gulp.task('build', ['build:assets', 'html:main']);
gulp.task('distribute', ['build', 'rev:replace']);

gulp.task('default', ['lint', 'build']);


/*
  watch
 */
gulp.task('watch', ['build:livereload'], function() {
  plug.livereload.listen();

  gulp.watch(['./dist/**/*']).on('change', plug.livereload.changed);
  gulp.watch(['./app/*.html'], ['html:main:livereload']);
  gulp.watch(['./app/pages/**/*.html'], ['html:pages']);
  gulp.watch(['./app/elements/**/*'], ['html:elements']);
  gulp.watch(['./app/**/*.js', '!./app/elements/**/*', '!./app/**/*-test.js'], ['js:app']);
  gulp.watch(['./app/**/*.{less,css}', '!./app/elements/**/*'], ['css:app']);
  gulp.watch(['./app/styles/img/**/*'], ['img']);

});


/*
  develop
 */
gulp.task('develop', ['watch'], function() {

  var p = start(),
      t = null;

  gulp.watch('./server/**/*', function() {
    clearTimeout(t);
    t = setTimeout(function() {
      p.on('exit', function () {
        p = start();
      });
      plug.util.log(plug.util.colors.red('Restart!'));
      p.kill('SIGTERM');
    }, 500); // debounced
  });

  function start () {
    var child = spawn( "node", ["server.js"], { cwd: __dirname } );
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', function (data) {
      data.split('\n').forEach(function (line) {
        line && plug.util.log(plug.util.colors.blue(line));
      });
    });
    return child;
  }

});





/*
  build zip file for elements that have a bower.json
  committing the zip file effectively enables re-use of the element
  in another project by referencing the zip file

  "some-element": "https://raw.githubusercontent.com/myorg/myapp/master/zips/some-element.zip"

 */
gulp.task('zip', function () {

  var dir = 'app/elements';

  return require('merge-stream')(

    fs.readdirSync(dir)
      .filter(function(one) {
        return fs.existsSync(path.join(dir, one, 'bower.json'));
      })
      .map(function(one){
        plug.util.log('zipping', one);
        return gulp.src(path.join(dir, one) + '/**')
          .pipe(plug.zip(one+'.zip'))
          .pipe(gulp.dest('./zips'));
      })

  );

});

