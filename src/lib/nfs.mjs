/**
 * Native File System
 *
 * @author Takuto Yanagida
 * @version 2022-08-30
 */

import FS from 'fs';
import PATH from 'path';

export async function readFile(path) {
}

export async function writeFile(path, data) {
	// let res = true;
	// const w = await handle.current.createWritable();
	// await w.write(content).catch(e => { res = e; });
	// await w.close();
	// return res;
}

export async function exists(path) {
}

export async function mkdir(path) {
}


// -----------------------------------------------------------------------------


async function readdir(path) {
}

async function unlink(path) {
}

export async function rmdir(path) {
}


// -----------------------------------------------------------------------------


export function dirname(path) {
}

export function join(...pf) {
}

export function extname(path) {
}

export function basename(path, ext) {
}

export const sep = PATH.sep;


// -----------------------------------------------------------------------------


export async function rmdirRecursive(dirPath) {
}

export async function copyFile(from, to) {
}
