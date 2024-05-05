/**
 * Custom Declaration
 *
 * @author Takuto Yanagida
 * @version 2024-05-05
 */

export default function extractDeclarations(code: string): [string, string|null][] {
	const USE = '@use', NEED = '@need';
	const scs: [string, string[]][] = code.split('\n').map(parseSpecialComment).filter(Boolean) as [string, string[]][];
	const res: [string, string|null][] = [];

	for (const [type, its] of scs) {
		if (type === NEED) {
			processNeedDeclaration(its, res);
		} else if (type === USE) {
			processUseDeclaration(its, res);
		}
	}
	return res;
}

function processNeedDeclaration(its: string[], res: [string, string|null][]) {
	const EXT = '.js';

	for (let it of its) {
		if (it.indexOf(EXT) === -1) {
			it += EXT;
		}
		res.push([it, null]);
	}
}

function processUseDeclaration(its: string[], res: [string, string|null][]) {
	const AS = 'as', EXT = '.js';
	const re = new RegExp(`${EXT}$`, 'g');

	let last: [string, string]|null = null;

	for (let i = 0; i < its.length; i += 1) {
		let it = its[i];
		if (it === AS && last !== null && i + 1 < its.length) {
			last[1] = its[i + 1];
			i += 1;
		} else {
			last = [it.replace(re, '') + EXT, ''];
			res.push(last);
		}
	}
	pathToLibNameAll(res);
}

function parseSpecialComment(line: string): [string, string[]]|null {
	const COMMENT = '//', SP_CHAR = '@';
	const reg = new RegExp(`\\s*${COMMENT}\\s*(${SP_CHAR}\\w+)\\s*(.*)`);

	const m = line.trim().match(reg);
	if (m) {
		let ps = m[2];
		if (ps.endsWith(';')) {
			ps = ps.slice(0, -1).trim();
		}
		return [m[1], splitSpaceSeparatedLine(ps)];
	}
	return null;
}

function splitSpaceSeparatedLine(str: string) {
	const reg = /"([^"]*)"|'([^']*)'|[^ ]+/g;
	const ret: string[] = [];

	for (const m of str.matchAll(reg)) {
		const p = m[1] ?? m[2] ?? m[0];
		if (p.length) {
			ret.push(p);
		}
	}
	return ret;
}

function pathToLibNameAll(res: [string, string|null][]) {
	for (let r of res) {
		if ('' === r[1]) {
			r[1] = pathToLibName(r[0]);
		}
	}
}

function pathToLibName(path: string) {
	let val  = path.replace('/', '\\').replace(/\\\\+/g, '\\');
	const ps = val.split('\\').filter(e => e.trim().length).reverse();

	if (ps.length) {
		const pos = ps[0].indexOf('.');
		val = ps[0].substring(0, pos);
	}
	return val.toUpperCase().replace(/[ -+\\.]/, '_');
}
