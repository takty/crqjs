/**
 * Gulpfile - Tasks for style
 *
 * @author Takuto Yanagida
 * @version 2022-10-17
 */

import gulp from 'gulp';

import { makeCopyTask } from './_task-copy.mjs';
import { makeSassTask } from './_task-sass.mjs';

const SRC_SASS = 'src/scss/**/[^_]*.scss';
const SRC_COPY = ['src/scss/**/*', '!src/scss/*.scss'];
const DIST     = 'dist/css';


// -----------------------------------------------------------------------------


export const taskStyle = gulp.parallel(
	makeSassTask(SRC_SASS, DIST),
	makeCopyTask(SRC_COPY, DIST)
);
