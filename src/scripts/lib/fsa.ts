/**
 * File System Access
 *
 * @author Takuto Yanagida
 * @version 2024-05-02
 */

export default class Fsa {

	static sep = '/';

	static dirName(path: string) {
		const es = path.split('/').map(e => e.trim()).filter(e => e.length);
		es.pop();
		return es.join('/');
	}

	static baseName(path: string, ext: string|null = null) {
		const ps = path.split('/').map(e => e.trim()).filter(e => e.length);
		const le = ps.pop() ?? '';
		if (ext && le.endsWith(ext)) {
			return le.substring(0, le.length - ext.length);
		}
		return le;
	}

	static extName(path: string) {
		const base = Fsa.baseName(path);
		const res = base.match(/^(.+?)(\.[^.]+)?$/) ?? [];
		const [,, ext] = res.map(m => m ?? '');
		return ext;
	}

	static #dirBaseName(path: string) {
		const ps = path.split('/').map(e => e.trim()).filter(e => e.length);
		const le = ps.pop() ?? '';
		return [ps.join('/'), le];
	}

	static join(...ps: string[]) {
		const re = new RegExp('^/+|/+$', 'g');
		return ps.map(e => e.replace(re, '')).filter(e => e.length).join('/');
	}


	// -------------------------------------------------------------------------


	#hRoot: FileSystemDirectoryHandle;

	constructor(hRoot: FileSystemDirectoryHandle) {
		this.#hRoot = hRoot;
	}

	async filePathToUrl(path: string) {
		console.log('filePathToUrl: ' + path);

		const hf = await this.getFileHandle(path);
		if (null === hf) {
			return '';
		}
		const f = await hf.getFile();
		return URL.createObjectURL(f);
	}


	// -------------------------------------------------------------------------


	async filePathToDataUrl(path: string) {
		console.log('filePathToDataUrl: ' + path);

		const hf   = await this.getFileHandle(path);
		if (null === hf) {
			return '';
		}
		const f = await hf.getFile();
		return await this.fileToDataUrl(f);
	}

	async fileToDataUrl(file: Blob) {
		const read = (f: Blob): Promise<string> => {
			return new Promise((res, rej) => {
				const fr = new FileReader();
				fr.addEventListener('load', () => res(fr.result as string));
				fr.addEventListener('error', () => rej(fr.error));
				fr.readAsDataURL(f);
			});
		};
		return await read(file).catch(() => null);
	}

	async #getEntry(hDir: FileSystemDirectoryHandle, name: string): Promise<FileSystemHandle|null> {
		for await (const e of hDir.values()) {
			if (e.name === name) {
				return e;
			}
		}
		return null;
	}

	async getFileHandle(path: string, options = {}): Promise<FileSystemFileHandle|null> {
		console.log('getFileHandle: ' + path);

		const ps = path.split('/').map(e => e.trim()).filter(e => e.length);
		const le = ps.pop() ?? '';

		const e = await this.getDirectoryHandle(ps.join('/'), options);
		if (null === e) {
			return null;
		}
		return await e.getFileHandle(le, options).catch(() => null);
	}

	async getDirectoryHandle(path: string, options = {}): Promise<FileSystemDirectoryHandle|null> {
		console.log('getDirectoryHandle: ' + path);

		const ps = path.split('/').map(e => e.trim()).filter(e => e.length);

		let e: FileSystemDirectoryHandle|null = this.#hRoot;
		for (const p of ps) {
			e = await e.getDirectoryHandle(p, options).catch(() => null);
			if (null === e) {
				return null;
			}
		}
		return e;
	}


	// -------------------------------------------------------------------------


	async readFile(path: string) {
		console.log('readFile: ' + path);

		const h = await this.getFileHandle(path);
		if (null === h) {
			return null;
		}
		const file: File = await h.getFile();
		return await file.text();
	}

	async writeFile(path: string, text: string) {
		console.log('writeFile: ' + path);

		const h = await this.getFileHandle(path, { create: true });
		if (null === h) {
			return false;
		}
		let res = true;
		const w = await h.createWritable();
		await w.write(text).catch(e => { res = e; });
		await w.close();
		return res;
	}

	async exists(path: string) {
		const [dir, base] = Fsa.#dirBaseName(path);
		const hDir = await this.getDirectoryHandle(dir);
		return hDir && null !== await this.#getEntry(hDir, base);
	}

	async mkdir(path: string) {
		return await this.getDirectoryHandle(path, { create: true });
	}

	async rmdir(path: string): Promise<boolean|TypeError|DOMException> {
		const [dir, base] = Fsa.#dirBaseName(path);
		const hDir = await this.getDirectoryHandle(dir);
		if (null === hDir) {
			return false;
		}
		let res = true;
		await hDir.removeEntry(base, { recursive: true }).catch(e => { res = e; });
		return res;
	}


	// -----------------------------------------------------------------------------


	async copyFile(from: string, to: string) {
		console.log('copyFile: ' + from + ' ' + to);

		const hFileFrom = await this.getFileHandle(from);
		if (null === hFileFrom) {
			return false;
		}
		const file = await hFileFrom.getFile();
		const text = await file.text();

		let res = true;
		const hFileTo = await this.getFileHandle(to, { create: true });
		if (null === hFileTo) {
			return false;
		}
		const writable = await hFileTo.createWritable();
		await writable.write(text).catch(e => { res = e; });
		await writable.close();
		return res;
	}
}
