/**
 * Exporter
 *
 * @author Takuto Yanagida
 * @version 2024-05-12
 */

import { FsaPath } from "$lib/fsa-path.js";
import extractDeclarations from './custom-declaration.js';
import { exportAsLibrary, readAsLibrary } from './simple-library.js';

const AS_MODULE = true;

const ENTRY_CODE = `{'function'==typeof setup&&setup();}`;
const HTML_HEAD1 = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>%TITLE%</title>';
const HTML_HEAD2 = `</head><body><script${AS_MODULE ? ' type="module"' : ''}>`;
const HTML_FOOT  = (AS_MODULE ? ENTRY_CODE : '') + '</script></body></html>';
const INJECTION  = 'injection.mjs';
const EXP_EOL    = '\r\n';

export default class Exporter {

	#userCodeOffset = 0;

	constructor() {
	}

	getUserCodeOffset() {
		return this.#userCodeOffset;
	}

	async exportAsLibrary(code: string, baseDir: FsaPath | null, destDir: FsaPath, nameSpace: string, codeStructure: { fns: string[] }, doIncludeUseLib: boolean = false) {
		return exportAsLibrary(code, baseDir, destDir, nameSpace, codeStructure, doIncludeUseLib);
	}

	async exportAsWebPage(code: string, srcPath: FsaPath | null, destDir: FsaPath, injection = false, mode: ''|'url'|'pack'): Promise<[boolean, FsaPath]> {
		const decs = extractDeclarations(code);
		const libs = [];

		if (injection) {
			const url = await this.#getLocalLibraryUrl(destDir, INJECTION, mode);
			// console.log('exportAsWebPage1');
			// console.log(url);
			if (!url) return [false, new FsaPath(null, INJECTION)];
			libs.push(url);
		}
		if (srcPath) {
			const baseDir = srcPath.parent();
			for (let [lib, ns] of decs) {
				if (lib.startsWith('http')) {
					libs.push(lib);
				} else {
					let url;
					if (null === ns) {
						url = await this.#getNeedLibraryUrl(lib, destDir, baseDir.join(lib), mode);
					} else {
						url = await this.#getUseLibraryUrl(lib, destDir, baseDir.join(lib), ns, mode);
					}
					// console.log('exportAsWebPage2');
					// console.log(url);
					if (!url) return [false, new FsaPath(null, lib)];
					libs.push(url);
				}
			}
		} else {
			for (let [lib, ns] of decs) {
				if (lib.startsWith('http')) {
					libs.push(lib);
				} else {
					return [false, new FsaPath(null, lib)];
				}
			}
		}
		const title = srcPath ? this.#getDocumentTitle(srcPath) : '';
		return this.#writeExportedFile(code, title, destDir, libs);
	}

	async #getLocalLibraryUrl(destDir: FsaPath, lib: string, mode: ''|'url'|'pack') {
		if ('pack' === mode) {
			const res  = await fetch(lib);
			const blob = await res.blob();
			const [ret, ] = await FsaPath.fileToDataUrl(blob);
			return ret;
		} else if ('url' === mode || '' === mode) {
			const res  = await fetch(lib);
			const lc = await res.text();
			const to   = destDir.join(lib);
			const r =  await to.writeFile(lc);
			if (r) {
				return await to.toObjectUrl();
			}
			return null;
		// } else {
		// 	const temp = new FsaPath(null, new URL(import.meta.url).pathname).parent();
		// 	const from = temp.join(lib);
		// 	const to   = destDir.join(lib);
		// 	await this.#fsa.copyFile(from, to);
		// 	return await this.#fsa.filePathToObjectUrl(to);
		}
	}

	async #getUseLibraryUrl(lib: string, destDir: FsaPath, srcFile: FsaPath, ns: string, mode: ''|'url'|'pack') {
		if ('pack' === mode) {
			const lc = await readAsLibrary(srcFile, ns);
			if (lc) {
				const [ret, ] = await FsaPath.fileToDataUrl(new Blob([lc]));
				return ret;
			}
			return null;
		}
		const destFile = destDir.join(srcFile.withSuffix('.lib.js'));
		const c = await readAsLibrary(srcFile, ns);
		const res = c ? await destFile.writeFile(c) : false;
		if (!res) {
			return null;
		}
		if ('url' === mode) {
			return await destFile.toObjectUrl();
		}
		return lib;
	}

	async #getNeedLibraryUrl(lib: string, destDir: FsaPath, srcFile: FsaPath, mode: ''|'url'|'pack') {
		if ('pack' === mode) {
			return await srcFile.toDataUrl();
		}
		const destFile = destDir.join(lib.split(/\/|\\/).map(e => ((e === '..') ? '_' : e)).join('/'));
		const res = await srcFile.copyFile(destFile);
		if (!res) {
			return null;
		}
		if ('url' === mode) {
			return await destFile.toObjectUrl();
		}
		return lib;
	}

	async #writeExportedFile(code: string, title: string, destDir: FsaPath, libs: string[]): Promise<[boolean, FsaPath]> {
		const ls = code.split('\n').map(l => l.trimEnd()).join(EXP_EOL);

		const head = HTML_HEAD1.replace('%TITLE%', title);
		const tags = libs.map(e => `<script src="${e}"></script>`).join('');
		const cont = [head, tags, HTML_HEAD2, ls, HTML_FOOT].join('');

		this.#userCodeOffset = HTML_HEAD1.length + tags.length + HTML_HEAD2.length;

		const dest = destDir.join('index.html');
		const res  = await dest.writeFile(cont);
		return [res, dest];
	}

	#getDocumentTitle(srcFile: FsaPath) {
		let title = 'Croqujs';
		if (srcFile) {
			title = srcFile.stem();
			title = title.charAt(0).toUpperCase() + title.slice(1);
		}
		return title;
	}


	// -------------------------------------------------------------------------


	async copyLibraryOfTemplate(code: string, tempFile: FsaPath, destDir: FsaPath) {
		const decs = extractDeclarations(code);
		const baseDir   = tempFile.parent();

		for (let [lib, ns] of decs) {
			if (lib.startsWith('http')) {
				continue;
			}
			if (ns) {
				const c = await readAsLibrary(baseDir.join(lib), ns);
				const destFile = destDir.join(lib).withSuffix('.lib.js');
				const res = c ? await destFile.writeFile(c) : false;
				if (!res) {
					return [false, lib];
				}
			} else {
				const destFile = destDir.join(lib.split(/\/|\\/).map(e => ((e === '..') ? '_' : e)).join('/'));
				if (! await destFile.exists()) {
					const res = await baseDir.join(lib).copyFile(destFile);
					if (!res) {
						return [false, lib];
					}
				}
			}
		}
		return [true];
	}

}
