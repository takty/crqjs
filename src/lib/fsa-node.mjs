/**
 * File System Access (Node.js)
 *
 * @author Takuto Yanagida
 * @version 2022-10-17
 */

import FS from 'fs';
import PATH from 'path';

export async function readFile(path) {
	const r = await new Promise(resolve => {
		FS.readFile(path, { encoding: 'utf-8' }, (err, cont) => resolve(err ? null : cont));
	});
	return r;
}

export async function writeFile(path, data) {
	const r = await new Promise(resolve => {
		FS.writeFile(path, data, err => resolve(err ? null : path));
	});
	return r;
}

export async function exists(path) {
	const res = await new Promise(resolve => {
		FS.stat(path, (err, stat) => {
			if (err) {
				resolve(false);
			} else {
				resolve(stat.isFile() ? 'file' : stat.isDirectory() ? 'directory' : '');
			}
		});
	});
	return res;
}

export async function mkdir(path) {
	const res = await new Promise(resolve => {
		FS.mkdir(path, { recursive: true }, err => resolve(err ? false : true));
	});
	return res;
}


// -----------------------------------------------------------------------------


async function readdir(path) {
	const res = await new Promise(resolve => {
		FS.readdir(path, (err, files) => resolve(err ? null : files));
	});
	return res;
}

async function unlink(path) {
	const res = await new Promise(resolve => {
		FS.unlink(path, err => resolve(err ? false : true));
	});
	return res;
}

export async function rmdir(path) {
	const res = await new Promise(resolve => {
		FS.rmdir(path, err => resolve(err ? false : true));
	});
	return res;
}


// -----------------------------------------------------------------------------


export function dirname(path) {
	return PATH.dirname(path);
}

export function join(...pf) {
	return PATH.join(...pf);
}

export function extname(path) {
	return PATH.extname(path);
}

export function basename(path, ext) {
	return PATH.basename(path, ext);
}

export function filePathToUrl(path, dir = null) {
	if (dir) {
		return PATH.basename(path);
	}
	return path;
}

export const sep = PATH.sep;


// -----------------------------------------------------------------------------


export async function rmdirRecursive(dirPath) {
	const r = await exists(dirPath);
	if (!r) return;
	const fps = await readdir(dirPath);
	if (!fps) return;
	for (let fp of fps) {
		fp = join(dirPath, fp);
		const r = await exists(fp);
		if ('directory' === r) {
			await rmdirRecursive(fp);
		} else {
			await unlink(fp);
		}
	}
	await rmdir(dirPath);
}

export async function copyFile(from, to) {
	if (!await exists(dirname(to))) {
		const r = await mkdir(dirname(to))
		if (!r) return false;
	}
	const r = await new Promise(resolve => {
		FS.copyFile(from, to, err => resolve(err ? false : true));
	});
	return r;
}
