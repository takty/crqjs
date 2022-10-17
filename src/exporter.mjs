/**
 * Exporter
 *
 * @author Takuto Yanagida
 * @version 2022-10-17
 */

import analyze from './extractor.mjs';

const IS_MODULE = false;

const ENTRY_CODE = '{"function"==typeof setup&&setup();}';
const HTML_HEAD1 = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>%TITLE%</title>';
const HTML_HEAD2 = '</head><body>' + (IS_MODULE ? '<script type="module">' : '<script>');
const HTML_FOOT  = (IS_MODULE ? ENTRY_CODE : '') + '</script></body>';
const DEF_DIR    = 'def';
const INJECTION  = 'injection.mjs';
const EXP_EOL    = '\r\n';

class Exporter {

	#fs = null;
	#userCodeOffset = 0;

	constructor(fs) {
		this.#fs = fs;
	}

	async checkLibraryReadable(codeStr, filePath) {
		const bp = (filePath) ? this.#fs.dirName(filePath) : null;
		const decs = this._extractUseDeclarations(codeStr.split('\n'));

		for (let dec of decs) {
			const p = Array.isArray(dec) ? dec[0] : dec;
			if (p.indexOf('http') === 0) {
			} else {
				let cont = null;
				if (bp) cont = await this.#fs.readFile(this.#fs.join(bp, p));
				if (cont === null) return p;  // Error
			}
		}
		return true;
	}

	loadDefJsons(codeStr, filePath) {
		const bp = (filePath) ? this.#fs.dirName(filePath) : null;
		const decs = this._extractUseDeclarations(codeStr.split('\n'));
		const ret = [];

		for (let dec of decs) {
			const p = Array.isArray(dec) ? dec[0] : dec;
			if (p.indexOf('http') === 0) {
			} else {
				if (!bp) continue;
				const path = this.#fs.join(bp, p);
				const cont = this._readFile(path);
				if (cont === null) continue;  // Error
				const dp = makeDefPath(path);
				const defJson = this._readFile(dp);
				if (defJson === null) continue;
				ret.push(defJson);
			}
		}
		return ret;

		function makeDefPath(path) {
			const dir = this.fs.dirName(path);
			const ext = this.fs.extName(path);
			const bn  = this.fs.baseName(path, ext);
			return this.fs.join(dir, DEF_DIR, bn + '.json');
		}
	}

	async exportAsLibrary(codeText, filePath, nameSpace, codeStructure, isUseDecIncluded = false) {
		let inc = '';
		const exportedSymbols = codeStructure.fnNames.slice(0);
		if (isUseDecIncluded) {
			const lines = codeText.split('\n');
			const decs = this._extractUseDeclarations(lines);
			const bp = this.#fs.dirName(filePath);
			const libCodes = [];
			for (let dec of decs) {
				if (!Array.isArray(dec)) continue;
				const libPath = this.#fs.join(bp, dec[0]), libNs = dec[1];
				const libCode = await this._readAsLibraryCode(libPath, libNs, 1);
				if (libCode === false) return [false, dec[0]];
				libCodes.push(libCode);
				exportedSymbols.push(libNs);
			}
			inc = libCodes.join(EXP_EOL);
		}
		const libCode = this._createLibraryCode(codeText, exportedSymbols, nameSpace, 0, inc);
		const r = await this.#fs.writeFile(filePath, libCode);
		return [r, filePath];
	}

