/**
 * Exporter
 *
 * @author Takuto Yanagida
 * @version 2024-05-05
 */

import Fsa from './fsa.js';
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

	async exportAsLibrary(code: string, filePs: string[], nameSpace: string, codeStructure: { fns: string[] }, doIncludeUseLib: boolean = false) {
		return exportAsLibrary(code, this.#fsa, filePs, nameSpace, codeStructure, doIncludeUseLib);
	}

	async exportAsWebPage(code: string, filePs: string[], dstDirPs: string[], injection = false, mode: ''|'url'|'pack'): Promise<[boolean, string[]]> {
		const decs = extractDeclarations(code);
		const libs = [];

		const srcDirPs = Fsa.dirName(filePs);

		if (injection) {
			const url = await this.#getLocalLibraryUrl(dstDirPs, INJECTION, mode);
			if (!url) return [false, Fsa.pathToPs(INJECTION)];
			libs.push(url);
		}
		if (filePs) {
			for (let [lib, ns] of decs) {
				if (lib.startsWith('http')) {
					libs.push(lib);
				} else {
					const libPs = Fsa.pathToPs(lib);

					let url;
					if (null === ns) {
						url = await this.#getNeedLibraryUrl(lib, dstDirPs, [...srcDirPs, ...libPs], mode);
					} else {
						url = await this.#getUseLibraryUrl(lib, dstDirPs, [...srcDirPs, ...libPs], ns, mode);
					}
					if (!url) return [false, libPs];
					libs.push(url);
				}
			}
		} else {
			for (let [lib, ns] of decs) {
				if (lib.startsWith('http')) {
					libs.push(lib);
				} else {
					return [false, Fsa.pathToPs(lib)];
				}
			}
		}
		const title = this.#getDocumentTitle(filePs);
		return this.#writeExportedFile(code, title, dstDirPs, libs);
	}

	async #getLocalLibraryUrl(destDirPs: string[], lib: string, mode: ''|'url'|'pack') {
		if ('pack' === mode) {
			const res  = await fetch(lib);
			const blob = await res.blob();
			return await this.#fsa.fileToDataUrl(blob);
		} else if ('url' === mode) {
			const res  = await fetch(lib);
			const lc = await res.text();
			const to   = [...destDirPs, lib];
			if ( await this.#fsa.writeFile(to, lc) ) {
				return await this.#fsa.filePsToObjectUrl(to);
			}
			return null;
		} else {
			const temp = Fsa.dirName(Fsa.pathToPs(new URL(import.meta.url).pathname));
			const from = [...temp, lib];
			const to   = [...destDirPs, lib];
			await this.#fsa.copyFile(from, to);
			return await this.#fsa.filePsToObjectUrl(to);
		}
	}

	async #getUseLibraryUrl(lib: string, dstDirPs: string[], srcPs: string[], ns: string, mode: ''|'url'|'pack') {
		if ('pack' === mode) {
			const lc = await readAsLibrary(this.#fsa, srcPs, ns);
			return lc ? await this.#fsa.fileToDataUrl(new Blob([lc], { type: 'text/javascript' })) : null;
		}
		const temp = [...Fsa.dirName(srcPs), Fsa.baseName(srcPs, Fsa.extName(srcPs)) + '.lib.js'];
		const dstPs = [...dstDirPs, ...temp];
		const c = await readAsLibrary(this.#fsa, srcPs, ns);
		const res = c ? await this.#fsa.writeFile(dstPs, c) : false;
		if (!res) {
			return null;
		}
		if ('url' === mode) {
			return await this.#fsa.filePsToObjectUrl(dstPs);
		}
		return lib;
	}

	async #getNeedLibraryUrl(lib: string, dstDirPs: string[], srcPs: string[], mode: ''|'url'|'pack') {
		if ('pack' === mode) {
			return await this.#fsa.filePsToDataUrl(srcPs);
		}
		// const dstFn = lib.split(/\/|\\/).map(e => ((e === '..') ? '_' : e)).join(Fsa.sep);
		const dstPs = [...dstDirPs, ...srcPs];
		const res = await this.#fsa.copyFile(srcPs, dstPs);
		if (!res) {
			return null;
		}
		if ('url' === mode) {
			return await this.#fsa.filePsToObjectUrl(dstPs);
		}
		return lib;
	}

	async #writeExportedFile(code: string, title: string, dstDirPs: string[], libs: string[]): Promise<[boolean, string[]]> {
		const ls = code.split('\n').map(l => l.trimEnd()).join(EXP_EOL);

		const head = HTML_HEAD1.replace('%TITLE%', title);
		const tags = libs.map(e => `<script src="${e}"></script>`).join('');
		const cont = [head, tags, HTML_HEAD2, ls, HTML_FOOT].join('');

		this.#userCodeOffset = HTML_HEAD1.length + tags.length + HTML_HEAD2.length;

		const dest = [...dstDirPs, 'index.html'];
		const res  = await this.#fsa.writeFile(dest, cont);
		return [res, dest];
	}

	#getDocumentTitle(filePs: string[]) {
		let title = 'Croqujs';
		if (filePs) {
			title = Fsa.baseName(filePs, '.js');
			title = title.charAt(0).toUpperCase() + title.slice(1);
		}
		return title;
	}


	// -------------------------------------------------------------------------


	async copyLibraryOfTemplate(code: string, tempFilePs: string[], dirPs: string[]) {
		const decs = extractDeclarations(code);
		const bp   = Fsa.dirName(tempFilePs);

		for (let [lib, ns] of decs) {
			if (lib.startsWith('http')) {
				continue;
			}
			const libPs = Fsa.pathToPs(lib);
			if (ns) {
				const c = await readAsLibrary(this.#fsa, [...bp, ...libPs], ns);
				const dstFn = [...dirPs, ...Fsa.dirName(libPs), Fsa.baseName(libPs, Fsa.extName(libPs)) + '.lib.js'];
				const res = c ? await this.#fsa.writeFile(dstFn, c) : false;
				if (!res) {
					return [false, lib];
				}
			} else {
				const dstFn = lib.split(/\/|\\/).map(e => ((e === '..') ? '_' : e));
				const dstPs = [...dirPs, ...dstFn];
				if (! await this.#fsa.exists(dstPs)) {
					const res = await this.#fsa.copyFile([...bp, ...libPs], dstPs);
					if (!res) {
						return [false, lib];
					}
				}
			}
		}
		return [true];
	}

}
