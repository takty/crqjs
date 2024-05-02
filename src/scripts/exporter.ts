/**
 * Exporter
 *
 * @author Takuto Yanagida
 * @version 2024-05-02
 */

import Fsa from './lib/fsa.js';
import extractFunction from './lib/function-extractor.js';
import extractDeclarations from './custom-declaration.js';

const AS_MODULE = true;

const ENTRY_CODE = `{'function'==typeof setup&&setup();}`;
const HTML_HEAD1 = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>%TITLE%</title>';
const HTML_HEAD2 = `</head><body><script${AS_MODULE ? ' type="module"' : ''}>`;
const HTML_FOOT  = (AS_MODULE ? ENTRY_CODE : '') + '</script></body>';
const DEF_DIR    = 'def';
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

	async checkLibraryReadable(code: string, filePath: string) {
		const ls   = code.split('\n').map(l => l.trimEnd());
		const decs = extractDeclarations(ls);
		const bp   = (filePath) ? this.#fsa.dirName(filePath) : null;

		for (let [p, ns] of decs) {
			if (!p.startsWith('http')) {
				let cont = null;
				if (bp) {
					cont = await this.#fsa.readFile(this.#fsa.join(bp, p));
				}
				if (cont === null) {
					return p;  // Error
				}
			}
		}
		return true;
	}

	async loadDefFile(code: string, filePath: string|null = null, defExt: string = '.json') {
		const makeDefPath = (path: string): string => {
			const dir = this.#fsa.dirName(path);
			const ext = this.#fsa.extName(path);
			const bn  = this.#fsa.baseName(path, ext);
			return this.#fsa.join(dir, DEF_DIR, `${bn}${defExt}`);
		};
		const ls   = code.split('\n').map(l => l.trimEnd());
		const decs = extractDeclarations(ls);
		const bp   = filePath ? this.#fsa.dirName(filePath) : null;
		const ret  = [];

		for (let [p, ns] of decs) {
			if (!p.startsWith('http')) {
				if (!bp) {
					continue;
				}
				const path = this.#fsa.join(bp, p);
				const cont = await this.#fsa.readFile(path);
				if (cont === null) {
					continue;  // Error
				}
				const dp  = makeDefPath(path);
				const def = await this.#fsa.readFile(dp);
				if (def === null) {
					continue;
				}
				ret.push(def);
			}
		}
		return ret;
	}

	async exportAsLibrary(code: string, filePath: string, nameSpace: string, codeStructure: { fns: string[] }, doIncludeUseLib: boolean = false) {
		let inc = '';
		const symbols = codeStructure.fns.slice(0);

		if (doIncludeUseLib) {
			const ls   = code.split('\n').map(l => l.trimEnd());
			const decs = extractDeclarations(ls);
			const bp   = this.#fsa.dirName(filePath);
			const lcs  = [];

			for (let [p, ns] of decs) {
				if (!ns) continue;
				const lc = await this.#readAsLibraryCode(this.#fsa.join(bp, p), ns, 1);
				if (!lc) {
					return [false, p];
				}
				lcs.push(lc);
				symbols.push(ns);
			}
			inc = lcs.join(EXP_EOL);
		}
		const lc  = this.#createLibraryCode(code, symbols, nameSpace, 0, inc);
		const res = await this.#fsa.writeFile(filePath, lc);
		return [res, filePath];
	}

	async exportAsWebPage(code: string, filePath: string, dirPath: string, injection = false, packed = false) {
		const ls   = code.split('\n').map(l => l.trimEnd());
		const decs = extractDeclarations(ls);
		const libs = [];

		if (injection) {
			const url = await this.#getLocalLibraryUrl(dirPath, INJECTION, packed);
			if (null !== url) {
				libs.push(url);
			}
		}
		if (filePath) {
			for (let [p, ns] of decs) {
				if (ns) {
					if (p.startsWith('http')) {
						return [false, p];
					} else {
						const url = await this.#getUseLibraryUrl(filePath, dirPath, p, ns, packed);
						if (!url) return [false, p];
						libs.push(url);
					}
				} else {
					if (p.startsWith('http')) {
						libs.push(p);
					} else {
						const url = await this.#getNeedLibraryUrl(filePath, dirPath, p, packed);
						if (!url) return [false, p];
						libs.push(url);
					}
				}
			}
		} else {
			for (let [p, ns] of decs) {
				if (ns) {
					return [false, p];
				} else {
					if (p.startsWith('http')) {
						libs.push(p);
					} else {
						return [false, p];
					}
				}
			}
		}
		return this.#writeExportedFile(ls, filePath, dirPath, libs);
	}

	async #getLocalLibraryUrl(dirPath: string, lib: string, packed: boolean) {
		if (packed) {
			const res  = await fetch(lib);
			const blob = await res.blob();
			return await this.#fsa.fileToUrl(blob);
		} else {
			const temp = this.#fsa.dirName(new URL(import.meta.url).pathname);
			const from = this.#fsa.join((':' === temp[2] ? temp.substring(1) : temp), lib);
			const to   = this.#fsa.join(dirPath, lib);
			await this.#fsa.copyFile(from, to);
			return await this.#fsa.filePathToUrl(to);
		}
	}

	async #getUseLibraryUrl(filePath: string, dirPath: string, lib: string, ns: string, packed: boolean) {
		const bp = this.#fsa.dirName(filePath);
		if (packed) {
			const lc = await this.#readAsLibraryCode(this.#fsa.join(bp, lib), ns);
			if (!lc) {
				return null;
			}
			return await this.#fsa.fileToUrl(new Blob([lc], { type: 'text/javascript' }));
		} else {
			const destFn = this.#fsa.baseName(lib, this.#fsa.extName(lib)) + '.lib.js';
			const res    = await this.#writeAsLibrary(this.#fsa.join(bp, lib), ns, this.#fsa.join(dirPath, destFn));
			if (!res) {
				return null;
			}
			return await this.#fsa.filePathToUrl(this.#fsa.join(dirPath, destFn));
		}
	}

	async #getNeedLibraryUrl(filePath: string, dirPath: string, p: string, packed: boolean) {
		const bp = this.#fsa.dirName(filePath);
		if (packed) {
			const url = await this.#fsa.filePathToDataUrl(this.#fsa.join(bp, p));
			if (typeof url !== 'string') {
				return null;
			}
			return url;
		} else {
			const destFn = p.split(/\/|\\/).map(e => ((e === '..') ? '_' : e)).join(this.#fsa.sep);
			const res    = await this.#fsa.copyFile(this.#fsa.join(bp, p), this.#fsa.join(dirPath, destFn));
			if (!res) {
				return null;
			}
			return p;
		}
	}

	async #writeExportedFile(ls: string[], filePath: string, dirPath: string, libs: string[]) {
		let title = 'Croqujs';
		if (filePath) {
			title = this.#fsa.baseName(filePath, '.js');
			title = title.charAt(0).toUpperCase() + title.slice(1);
		}
		const head = HTML_HEAD1.replace('%TITLE%', title);
		const tags = libs.map(e => `<script src="${e}"></script>`).join('');
		const cont = [head, tags, HTML_HEAD2, ls.join(EXP_EOL), HTML_FOOT].join('');

		this.#userCodeOffset = HTML_HEAD1.length + tags.length + HTML_HEAD2.length;

		const dest = this.#fsa.join(dirPath, 'index.html');
		const res  = await this.#fsa.writeFile(dest, cont);
		return [res, dest];
	}


	// -------------------------------------------------------------------------


	async copyLibraryOfTemplate(code: string, tempFilePath: string, dirPath: string) {
		const ls   = code.split('\n').map(l => l.trimEnd());
		const decs = extractDeclarations(ls);
		const bp   = this.#fsa.dirName(tempFilePath);

		for (let [p, ns] of decs) {
			if (ns) {
				if (p.startsWith('http')) {
					return [false, p];
				}
				const destFn = this.#fsa.baseName(p, this.#fsa.extName(p)) + '.lib.js';
				const res = await this.#writeAsLibrary(this.#fsa.join(bp, p), ns, this.#fsa.join(dirPath, destFn));
				if (!res) {
					return [false, p];
				}
			} else {
				if (p.startsWith('http')) {
					continue;
				}
				const destFn = p.split(/\/|\\/).map(e => ((e === '..') ? '_' : e)).join(this.#fsa.sep);
				const destPath = this.#fsa.join(dirPath, destFn);
				if (! await this.#fsa.exists(destPath)) {
					const res = await this.#fsa.copyFile(this.#fsa.join(bp, p), destPath);
					if (!res) {
						return [false, p];
					}
				}
			}
		}
		return [true];
	}


	// -------------------------------------------------------------------------


	async #writeAsLibrary(origPath: string, nameSpace: string, destPath: string) {
		const lc = await this.#readAsLibraryCode(origPath, nameSpace);
		if (!lc) {
			return false;
		}
		return await this.#fsa.writeFile(destPath, lc);
	}

	async #readAsLibraryCode(path: string, nameSpace: string, indent = 0) {
		const code = await this.#fsa.readFile(path);
		if (null === code) {
			return null;
		}
		const cs = extractFunction(code);
		return this.#createLibraryCode(code, cs.fns, nameSpace, indent);
	}

	#createLibraryCode(code: string, exportedSymbols: string[], nameSpace: string, indent = 0, inc = '') {
		const ls  = code.split('\n').map(l => l.trimEnd());
		const ess = exportedSymbols.join(', ');
		const tab = '\t'.repeat(indent);

		const bgn = `${tab}const ${nameSpace} = (() => {`;
		const src = ls.map(l => `${tab}\t${l.replace(/\s+$/, '')}`).join(EXP_EOL);
		const ret = `${tab}\treturn { ${ess} };`;
		const end = `${tab}})();`;

		if (inc.length) {
			return [bgn, inc, src, ret, end].join(EXP_EOL);
		} else {
			return [bgn, src, ret, end].join(EXP_EOL);
		}
	}

}
