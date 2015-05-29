var gulp = require('gulp'),
    plug = require('gulp-load-plugins')(),
    pkg = require('./package.json'),
    spawn = require('child_process').spawn,
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
      './bower_components/webcomponentsjs/webcomponents-lite.js'
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
      '!./app/components/**/*',
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

gulp.task('html:components', function() {
  return gulp.src('./app/components/**/*')
      .pipe(gulp.dest('./dist/assets/components'));
});

gulp.task('html:main', function() {
  return gulp.src('./app/*.html')
      .pipe(gulp.dest('./dist'));
});

gulp.task('html', ['html:main', 'html:components']);






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

gulp.task('vulcanize', function() {
  return gulp.src('./app/components/x-main/x-main.html')
    .pipe(plug.vulcanize())
    .pipe(gulp.dest('./dist/assets/bundle'));
});

gulp.task('minify', ['minify:js', 'minify:css', 'vulcanize']);




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
    if(f==='x-main.html') {
      out = out.pipe(plug.replace(
          '/assets/components/x-main/'+f, 
          p+rev[f]
        ));
    }
    else {
      out = out.pipe(plug.replace(p+f, p+rev[f]));
    }

  };
  return out.pipe(gulp.dest('./dist'));
});
// TODO: rev:cleanup


/*
  alias tasks
 */
gulp.task('lib', ['js:lib', 'css:lib']);
gulp.task('app', ['js:app', 'css:app']);
gulp.task('js', ['js:lib', 'js:app']);
gulp.task('css', ['css:lib', 'css:app']);
gulp.task('style', ['css']);

gulp.task('build', ['js', 'css', 'img', 'html']);
gulp.task('distribute', ['build', 'rev:replace']);

gulp.task('default', ['lint', 'build']);



/*
  watch
 */
gulp.task('watch', ['build'], function() {
  plug.livereload.listen();

  gulp.watch(['./dist/**/*']).on('change', plug.livereload.changed);
  gulp.watch(['./app/components/**/*'], ['html:components']);
  gulp.watch(['./app/**/*.js', '!./app/components/**/*', '!./app/**/*-test.js'], ['js:app']);
  gulp.watch(['./app/**/*.{less,css}', '!./app/components/**/*'], ['css:app']);
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
      plug.util.log(plug.util.colors.green('Restart!'));
      p.on('exit', function () {
        p = start();
      });
      p.kill('SIGTERM');
    }, 500); // debounced
  });

  function start () {
    var child = spawn( "npm", ["start"], { cwd: __dirname } );
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', function (data) {
      data.split('\n').forEach(function (line) {
        line && plug.util.log(plug.util.colors.blue(line));
      });
    });
    return child;
  }

});


