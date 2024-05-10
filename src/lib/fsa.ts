/**
 * File System Access
 *
 * @author Takuto Yanagida
 * @version 2024-05-09
 */

export class FileSystem {

	static async #readAs(file: File, as: 'text'|'stream'|'arrayBuffer') {
		let ret = null;
		if ('text' === as) {
			ret = await file.text();
		} else if ('stream' === as) {
			ret = file.stream();
		} else if ('arrayBuffer' === as) {
			ret = await file.arrayBuffer();
		}
		return ret;
	}

	#hRoot: FileSystemDirectoryHandle;
	#lastError: null|TypeError|DOMException = null;

	constructor(hRoot: FileSystemDirectoryHandle) {
		this.#hRoot = hRoot;
	}

	getLastError() {
		return this.#lastError;
	}

	async getFileHandle(p: Path, options = {}): Promise<FileSystemFileHandle|null> {
		console.log('getFileHandle: ' + p);

		if (p.length) {
			const bn = p.baseName();
			const hDir = await this.getDirectoryHandle(p.parent(), options);
			if (null !== hDir) {
				return await hDir.getFileHandle(bn, options).catch(e => { this.#lastError = e; return null; });
			}
		}
		return null;
	}

	async getDirectoryHandle(p: Path, options = {}): Promise<FileSystemDirectoryHandle|null> {
		console.log('getDirectoryHandle: ' + p);

		let hDir: FileSystemDirectoryHandle|null = this.#hRoot;
		for (const e of p.elements) {
			hDir = await hDir.getDirectoryHandle(e, options).catch(e => { this.#lastError = e; return null; });
			if (null === hDir) {
				return null;
			}
		}
		return hDir;
	}


	// -------------------------------------------------------------------------


	async filePathToObjectUrl(p: Path) {
		console.log('filePathToObjectUrl: ' + p);

		const hFile = await this.getFileHandle(p);
		if (null !== hFile) {
			const f = await hFile.getFile();
			return URL.createObjectURL(f);
		}
		return '';
	}

	async filePathToDataUrl(p: Path) {
		console.log('filePathToDataUrl: ' + p);

		const hFile   = await this.getFileHandle(p);
		if (null !== hFile) {
			const f = await hFile.getFile();
			return await this.fileToDataUrl(f);
		}
		return '';
	}

	async fileToDataUrl(file: Blob) {
		return await FileSystem.#createRead(file).catch(e => { this.#lastError = e; return null; });
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


	async readFile(p: Path, as: 'text'|'stream'|'arrayBuffer' = 'text') {
		console.log('readFile: ' + p);

		const hFile = await this.getFileHandle(p);
		if (null !== hFile) {
			const file: File = await hFile.getFile();
			return await FileSystem.#readAs(file, as);
		}
		return null;
	}

	async writeFile(p: Path, data: any): Promise<boolean> {
		console.log('writeFile: ' + p);

		let res = false;
		const hFile = await this.getFileHandle(p, { create: true });
		if (null !== hFile) {
			res = true;
			const w = await hFile.createWritable();
			await w.write(data).catch(e => { this.#lastError = e; res = false; });
			await w.close();
		}
		return res;
	}

	async copyFile(from: Path, to: Path, as: 'text'|'stream'|'arrayBuffer' = 'text') {
		console.log('copyFile: ' + from + ' -> ' + to);

		const data = await this.readFile(from, as);
		if (null !== data) {
			return this.writeFile(to, data);
		}
		return false;
	}


	// -------------------------------------------------------------------------


	async exists(p: Path): Promise<boolean> {
		const bn = p.baseName();
		const hDir = await this.getDirectoryHandle(p.parent());

		if (null !== hDir) {
			for await (const e of hDir.values()) {
				if (e.name === bn) {
					return true;
				}
			}
		}
		return false;
	}

	async makeDirectory(p: Path): Promise<FileSystemDirectoryHandle|null> {
		return await this.getDirectoryHandle(p, { create: true });
	}

	async removeDirectory(p: Path): Promise<boolean> {
		const bn = p.baseName();
		let res = false;

		const hDir = await this.getDirectoryHandle(p.parent());
		if (null !== hDir) {
			res = true;
			await hDir.removeEntry(bn, { recursive: true }).catch(e => { this.#lastError = e; res = false; });
		}
		return res;
	}

}

export class Path {

	static splitPath(path: string) {
		return path.split('/').map(e => e.trim()).filter(e => e.length);
	}

	static joinElements(es: string[], separator: string = '/') {
		return es.join(separator);
	}

	static normalize(es: string[]) {
		const ret = [];
		for (const e of es) {
			if ('..' === e) {
				ret.pop();
			} else if (e.length && '.' !== e) {
				ret.push(e);
			}
		}
		return ret;
	}

	#es: string[] = [];

	constructor(val: string|string[]|null = null) {
		if (val) {
			if (Array.isArray(val)) {
				this.elements = val;
			} else {
				this.elements = Path.splitPath(val);
			}
		}
	}

	get elements(): string[] {
		return this.#es;
	}

	set elements(es: string[]) {
		this.#es = Path.normalize(es);
	}

	get length(): number {
		return this.#es.length;
	}

	set length(l: number) {
		this.#es.length = l;
	}

	toString(separator: string = '/'): string {
		return Path.joinElements(this.#es, separator);
	}

	concat(p: string|Path): Path {
		return new Path(this.#es.concat(typeof p === 'string' ? Path.splitPath(p) : p.#es));
	}

	parent(): Path {
		return new Path(this.#es.slice(0, -1));
	}

	baseName(ext: string|null = null) {
		const ret = this.#es.at(-1) ?? '';
		if (ext && ret.endsWith(ext)) {
			return ret.slice(0, -ext.length);
		}
		return ret;
	}

	extName() {
		const ret = this.#es.at(-1) ?? '';
		const ms = ret.match(/^(.+?)(\.[^.]+)?$/) ?? [];
		const [,, ext] = ms.map(m => m ?? '');
		return ext;
	}

}
