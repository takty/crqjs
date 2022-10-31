/**
 * Gulpfile - Tasks for copying main files
 *
 * @author Takuto Yanagida
 * @version 2022-11-01
 */

import gulp from 'gulp';

import { makeCopyTask } from './_task-copy.mjs';

const SRC_MAIN  = ['./src/**/*', '!./src/scss/**/*'];
const DIST_MAIN = './dist';


// -----------------------------------------------------------------------------


export const taskCopyMain = gulp.parallel(
	makeCopyTask(SRC_MAIN, DIST_MAIN),
);
