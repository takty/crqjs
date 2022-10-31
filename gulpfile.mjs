/**
 * Gulpfile
 *
 * @author Takuto Yanagida
 * @version 2022-11-01
 */

import gulp from 'gulp';

import { taskCopyLib } from './gulp-task/task-copy-lib.mjs';
import { taskCopyMain } from './gulp-task/task-copy-main.mjs';
import { taskStyle } from './gulp-task/task-style.mjs';

export default gulp.series(taskCopyMain, taskCopyLib, taskStyle);
