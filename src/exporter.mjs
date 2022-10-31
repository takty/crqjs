/**
 * Exporter
 *
 * @author Takuto Yanagida
 * @version 2022-10-31
 */

import analyze from './analyzer.mjs';

const AS_MODULE = true;

const ENTRY_CODE = `{'function'==typeof setup&&setup();}`;
const HTML_HEAD1 = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>%TITLE%</title>';
const HTML_HEAD2 = `</head><body><script${AS_MODULE ? ' type="module"' : ''}>`;
const HTML_FOOT  = (AS_MODULE ? ENTRY_CODE : '') + '</script></body>';
const DEF_DIR    = 'def';
const INJECTION  = 'injection.mjs';
const EXP_EOL    = '\r\n';

class Exporter {

	#fs             = null;
	#userCodeOffset = 0;

	constructor(fs) {
		this.#fs = fs;
	}

	getUserCodeOffset() {
		return this.#userCodeOffset;
	}

	async checkLibraryReadable(code, filePath) {
		const ls   = code.split('\n').map(l => l.trimEnd());
		const decs = this.#extractDeclarations(ls);
		const bp   = (filePath) ? this.#fs.dirName(filePath) : null;

		for (let [p, ns] of decs) {
			if (!p.startsWith('http')) {
				let cont = null;
				if (bp) {
					cont = await this.#fs.readFile(this.#fs.join(bp, p));
				}
				if (cont === null) {
					return p;  // Error
				}
			}
		}
		return true;
	}

	async loadDefFile(code, filePath = null, defExt = '.json') {
		const ls   = code.split('\n').map(l => l.trimEnd());
		const decs = this.#extractDeclarations(ls);
		const bp   = filePath ? this.#fs.dirName(filePath) : null;
		const ret  = [];

		for (let [p, ns] of decs) {
			if (!p.startsWith('http')) {
				if (!bp) {
					continue;
				}
				const path = this.#fs.join(bp, p);
				const cont = await this.#fs.readFile(path);
				if (cont === null) {
					continue;  // Error
				}
				const dp  = makeDefPath(path);
				const def = await this.#fs.readFile(dp);
				if (def === null) {
					continue;
				}
				ret.push(def);
			}
		}
		return ret;

		function makeDefPath(path) {
			const dir = this.#fs.dirName(path);
			const ext = this.#fs.extName(path);
			const bn  = this.#fs.baseName(path, ext);
			return this.#fs.join(dir, DEF_DIR, `${bn}${defExt}`);
		}
	}

	async exportAsLibrary(code, filePath, nameSpace, codeStructure, doIncludeUseLib = false) {
		let inc = '';
		const symbols = codeStructure.fnNames.slice(0);

		if (doIncludeUseLib) {
			const ls   = code.split('\n').map(l => l.trimEnd());
			const decs = this.#extractDeclarations(ls);
			const bp   = this.#fs.dirName(filePath);
			const lcs  = [];

			for (let [p, ns] of decs) {
				if (!ns) continue;
				const lc = await this.#readAsLibraryCode(this.#fs.join(bp, p), ns, 1);
				if (!lc) {
					return [false, p];
				}
				lcs.push(lc);
				symbols.push(ns);
			}
			inc = lcs.join(EXP_EOL);
		}
		const lc  = this.#createLibraryCode(code, symbols, nameSpace, 0, inc);
		const res = await this.#fs.writeFile(filePath, lc);
		return [res, filePath];
	}

	async exportAsWebPage(code, filePath, dirPath, injection = false, packed = false) {
		const ls   = code.split('\n').map(l => l.trimEnd());
		const decs = this.#extractDeclarations(ls);
		const libs = [];

		if (injection) {
			const url = await this.#getLocalLibraryUrl(dirPath, INJECTION, packed);
			libs.push(url);
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

	async #getLocalLibraryUrl(dirPath, lib, packed) {
		if (packed) {
			const res  = await fetch(lib);
			const blob = await res.blob();
			return await this.#fs.fileToUrl(blob);
		} else {
			const temp = this.#fs.dirName(new URL(import.meta.url).pathname);
			const from = this.#fs.join((':' === temp[2] ? temp.substring(1) : temp), lib);
			const to   = this.#fs.join(dirPath, lib);
			await this.#fs.copyFile(from, to);
			return await this.#fs.filePathToUrl(to, dirPath);
		}
	}

	async #getUseLibraryUrl(filePath, dirPath, lib, ns, packed) {
		const bp = this.#fs.dirName(filePath);
		if (packed) {
			const lc = await this.#readAsLibraryCode(this.#fs.join(bp, lib), ns);
			if (!lc) {
				return null;
			}
			return await this.#fs.fileToUrl(new Blob(lc, { type: 'text/javascript' }));
		} else {
			const destFn = this.#fs.baseName(lib, this.#fs.extName(lib)) + '.lib.js';
			const res    = await this.#writeAsLibrary(this.#fs.join(bp, lib), ns, this.#fs.join(dirPath, destFn));
			if (!res) {
				return null;
			}
			return await this.#fs.filePathToUrl(this.#fs.join(dirPath, destFn), dirPath);
		}
	}

	async #getNeedLibraryUrl(filePath, dirPath, p, packed) {
		const bp = this.#fs.dirName(filePath);
		if (packed) {
			const url = await this.#fs.filePathToDataUrl(this.#fs.join(bp, p));
			if (typeof url !== 'string') {
				return null;
			}
			return url;
		} else {
			const destFn = p.split(/\/|\\/).map(e => ((e === '..') ? '_' : e)).join(this.#fs.sep);
			const res    = await this.#fs.copyFile(this.#fs.join(bp, p), this.#fs.join(dirPath, destFn));
			if (!res) {
				return null;
			}
			return p;
		}
	}

