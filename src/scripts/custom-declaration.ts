/**
 * Custom Declaration
 *
 * @author Takuto Yanagida
 * @version 2024-05-02
 */

export default function extractDeclarations(lines: string[]): [string, string|null][] {
	const USE = '@use', NEED = '@need', AS = 'as', EXT = '.js';
	const scs: string[][] = lines.map(parseSpecialComment).filter(sc => null !== sc) as string[][];
	const res: [string, string|null][] = [];

	for (const [type, params] of scs) {
		const items = splitSpaceSeparatedLine(params).map(unwrapQuote);

		if (type === NEED) {
			for (let item of items) {
				if (item.indexOf(EXT) === -1) {
					item += EXT;
				}
				res.push([item, null]);
			}
		} else if (type === USE) {
			let last: [string, string|null]|null = null;
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
					r[1] = pathToLibName(r[0]);
				}
			}
		}
	}
	return res;
}

function parseSpecialComment(line: string) {
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

function splitSpaceSeparatedLine(line: string) {
	const ret: string[] = [];
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

function unwrapQuote(str: string) {
	if (
		("'" === str[0] && "'" === str.at(-1)) ||
		('"' === str[0] && '"' === str.at(-1))
	) {
		return str.substring(1, str.length - 1);
	}
	return str;
}

function pathToLibName(path: string) {
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