	async exportAsWebPage(codeText, filePath, dirPath, injection = false) {
		const lines = codeText.split('\n');
		const decs = this._extractUseDeclarations(lines), libs = [];
		const pushTag = (src) => { libs.push('<script src="' + src + '"></script>'); };
		let title = 'Croqujs';

		// if (injection) {
		// 	const temp = this.#fs.dirName(new URL(import.meta.url).pathname);
		// 	const dirName = temp[2] === ':' ? temp.substring(1) : temp;
		// 	await this.#fs.copyFile(this.#fs.join(dirName, INJECTION), this.#fs.join(dirPath, INJECTION));
		// 	pushTag(await this.#fs.filePathToUrl(this.#fs.join(dirPath, INJECTION), dirPath));
		// }
		if (filePath) {
			const bp = this.#fs.dirName(filePath);
			for (let dec of decs) {
				if (Array.isArray(dec)) {
					const p = dec[0];
					if (p.startsWith('http')) return [false, p];
					const destFn = this.#fs.baseName(p, this.#fs.extName(p)) + '.lib.js';
					const res = await this._writeLibraryImmediately(this.#fs.join(bp, p), dec[1], this.#fs.join(dirPath, destFn));
					if (!res) return [false, p];
					pushTag(await this.#fs.filePathToUrl(this.#fs.join(dirPath, destFn), dirPath));
				} else {
					const p = dec;
					let q = dec;
					if (!p.startsWith('http')) {
						const destFn = q.split(/\/|\\/).map(e => { return e === '..' ? '_' : e; }).join(this.#fs.sep);
						const res = await this.#fs.copyFile(this.#fs.join(bp, p), this.#fs.join(dirPath, destFn));
						if (!res) return [false, p];
						// pushTag(await this.#fs.filePathToUrl(this.#fs.join(dirPath, destFn), dirPath));
						pushTag(q);
					} else {
						pushTag(p);
					}
				}
			}
			title = this.#fs.baseName(filePath, '.js');
			title = title.charAt(0).toUpperCase() + title.slice(1);
		} else {
			for (let dec of decs) {
				const p = Array.isArray(dec) ? dec[0] : dec;
				if (!p.startsWith('http')) return [false, p];
				pushTag(p);
			}
		}
		const head = HTML_HEAD1.replace('%TITLE%', title);
		const expPath = this.#fs.join(dirPath, 'index.html');
		const libTagStr = libs.join('');
		this.#userCodeOffset = HTML_HEAD1.length + libTagStr.length + HTML_HEAD2.length;

		const r = this.#fs.writeFile(expPath, [head, libTagStr, HTML_HEAD2, lines.join(EXP_EOL), HTML_FOOT].join(''));
		return [r, expPath];
	}


	// -------------------------------------------------------------------------


	// async copyLibraryOfTemplate(codeText, tempFilePath, dirPath) {
	// 	const decs = this._extractUseDeclarations(codeText.split('\n'));

	// 	const bp = this.fs.dirName(tempFilePath);
	// 	for (let dec of decs) {
	// 		if (Array.isArray(dec)) {
	// 			const p = dec[0];
	// 			if (p.startsWith('http')) return [false, p];
	// 			const destFn = this.fs.baseName(p, this.fs.extName(p)) + '.lib.js';
	// 			const res = await this._writeLibraryImmediately(this.fs.join(bp, p), dec[1], this.fs.join(dirPath, destFn));
	// 			if (!res) return [false, p];
	// 		} else {
	// 			const p = dec;
	// 			if (p.startsWith('http')) continue;
	// 			const destFn = dec.split(/\/|\\/).map(e => { return e === '..' ? '_' : e; }).join(this.fs.sep);
	// 			const destPath = this.fs.join(dirPath, destFn);
	// 			if (await this.fs.exists(destPath)) continue;
	// 			const res = await this.fs.copyFile(this.fs.join(bp, p), destPath);
	// 			if (!res) return [false, p];
	// 		}
	// 	}
	// 	return [true];
	// }


	// -------------------------------------------------------------------------


	_extractUseDeclarations(lines) {
		const USE = '@use', NEED = '@need', IMPORT = '@import', AS = 'as', EXT = '.js';
		const res = [];

		for (let line of lines) {
			const ret = this._isSpecialComment(line);
			if (ret === false) continue;
			const [type, params] = ret;
			const items = this._splitSpaceSeparatedLine(params).map(this._unwrapQuote);

			if (type === NEED || type === IMPORT) {
				for (let item of items) {
					if (item.indexOf(EXT) === -1) item += EXT;
					res.push(item);
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
						if (!item.endsWith(EXT)) item += EXT;
						last = [item, ''];
						res.push(last);
					}
				}
				for (let r of res) {
					if (r[1] === '') r[1] = this._pathToLibName(r[0]);
				}
			}
		}
		return res;
	}

	_isSpecialComment(line) {
		const COMMENT = '//', SP_CHAR = '@';

		line = line.trim();
		if (!line.startsWith(COMMENT)) return false;
		line = line.substr(COMMENT.length).trim();

		if (line[0] !== SP_CHAR) return false;
		const pos = line.search(/\s/);
		if (pos === -1) return false;

		const type = line.substr(0, pos);
		line = line.substr(pos).trim();
		if (line[line.length - 1] === ';') {
			line = line.substr(0, line.length - 1).trim();
		}
		return [type, line];
	}

	_splitSpaceSeparatedLine(line) {
		let ret = [], cur = '', inQt = '';
		for (let ch of line) {
			if (inQt === '') {
				if (ch === '"' || ch === "'") {
					inQt = ch;
				} else if (ch === ' ') {
					if (cur.length > 0) {
						ret.push(cur);
						cur = '';
					}
				} else {
					cur = cur + ch;
				}
			} else if (inQt === '"' || inQt === "'") {
				if (ch === inQt) {
					inQt = '';
				} else {
					cur = cur + ch;
				}
			}
		}
		if (inQt === '' && cur.length > 0) ret.push(cur);
		return ret;
	}

	_unwrapQuote(str) {
		if (str[0] === "'" && str[str.length - 1] === "'") {
			return str.substr(1, str.length - 2);
		}
		if (str[0] === '"' && str[str.length - 1] === '"') {
			return str.substr(1, str.length - 2);
		}
		return str;
	}

	_pathToLibName(path) {
		path = path.replace('/', '\\');
		let val = path;
		const ps = path.split('\\');
		for (let i = ps.length - 1; 0 <= i; i -= 1) {
			const pst = ps[i].trim();
			if (pst === '') continue;
			const pos = pst.indexOf('.');
			val = pst.substr(0, pos).toUpperCase();
			break;
		}
		return val.replace(/[ -+\\.]/, '_');
	}


	// -------------------------------------------------------------------------


	async _writeLibraryImmediately(origPath, nameSpace, destPath) {
		const libCode = await this._readAsLibraryCode(origPath, nameSpace);
		if (libCode === false) return false;
		return await this.#fs.writeFile(destPath, libCode);
	}

	async _readAsLibraryCode(origPath, nameSpace, indent = 0) {
		const ct = await this.#fs.readFile(origPath);
		if (ct === null) return false;
		const cs = analyze(ct);
		return this._createLibraryCode(ct, cs.fnNames, nameSpace, indent);
	}

	_createLibraryCode(codeText, exportedSymbols, nameSpace, indent = 0, inc = '') {
		const ess = exportedSymbols.map(e => (e + ': ' + e)).join(', ');
		const ind = '\t'.repeat(indent);

		const head = ind + 'var ' + nameSpace + ' = (function () {';
		const src  = codeText.split('\n').map(l => (ind + '\t' + l.replace(/\s+$/, ''))).join(EXP_EOL);
		const ret  = ind + '\treturn {' + ess + '};';
		const foot = ind + '}());';

		if (0 < inc.length) return [head, inc, src, ret, foot].join(EXP_EOL);
		return [head, src, ret, foot].join(EXP_EOL);
	}

}

export default Exporter;
