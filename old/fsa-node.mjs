/**
 * File System Access (Node.js)
 *
 * @author Takuto Yanagida
 * @version 2022-10-31
 */

import FS from 'fs';
import PATH from 'path';

export default class {

	sep = PATH.sep;

	dirName(path) {
		return PATH.dirname(path);
	}

	baseName(path, ext = null) {
		return PATH.basename(path, ext);
	}

	extName(path) {
		return PATH.extname(path);
	}

	join(...pf) {
		return PATH.join(...pf);
	}


	// -------------------------------------------------------------------------


	constructor() {
	}


	filePathToUrl(path, dir = null) {
		if (dir) {
			return PATH.basename(path);
		}
		return path;
	}


	// -------------------------------------------------------------------------


	async readFile(path) {
		const r = await new Promise(resolve => {
			FS.readFile(path, { encoding: 'utf-8' }, (err, cont) => resolve(err ? null : cont));
		});
		return r;
	}

	async writeFile(path, data) {
		const r = await new Promise(resolve => {
			FS.writeFile(path, data, err => resolve(err ? null : path));
		});
		return r;
	}

	async exists(path) {
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

	async mkdir(path) {
		const res = await new Promise(resolve => {
			FS.mkdir(path, { recursive: true }, err => resolve(err ? false : true));
		});
		return res;
	}

	async rmdir(dirPath) {
		const r = await this.exists(dirPath);
		if (!r) return;
		const fps = await this.#readdir(dirPath);
		if (!fps) return;
		for (let fp of fps) {
			fp = this.join(dirPath, fp);
			const r = await this.exists(fp);
			if ('directory' === r) {
				await this.rmdir(fp);
			} else {
				await this.#unlink(fp);
			}
		}
		await this.#rmdir(dirPath);
	}

	async #readdir(path) {
		const res = await new Promise(resolve => {
			FS.readdir(path, (err, files) => resolve(err ? null : files));
		});
		return res;
	}

	async #unlink(path) {
		const res = await new Promise(resolve => {
			FS.unlink(path, err => resolve(err ? false : true));
		});
		return res;
	}

	async #rmdir(path) {
		const res = await new Promise(resolve => {
			FS.rmdir(path, err => resolve(err ? false : true));
		});
		return res;
	}


	// -----------------------------------------------------------------------------


	async copyFile(from, to) {
		if (!await this.exists(this.dirName(to))) {
			const r = await this.mkdir(this.dirName(to))
			if (!r) return false;
		}
		const r = await new Promise(resolve => {
			FS.copyFile(from, to, err => resolve(err ? false : true));
		});
		return r;
	}
}
