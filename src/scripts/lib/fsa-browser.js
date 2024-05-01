/**
 * File System Access (Browser)
 *
 * @author Takuto Yanagida
 * @version 2022-11-01
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
		const base = this.baseName(path);
		const res = base.match(/^(.+?)(\.[^.]+)?$/) ?? [];
		const [,, ext] = res.map(m => m ?? '');
		return ext;
	}

	#dirBaseName(path) {
		const ps = path.split('/').map(e => e.trim()).filter(e => e.length);
		const le = ps.pop();
		return [ps.join('/'), le];
	}

	join(...ps) {
		const re = new RegExp('^/+|/+$', 'g');
		return ps.map(e => e.replace(re, '')).filter(e => e.length).join('/');
	}


	// -------------------------------------------------------------------------


	#hRoot = null;

	constructor(hRoot) {
		this.#hRoot = hRoot;
	}


	async filePathToUrl(path, currentDir = null) {
		console.log('filePathToUrl: ' + path);

		const h = await this.getFileHandle(path);
		const file = await h.getFile();
		return URL.createObjectURL(file);
	}


	// -------------------------------------------------------------------------


	async filePathToDataUrl(path) {
		console.log('filePathToDataUrl: ' + path);

		const hf   = await this.getFileHandle(path);
		const file = await hf.getFile();
		return await this.fileToUrl(file);
	}

	async fileToUrl(file) {
		const read = f => {
			return new Promise((res, rej) => {
				const fr = new FileReader();
				fr.addEventListener('load', () => res(fr.result));
				fr.addEventListener('error', () => rej(fr.error));
				fr.readAsDataURL(f);
			});
		};
		return await read(file).catch(() => null);
	}

	async #getEntry(hDir, name) {
		for await (const e of hDir.values()) {
			if (e.name === name) {
				return e;
			}
		}
		return null;
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
		const [dir, base] = this.#dirBaseName(path);
		const hDir = await this.getDirectoryHandle(dir);
		return hDir && null !== await this.#getEntry(hDir, base);
	}

	async mkdir(path) {
		return await this.getDirectoryHandle(path, { create: true });
	}

	async rmdir(path) {
		const [dir, base] = this.#dirBaseName(path);
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