	async #writeExportedFile(ls, filePath, dirPath, libs) {
		let title = 'Croqujs';
		if (filePath) {
			title = this.#fs.baseName(filePath, '.js');
			title = title.charAt(0).toUpperCase() + title.slice(1);
		}
		const head = HTML_HEAD1.replace('%TITLE%', title);
		const tags = libs.map(e => `<script src="${e}"></script>`).join('');
		const cont = [head, tags, HTML_HEAD2, ls.join(EXP_EOL), HTML_FOOT].join('');

		this.#userCodeOffset = HTML_HEAD1.length + tags.length + HTML_HEAD2.length;

		const dest = this.#fs.join(dirPath, 'index.html');
		const res  = await this.#fs.writeFile(dest, cont);
		return [res, dest];
	}


	// -------------------------------------------------------------------------


	async copyLibraryOfTemplate(code, tempFilePath, dirPath) {
		const ls   = code.split('\n').map(l => l.trimEnd());
		const decs = this.#extractDeclarations(ls);
		const bp   = this.#fs.dirName(tempFilePath);

		for (let [p, ns] of decs) {
			if (ns) {
				if (p.startsWith('http')) {
					return [false, p];
				}
				const destFn = this.#fs.baseName(p, this.#fs.extName(p)) + '.lib.js';
				const res = await this.#writeAsLibrary(this.#fs.join(bp, p), ns, this.#fs.join(dirPath, destFn));
				if (!res) {
					return [false, p];
				}
			} else {
				if (p.startsWith('http')) {
					continue;
				}
				const destFn = p.split(/\/|\\/).map(e => ((e === '..') ? '_' : e)).join(this.#fs.sep);
				const destPath = this.#fs.join(dirPath, destFn);
				if (! await this.#fs.exists(destPath)) {
					const res = await this.#fs.copyFile(this.#fs.join(bp, p), destPath);
					if (!res) {
						return [false, p];
					}
				}
			}
		}
		return [true];
	}


	// -------------------------------------------------------------------------


	#extractDeclarations(lines) {
		const USE = '@use', NEED = '@need', IMPORT = '@import', AS = 'as', EXT = '.js';
		const scs = lines.map(this.#parseSpecialComment).filter(sc => sc);
		const res = [];

		for (const [type, params] of scs) {
			const items = this.#splitSpaceSeparatedLine(params).map(this.#unwrapQuote);

			if (type === NEED || type === IMPORT) {
				for (let item of items) {
					if (item.indexOf(EXT) === -1) {
						item += EXT;
					}
					res.push([item, null]);
				}
			} else if (type === USE) {
				let last = null;
				for (let i = 0; i < items.length; i += 1) {
					let item = items[i];
					if (item === AS) {
						if (last !== null && i + 1 < items.length) {
							last[1] = items[i + 1];
							i += 1;
						}
					} else {
						if (!item.endsWith(EXT)) {
							item += EXT;
						}
						last = [item, ''];
						res.push(last);
					}
				}
				for (let r of res) {
					if (r[1] === '') {
						r[1] = this.#pathToLibName(r[0]);
					}
				}
			}
		}
		return res;
	}

	#parseSpecialComment(line) {
		const COMMENT = '//', SP_CHAR = '@';

		line = line.trim();
		if (!line.startsWith(COMMENT)) {
			return null;
		}
		line = line.substring(COMMENT.length).trim();

		if (SP_CHAR !== line[0]) {
			return null;
		}
		const pos = line.search(/\s/);
		if (-1 === pos) {
			return null;
		}
		const type = line.substring(0, pos);
		line = line.substring(pos).trim();
		if (line.endsWith(';')) {
			line = line.substring(0, line.length - 1).trim();
		}
		return [type, line];
	}

	#splitSpaceSeparatedLine(line) {
		const ret = [];
		let cur = '', inQt = '';

		for (let ch of line) {
			if ('' === inQt) {
				if ('"' === ch || "'" === ch) {
					inQt = ch;
				} else if (' ' === ch) {
					if (cur.length) {
						ret.push(cur);
						cur = '';
					}
				} else {
					cur = cur + ch;
				}
			} else if ('"' === inQt || "'" === inQt) {
				if (ch === inQt) {
					inQt = '';
				} else {
					cur = cur + ch;
				}
			}
		}
		if ('' === inQt && cur.length) {
			ret.push(cur);
		}
		return ret;
	}

	#unwrapQuote(str) {
		if (
			("'" === str[0] && "'" === str.at(-1)) ||
			('"' === str[0] && '"' === str.at(-1))
		) {
			return str.substring(1, str.length - 1);
		}
		return str;
	}

	#pathToLibName(path) {
		let val  = path.replace('/', '\\');
		const ps = val.split('\\').reverse();

		for (const p of ps) {
			const q = p.trim();
			if (!q.length) {
				continue;
			}
			const pos = q.indexOf('.');
			val = q.substring(0, pos).toUpperCase();
			break;
		}
		return val.replace(/[ -+\\.]/, '_');
	}


	// -------------------------------------------------------------------------


	async #writeAsLibrary(origPath, nameSpace, destPath) {
		const lc = await this.#readAsLibraryCode(origPath, nameSpace);
		if (!lc) {
			return false;
		}
		return await this.#fs.writeFile(destPath, lc);
	}

	async #readAsLibraryCode(path, nameSpace, indent = 0) {
		const code = await this.#fs.readFile(path);
		if (null === code) {
			return null;
		}
		const cs = analyze(code);
		return this.#createLibraryCode(code, cs.fnNames, nameSpace, indent);
	}

	#createLibraryCode(code, exportedSymbols, nameSpace, indent = 0, inc = '') {
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

export default Exporter;
