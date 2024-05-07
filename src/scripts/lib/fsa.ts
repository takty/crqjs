/**
 * File System Access
 *
 * @author Takuto Yanagida
 * @version 2024-05-06
 */

export default class Fsa {

	static pathToPs(path: string) {
		return path.split('/').map(e => e.trim()).filter(e => e.length);
	}

	static psToPath(ps: string[], separator: string = '/') {
		return ps.join(separator);
	}


	// -------------------------------------------------------------------------


	static dirName(ps: string[]) {
		return ps.slice(0, -1);
	}

	static baseName(ps: string[], ext: string|null = null) {
		const last = ps.at(-1) ?? '';
		if (ext && last.endsWith(ext)) {
			return last.slice(0, -ext.length);
		}
		return last;
	}

	static extName(ps: string[]) {
		const last = ps.at(-1) ?? '';
		const res = last.match(/^(.+?)(\.[^.]+)?$/) ?? [];
		const [,, ext] = res.map(m => m ?? '');
		return ext;
	}


	// -------------------------------------------------------------------------


	#hRoot: FileSystemDirectoryHandle;
	#lastError: null|TypeError|DOMException = null;

	constructor(hRoot: FileSystemDirectoryHandle) {
		this.#hRoot = hRoot;
	}

	getLastError() {
		return this.#lastError;
	}

	async getFileHandle(ps: string[], options = {}): Promise<FileSystemFileHandle|null> {
		console.log('getFileHandle: ' + ps.join('/'));

		if (ps.length) {
			const last = ps.at(-1) ?? '';
			const hDir = await this.getDirectoryHandle(ps.slice(0, -1), options);
			if (null !== hDir) {
				return await hDir.getFileHandle(last, options).catch(e => { this.#lastError = e; return null; });
			}
		}
		return null;
	}

	async getDirectoryHandle(ps: string[], options = {}): Promise<FileSystemDirectoryHandle|null> {
		console.log('getDirectoryHandle: ' + ps.join('/'));

		let hDir: FileSystemDirectoryHandle|null = this.#hRoot;
		for (const p of ps) {
			hDir = await hDir.getDirectoryHandle(p, options).catch(e => { this.#lastError = e; return null; });
			if (null === hDir) {
				return null;
			}
		}
		return hDir;
	}


	// -------------------------------------------------------------------------


	async filePsToObjectUrl(ps: string[]) {
		console.log('filePsToObjectUrl: ' + ps.join('/'));

		const hFile = await this.getFileHandle(ps);
		if (null !== hFile) {
			const f = await hFile.getFile();
			return URL.createObjectURL(f);
		}
		return '';
	}

	async filePsToDataUrl(ps: string[]) {
		console.log('filePsToDataUrl: ' + ps.join('/'));

		const hFile   = await this.getFileHandle(ps);
		if (null !== hFile) {
			const f = await hFile.getFile();
			return await this.fileToDataUrl(f);
		}
		return '';
	}

	async fileToDataUrl(file: Blob) {
		return await Fsa.#createRead(file).catch(e => { this.#lastError = e; return null; });
	}

	static #createRead(f: Blob): Promise<string> {
		return new Promise((res, rej) => {
			const fr = new FileReader();
			fr.addEventListener('load', () => res(fr.result as string));
			fr.addEventListener('error', () => rej(fr.error));
			fr.readAsDataURL(f);
		});
	}


	// -------------------------------------------------------------------------


	async readFile(ps: string[], as: 'text'|'stream'|'buffer' = 'text') {
		console.log('readFile: ' + ps.join('/'));

		const hFile = await this.getFileHandle(ps);
		if (null !== hFile) {
			const file: File = await hFile.getFile();
			return await Fsa.#readFileAs(file, as);
		}
		return null;
	}

	static async #readFileAs(file: File, as: 'text'|'stream'|'buffer') {
		let ret = null;
		if ('text' === as) {
			ret = await file.text();
		} else if ('stream' === as) {
			ret = file.stream();
		} else if ('buffer' === as) {
			ret = await file.arrayBuffer();
		}
		return ret;
	}

	async writeFile(ps: string[], data: any): Promise<boolean> {
		console.log('writeFile: ' + ps.join('/'));

		let res = false;
		const hFile = await this.getFileHandle(ps, { create: true });
		if (null !== hFile) {
			res = true;
			const w = await hFile.createWritable();
			await w.write(data).catch(e => { this.#lastError = e; res = false; });
			await w.close();
		}
		return res;
	}

	async copyFile(from: string[], to: string[], as: 'text'|'stream'|'buffer' = 'text') {
		console.log('copyFile: ' + from.join('/') + ' -> ' + to.join('/'));

		const data = await this.readFile(from, as);
		if (null !== data) {
			return this.writeFile(to, data);
		}
		return false;
	}


	// -------------------------------------------------------------------------


	async exists(ps: string[]) {
		const last = ps.at(-1) ?? '';
		const hDir = await this.getDirectoryHandle(ps.slice(0, -1));

		if (null !== hDir) {
			for await (const e of hDir.values()) {
				if (e.name === last) {
					return true;
				}
			}
		}
		return false;
	}

	async mkdir(ps: string[]) {
		return await this.getDirectoryHandle(ps, { create: true });
	}

	async rmdir(ps: string[]): Promise<boolean> {
		const last = ps.at(-1) ?? '';
		let res = false;

		const hDir = await this.getDirectoryHandle(ps.slice(0, -1));
		if (null !== hDir) {
			res = true;
			await hDir.removeEntry(last, { recursive: true }).catch(e => { this.#lastError = e; res = false; });
		}
		return res;
	}

}
