/**
 *
 * Gulpfile
 *
 * @author Takuto Yanagida
 * @version 2021-09-10
 *
 */

'use strict';

const gulp     = require('gulp');
const copySync = require('./copy-sync');

const PATH_LIB = './src/lib/';

gulp.task('copy-acorn', (done) => {
	copySync('./node_modules/acorn/dist', PATH_LIB + 'acorn');
	copySync('./node_modules/acorn-loose/dist', PATH_LIB + 'acorn');
	copySync('./node_modules/acorn-walk/dist', PATH_LIB + 'acorn');
	done();
});

gulp.task('copy-lib', gulp.parallel(
	'copy-acorn',
));

gulp.task('copy-src', (done) => {
	copySync('./src', './dist');
	done();
});

gulp.task('copy', gulp.series('copy-lib', 'copy-src'));

gulp.task('default', gulp.series('copy'));
