'use strict';

var gulp = require('gulp');
var runSequence = require('run-sequence');

var laborer = require('laborer');

gulp.task('style', laborer.taskStyle());
gulp.task('icons', laborer.taskIcons());

gulp.task('client:tsc', laborer.taskClientTypeScript({ declaration: true }));
gulp.task('server:tsc', laborer.taskServerTypeScript({ declaration: true }));

gulp.task('client:test', laborer.taskClientTest({reporter: 'progress'}));
gulp.task('server:test', laborer.taskServerTest());
gulp.task('common:test', laborer.taskCommonTest({reporter: 'progress'}));

gulp.task('client:bundle', laborer.taskClientPack());

gulp.task('clean', laborer.taskClean());

gulp.task('all', function(cb) {
  laborer.failOnError();
  runSequence(
    'clean' ,
    ['style', 'icons'],
    ['server:tsc', 'client:tsc'],
    ['client:test', 'common:test'],
    'client:bundle',
    cb
  );
});

gulp.task('stats', function(cb) {
  laborer.showStats();
  gulp.start('all');
});

gulp.task('all-minus-bundle', function(cb) {
  runSequence(
    'clean' ,
    ['style', 'icons'],
    ['server:tsc', 'client:tsc'],
    cb
  );
});

gulp.task('watch', ['all-minus-bundle'], function() {
  gulp.watch('./src/client/**/*.scss', ['style']);
  gulp.watch('./src/client/**/*.svg', ['icons']);
  gulp.watch(['./src/common/**/*.ts', './src/client/**/*.{ts,tsx}', './assets/icons/**'], function() {
    runSequence('client:tsc');//, ['client:test', 'common:test']);
  });
  gulp.watch(['./src/common/**/*.ts', './src/server/**'], ['server:tsc']);
  laborer.clientPackWatch()
});

gulp.task('default', ['all']);
