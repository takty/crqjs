/**
 * File System Access
 *
 * @author Takuto Yanagida
 * @version 2022-10-17
 */

export default class {

	sep = '/';

	dirName(path) {
		const es = path.split('/').map(e => e.trim()).filter(e => e.length);
		es.pop();
		return es.join('/');
	}

	baseName(path, ext = null) {
		const ps = path.split('/').map(e => e.trim()).filter(e => e.length);
		const le = ps.pop();
		if (ext && le.endsWith(ext)) {
			return le.substring(0, le.length - ext.length);
		}
		return le;
	}

	extName(path) {
		const base = baseName(path);
		const res = base.match(/^(.+?)(\.[^.]+)?$/) ?? [];
		const [,, ext] = res.map(m => m ?? '');
		return ext;
	}

	dirBaseName(path) {
		const ps = path.split('/').map(e => e.trim()).filter(e => e.length);
		const le = ps.pop();
		return [ps.join('/'), le];
	}

	join(...ps) {
		const re = new RegExp('^/+|/+$', 'g');
		return ps.map(e => e.replace(re, '')).filter(e => e.length).join('/');
	}

	async filePathToUrl(path, currentDir = null) {
		console.log('filePathToUrl: ' + path);

		// const h = await this.getFileHandle(path);
		// const file = await h.getFile();
		// return URL.createObjectURL(file);
		return path;
	}


	// -------------------------------------------------------------------------


	#hRoot = null;

	constructor(hRoot) {
		this.#hRoot = hRoot;
	}


	// -------------------------------------------------------------------------


	async #getEntry(hDir, name) {
		for await (const e of hDir.values()) {
			if (e.name === name) {
				return e;
			}
		}
		return null;
	}

	async #pathToHandle(path) {
		const ps = path.split('/').map(e => e.trim()).filter(e => e.length);

		let e = this.#hRoot;
		for (const p of ps) {
			e = await this.#getEntry(e, p);
			if (null === e) {
				return null;
			}
		}
		return e;
	}

	async getFileHandle(path, options = {}) {
		console.log('getFileHandle: ' + path);

		const ps = path.split('/').map(e => e.trim()).filter(e => e.length);
		const le = ps.pop();

		const e = await this.getDirectoryHandle(ps.join('/'), options);
		if (null === e) {
			return null;
		}
		return await e.getFileHandle(le, options).catch(() => null);
	}

	async getDirectoryHandle(path, options = {}) {
		console.log('getDirectoryHandle: ' + path);

		const ps = path.split('/').map(e => e.trim()).filter(e => e.length);

		let e = this.#hRoot;
		for (const p of ps) {
			e = await e.getDirectoryHandle(p, options).catch(() => null);
			if (null === e) {
				return null;
			}
		}
		return e;
	}


	// -------------------------------------------------------------------------


	async readFile(path) {
		console.log('readFile: ' + path);

		const h = await this.getFileHandle(path);
		if (!h) return null;
		const file = await h.getFile();
		const text = await file.text();
		return text;
	}

	async writeFile(path, text) {
		console.log('writeFile: ' + path);

		const h = await this.getFileHandle(path, { create: true });
		if (!h) return null;
		let res = true;
		console.log(h);
		const writable = await h.createWritable();
		await writable.write(text).catch(e => { res = e; });
		await writable.close();
		return res;
}

	async exists(path) {
		const [dir, base] = this.dirBaseName(path);
		const hDir = await this.getDirectoryHandle(dir);
		return hDir && null !== await this.#getEntry(hDir, base);
	}

	async mkdir(path) {
		return await this.getDirectoryHandle(path, { create: true });
	}

	async rmdir(path) {
		const [dir, base] = this.dirBaseName(path);
		const hDir = await this.getDirectoryHandle(dir);
		if (!hDir) return false;
		let res = true;
		await hDir.removeEntry(base, { recursive: true }).catch(e => { res = e; });
		return res;
	}


	// -----------------------------------------------------------------------------


	async copyFile(from, to) {
		console.log('copyFile: ' + from + ' ' + to);

		const hFileFrom = await this.getFileHandle(from);
		const file = await hFileFrom.getFile();
		const text = await file.text();

		let res = true;
		const hFileTo = await this.getFileHandle(to, { create: true });
		const writable = await hFileTo.createWritable();
		await writable.write(text).catch(e => { res = e; });
		await writable.close();
		return res;
	}
}
