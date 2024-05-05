/**
 * Exporter
 *
 * @author Takuto Yanagida
 * @version 2024-05-05
 */

import Fsa from './lib/fsa.js';
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

	#fsa: Fsa;
	#userCodeOffset = 0;

	constructor(fsa: Fsa) {
		this.#fsa = fsa;
	}

	getUserCodeOffset() {
		return this.#userCodeOffset;
	}

	async exportAsLibrary(code: string, filePath: string, nameSpace: string, codeStructure: { fns: string[] }, doIncludeUseLib: boolean = false) {
		return exportAsLibrary(code, this.#fsa, filePath, nameSpace, codeStructure, doIncludeUseLib);
	}

	async exportAsWebPage(code: string, filePath: string, dstDirPath: string, injection = false, mode: ''|'url'|'pack'): Promise<[boolean, string]> {
		const decs = extractDeclarations(code);
		const libs = [];

		const srcDirPath = Fsa.dirName(filePath);

		if (injection) {
			const url = await this.#getLocalLibraryUrl(dstDirPath, INJECTION, mode);
			if (!url) return [false, INJECTION];
			libs.push(url);
		}
		if (filePath) {
			for (let [lib, ns] of decs) {
				if (lib.startsWith('http')) {
					libs.push(lib);
				} else {
					let url;
					if (null === ns) {
						url = await this.#getNeedLibraryUrl(dstDirPath, srcDirPath, lib, mode);
					} else {
						url = await this.#getUseLibraryUrl(dstDirPath, srcDirPath, lib, ns, mode);
					}
					if (!url) return [false, lib];
					libs.push(url);
				}
			}
		} else {
			for (let [lib, ns] of decs) {
				if (lib.startsWith('http')) {
					libs.push(lib);
				} else {
					return [false, lib];
				}
			}
		}
		const title = this.#getDocumentTitle(filePath);
		return this.#writeExportedFile(code, title, dstDirPath, libs);
	}

	async #getLocalLibraryUrl(destDirPath: string, lib: string, mode: ''|'url'|'pack') {
		if ('pack' === mode) {
			const res  = await fetch(lib);
			const blob = await res.blob();
			return await this.#fsa.fileToDataUrl(blob);
		} else if ('url' === mode) {
			const res  = await fetch(lib);
			const lc = await res.text();
			const to   = Fsa.join(destDirPath, lib);
			if ( await this.#fsa.writeFile(to, lc) ) {
				return await this.#fsa.filePathToUrl(to);
			}
			return null;
		} else {
			const temp = Fsa.dirName(new URL(import.meta.url).pathname);
			const from = Fsa.join((':' === temp[2] ? temp.substring(1) : temp), lib);
			const to   = Fsa.join(destDirPath, lib);
			await this.#fsa.copyFile(from, to);
			return await this.#fsa.filePathToUrl(to);
		}
	}

	async #getUseLibraryUrl(dstDirPath: string, srcDirPath: string, lib: string, ns: string, mode: ''|'url'|'pack') {
		const srcPath = Fsa.join(srcDirPath, lib);
		if ('pack' === mode) {
			const lc = await readAsLibrary(this.#fsa, srcPath, ns);
			return lc ? await this.#fsa.fileToDataUrl(new Blob([lc], { type: 'text/javascript' })) : null;
		}
		const dstFn = Fsa.baseName(lib, Fsa.extName(lib)) + '.lib.js';
		const dstPath = Fsa.join(dstDirPath, dstFn);
		const c = await readAsLibrary(this.#fsa, srcPath, ns);
		const res = c ? await this.#fsa.writeFile(dstPath, c) : false;
		if (!res) {
			return null;
		}
		if ('url' === mode) {
			return await this.#fsa.filePathToUrl(dstPath);
		}
		return lib;
	}

	async #getNeedLibraryUrl(dstDirPath: string, srcDirPath: string, lib: string, mode: ''|'url'|'pack') {
		const srcPath = Fsa.join(srcDirPath, lib);
		if ('pack' === mode) {
			return await this.#fsa.filePathToDataUrl(srcPath);
		}
		const dstFn = lib.split(/\/|\\/).map(e => ((e === '..') ? '_' : e)).join(Fsa.sep);
		const dstPath = Fsa.join(dstDirPath, dstFn);
		const res = await this.#fsa.copyFile(srcPath, dstPath);
		if (!res) {
			return null;
		}
		if ('url' === mode) {
			return await this.#fsa.filePathToUrl(dstPath);
		}
		return lib;
	}

	async #writeExportedFile(code: string, title: string, dstDirPath: string, libs: string[]): Promise<[boolean, string]> {
		const ls = code.split('\n').map(l => l.trimEnd()).join(EXP_EOL);

		const head = HTML_HEAD1.replace('%TITLE%', title);
		const tags = libs.map(e => `<script src="${e}"></script>`).join('');
		const cont = [head, tags, HTML_HEAD2, ls, HTML_FOOT].join('');

		this.#userCodeOffset = HTML_HEAD1.length + tags.length + HTML_HEAD2.length;

		const dest = Fsa.join(dstDirPath, 'index.html');
		const res  = await this.#fsa.writeFile(dest, cont);
		return [res, dest];
	}

	#getDocumentTitle(filePath: string) {
		let title = 'Croqujs';
		if (filePath) {
			title = Fsa.baseName(filePath, '.js');
			title = title.charAt(0).toUpperCase() + title.slice(1);
		}
		return title;
	}


	// -------------------------------------------------------------------------


	async copyLibraryOfTemplate(code: string, tempFilePath: string, dirPath: string) {
		const decs = extractDeclarations(code);
		const bp   = Fsa.dirName(tempFilePath);

		for (let [p, ns] of decs) {
			if (p.startsWith('http')) {
				continue;
			}
			if (ns) {
				const dstFn = Fsa.baseName(p, Fsa.extName(p)) + '.lib.js';
				const c = await readAsLibrary(this.#fsa, Fsa.join(bp, p), ns);
				const res = c ? await this.#fsa.writeFile(Fsa.join(dirPath, dstFn), c) : false;
				if (!res) {
					return [false, p];
				}
			} else {
				const dstFn = p.split(/\/|\\/).map(e => ((e === '..') ? '_' : e)).join(Fsa.sep);
				const dstPath = Fsa.join(dirPath, dstFn);
				if (! await this.#fsa.exists(dstPath)) {
					const res = await this.#fsa.copyFile(Fsa.join(bp, p), dstPath);
					if (!res) {
						return [false, p];
					}
				}
			}
		}
		return [true];
	}

}
