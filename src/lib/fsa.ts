/**
 * File System Access
 *
 * @author Takuto Yanagida
 * @version 2024-05-12
 */

import { Path } from "./path";

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

		if (!p.isAbsolute() || '' === p.name()) {
			return null;
		}
		const name = p.name();
		// console.log('getFileHandle ' + name);
		// console.log('getFileHandle ' + p.parent().toString());
		const hDir = await this.getDirectoryHandle(p.parent(), options);
		// console.log('getFileHandle ' + hDir);
		if (null !== hDir) {
			return await hDir.getFileHandle(name, options).catch(e => { this.#lastError = e; return null; });
		}
		return null;
	}

	async getDirectoryHandle(p: Path, options = {}): Promise<FileSystemDirectoryHandle|null> {
		console.log('getDirectoryHandle: ' + p);

		if (!p.isAbsolute()) {
			return null;
		}
		const hDirs: FileSystemDirectoryHandle[] = [this.#hRoot];
		// let hDir: FileSystemDirectoryHandle|null = this.#hRoot;

		for (const s of p.segments().slice(1)) {
			if ('..' === s) {
				hDirs.pop();
			} else {
				let hDir = await hDirs.at(-1)?.getDirectoryHandle(s, options).catch(e => { this.#lastError = e; return null; }) ?? null;
				if (null === hDir) {
					return null;
				}
				hDirs.push(hDir);
			}
		}
		return hDirs.at(-1) ?? null;;
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
		// console.log('writeFile ' + hFile);
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
		const bn = p.name();
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
		const bn = p.name();
		let res = false;

		const hDir = await this.getDirectoryHandle(p.parent());
		if (null !== hDir) {
			res = true;
			await hDir.removeEntry(bn, { recursive: true }).catch(e => { this.#lastError = e; res = false; });
		}
		return res;
	}

}
