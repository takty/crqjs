/**
 * Path of File System Access
 *
 * @author Takuto Yanagida
 * @version 2024-05-12
 */

import { Path } from './path';

export class FsaPath extends Path {

	static #normalize(ps: string[]) {
		const ret: string[] = [];
		for (const p of ps) {
			if ('..' === p) {
				if ('/' !== (ret.at(-1) ?? '')) {
					ret.pop();
				}
			} else {
				ret.push(p);
			}
		}
		return ret;
	}

	static async #readAs(file: File, as: 'text' | 'stream' | 'arrayBuffer') {
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

	static #createDataUrl(f: Blob): Promise<string> {
		return new Promise((res, rej) => {
			const fr = new FileReader();
			fr.addEventListener('load', () => res(fr.result as string));
			fr.addEventListener('error', () => rej(fr.error));
			fr.readAsDataURL(f);
		});
	}

	static async fileToDataUrl(file: Blob) {
		let error = null;
		const r = await FsaPath.#createDataUrl(file).catch(e => { error = e; return null; });
		return [r, error];
	}

	#hRoot: FileSystemDirectoryHandle | null;
	#lastError: null | TypeError | DOMException = null;

	constructor(hRoot: FileSystemDirectoryHandle | null, ...vs: readonly (string | Path)[]) {
		super(...vs);
		this.#hRoot = hRoot;
	}

	getLastError() {
		return this.#lastError;
	}

	async getFileHandle(options = {}): Promise<FileSystemFileHandle | null> {
		let ret = null;
		if (this.isAbsolute()) {
			const name = this.name();
			if ('' !== name) {
				const hDir = await this.parent().getDirectoryHandle(options);
				if (null !== hDir) {
					ret = await hDir.getFileHandle(name, options).catch(e => {
						this.#lastError = e;
						return null;
					});
				}
			}
		}
		return ret;
	}

	async getDirectoryHandle(options = {}): Promise<FileSystemDirectoryHandle | null> {
		let ret = null;
		if (this.isAbsolute() && this.#hRoot) {
			const hDirs: FileSystemDirectoryHandle[] = [this.#hRoot];
			for (const s of FsaPath.#normalize(this.segments()).slice(1)) {
				const hDir = await hDirs.at(-1)?.getDirectoryHandle(s, options).catch(e => { this.#lastError = e; return null; }) ?? null;
				if (null === hDir) {
					return null;
				}
				hDirs.push(hDir);
			}
			ret = hDirs.at(-1) ?? null;
		}
		return ret;
	}


	// -------------------------------------------------------------------------


	async toObjectUrl() {
		const hFile = await this.getFileHandle();
		if (null !== hFile) {
			const f = await hFile.getFile();
			return URL.createObjectURL(f);
		}
		return '';
	}

	async toDataUrl() {
		const hFile = await this.getFileHandle();
		if (null !== hFile) {
			const f = await hFile.getFile();
			return await FsaPath.#createDataUrl(f).catch(e => {
				this.#lastError = e;
				return null;
			});
		}
		return '';
	}


	// -------------------------------------------------------------------------


	async readFile(as: 'text' | 'stream' | 'arrayBuffer' = 'text') {
		const hFile = await this.getFileHandle();
		if (null !== hFile) {
			const file: File = await hFile.getFile();
			return await FsaPath.#readAs(file, as);
		}
		return null;
	}

	async writeFile(data: any): Promise<boolean> {
		let res = false;
		const hFile = await this.getFileHandle({ create: true });
		if (null !== hFile) {
			res = true;
			const w = await hFile.createWritable();
			await w.write(data).catch(e => { this.#lastError = e; res = false; });
			await w.close();
		}
		return res;
	}

	async copyFile(to: FsaPath, as: 'text' | 'stream' | 'arrayBuffer' = 'text') {
		const data = await this.readFile(as);
		if (null !== data) {
			return to.writeFile(data);
		}
		return false;
	}


	// -------------------------------------------------------------------------


	async exists(): Promise<boolean> {
		const name = this.name();
		const hDir = await this.parent().getDirectoryHandle();

		if (null !== hDir) {
			for await (const e of hDir.values()) {
				if (e.name === name) {
					return true;
				}
			}
		}
		return false;
	}

	async remove(): Promise<boolean> {
		let res = false;

		const hDir = await this.parent().getDirectoryHandle();
		if (null !== hDir) {
			res = true;
			await hDir.removeEntry(this.name(), { recursive: true }).catch(e => {
				this.#lastError = e;
				res = false;
			});
		}
		return res;
	}

	async makeDirectory(): Promise<boolean> {
		const hDir = await this.getDirectoryHandle({ create: true });
		return null !== hDir;
	}


	// -------------------------------------------------------------------------


	parents(): FsaPath[] {
		return super.parents() as FsaPath[];
	}

	parent(): FsaPath {
		return super.parent() as FsaPath;
	}

	join(...vs: (string | Path)[]): FsaPath {
		return super.join(...vs) as FsaPath;
	}

	withName(name: string): FsaPath {
		return super.withName(name) as FsaPath;
	}

	withStem(stem: string): FsaPath {
		return super.withStem(stem) as FsaPath;
	}

	withSuffix(suffix: string): FsaPath {
		return super.withSuffix(suffix) as FsaPath;
	}

	withSegments(...vs: readonly (string | Path)[]): FsaPath {
		return new FsaPath(this.#hRoot, ...vs);
	}

}
