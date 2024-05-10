/**
 * Exporter
 *
 * @author Takuto Yanagida
 * @version 2024-05-09
 */

import { FileSystem, Path } from './fsa.js';
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

	#fsa: FileSystem;
	#userCodeOffset = 0;

	constructor(fsa: FileSystem) {
		this.#fsa = fsa;
	}

	getUserCodeOffset() {
		return this.#userCodeOffset;
	}

	async exportAsLibrary(code: string, baseDir: Path, destDir: Path, nameSpace: string, codeStructure: { fns: string[] }, doIncludeUseLib: boolean = false) {
		return exportAsLibrary(code, this.#fsa, baseDir, destDir, nameSpace, codeStructure, doIncludeUseLib);
	}

	async exportAsWebPage(code: string, srcPath: Path, destDir: Path, injection = false, mode: ''|'url'|'pack'): Promise<[boolean, Path]> {
		const decs = extractDeclarations(code);
		const libs = [];

		const baseDir = srcPath.parent();

		if (injection) {
			const url = await this.#getLocalLibraryUrl(destDir, INJECTION, mode);
			if (!url) return [false, new Path(INJECTION)];
			libs.push(url);
		}
		if (srcPath) {
			for (let [lib, ns] of decs) {
				if (lib.startsWith('http')) {
					libs.push(lib);
				} else {
					let url;
					if (null === ns) {
						url = await this.#getNeedLibraryUrl(lib, destDir, baseDir.concat(lib), mode);
					} else {
						url = await this.#getUseLibraryUrl(lib, destDir, baseDir.concat(lib), ns, mode);
					}
					if (!url) return [false, new Path(lib)];
					libs.push(url);
				}
			}
		} else {
			for (let [lib, ns] of decs) {
				if (lib.startsWith('http')) {
					libs.push(lib);
				} else {
					return [false, new Path(lib)];
				}
			}
		}
		const title = this.#getDocumentTitle(srcPath);
		return this.#writeExportedFile(code, title, destDir, libs);
	}

	async #getLocalLibraryUrl(destDir: Path, lib: string, mode: ''|'url'|'pack') {
		if ('pack' === mode) {
			const res  = await fetch(lib);
			const blob = await res.blob();
			return await this.#fsa.fileToDataUrl(blob);
		} else if ('url' === mode) {
			const res  = await fetch(lib);
			const lc = await res.text();
			const to   = destDir.concat(lib);
			if ( await this.#fsa.writeFile(to, lc) ) {
				return await this.#fsa.filePathToObjectUrl(to);
			}
			return null;
		} else {
			const temp = new Path(new URL(import.meta.url).pathname).parent();
			const from = temp.concat(lib);
			const to   = destDir.concat(lib);
			await this.#fsa.copyFile(from, to);
			return await this.#fsa.filePathToObjectUrl(to);
		}
	}

	async #getUseLibraryUrl(lib: string, destDir: Path, srcFile: Path, ns: string, mode: ''|'url'|'pack') {
		if ('pack' === mode) {
			const lc = await readAsLibrary(this.#fsa, srcFile, ns);
			return lc ? await this.#fsa.fileToDataUrl(new Blob([lc], { type: 'text/javascript' })) : null;
		}
		const destFile = destDir.concat(srcFile.parent().concat(srcFile.baseName(srcFile.extName()) + '.lib.js'));
		const c = await readAsLibrary(this.#fsa, srcFile, ns);
		const res = c ? await this.#fsa.writeFile(destFile, c) : false;
		if (!res) {
			return null;
		}
		if ('url' === mode) {
			return await this.#fsa.filePathToObjectUrl(destFile);
		}
		return lib;
	}

	async #getNeedLibraryUrl(lib: string, destDir: Path, srcFile: Path, mode: ''|'url'|'pack') {
		if ('pack' === mode) {
			return await this.#fsa.filePathToDataUrl(srcFile);
		}
		const destFile = destDir.concat(lib.split(/\/|\\/).map(e => ((e === '..') ? '_' : e)).join('/'));
		const res = await this.#fsa.copyFile(srcFile, destFile);
		if (!res) {
			return null;
		}
		if ('url' === mode) {
			return await this.#fsa.filePathToObjectUrl(destFile);
		}
		return lib;
	}

	async #writeExportedFile(code: string, title: string, destDir: Path, libs: string[]): Promise<[boolean, Path]> {
		const ls = code.split('\n').map(l => l.trimEnd()).join(EXP_EOL);

		const head = HTML_HEAD1.replace('%TITLE%', title);
		const tags = libs.map(e => `<script src="${e}"></script>`).join('');
		const cont = [head, tags, HTML_HEAD2, ls, HTML_FOOT].join('');

		this.#userCodeOffset = HTML_HEAD1.length + tags.length + HTML_HEAD2.length;

		const dest = destDir.concat('index.html');
		const res  = await this.#fsa.writeFile(dest, cont);
		return [res, dest];
	}

	#getDocumentTitle(srcFile: Path) {
		let title = 'Croqujs';
		if (srcFile) {
			title = srcFile.baseName('.js');
			title = title.charAt(0).toUpperCase() + title.slice(1);
		}
		return title;
	}


	// -------------------------------------------------------------------------


	async copyLibraryOfTemplate(code: string, tempFile: Path, destDir: Path) {
		const decs = extractDeclarations(code);
		const baseDir   = tempFile.parent();

		for (let [lib, ns] of decs) {
			if (lib.startsWith('http')) {
				continue;
			}
			if (ns) {
				const libPath = new Path(lib);
				const c = await readAsLibrary(this.#fsa, baseDir.concat(lib), ns);
				const destFile = destDir.concat(libPath.parent()).concat(libPath.baseName(libPath.extName()) + '.lib.js');
				const res = c ? await this.#fsa.writeFile(destFile, c) : false;
				if (!res) {
					return [false, lib];
				}
			} else {
				const destFile = destDir.concat(lib.split(/\/|\\/).map(e => ((e === '..') ? '_' : e)).join('/'));
				if (! await this.#fsa.exists(destFile)) {
					const res = await this.#fsa.copyFile(baseDir.concat(lib), destFile);
					if (!res) {
						return [false, lib];
					}
				}
			}
		}
		return [true];
	}

}
