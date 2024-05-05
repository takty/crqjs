/**
 * Library Utilities
 *
 * @author Takuto Yanagida
 * @version 2024-05-05
 */

import Fsa from './lib/fsa.js';
import extractDeclarations from './custom-declaration.js';

const DEF_DIR = 'def';

export async function checkLibraryReadable(fsa: Fsa, code: string, filePath: string) {
	const decs = extractDeclarations(code);
	const bp   = filePath ? Fsa.dirName(filePath) : null;

	for (let [p, ns] of decs) {
		if (!p.startsWith('http')) {
			if (!bp) {
				return p;  // Error
			}
			const cont = await fsa.readFile(Fsa.join(bp, p));
			if (cont === null) {
				return p;  // Error
			}
		}
	}
	return true;
}

export async function  loadDefFile(fsa: Fsa, code: string, filePath: string = '', defExt: string = '.json') {
	const decs = extractDeclarations(code);
	const bp   = filePath ? Fsa.dirName(filePath) : null;
	const ret: string[]  = [];

	for (let [p, ns] of decs) {
		if (!p.startsWith('http')) {
			if (!bp) {
				continue;
			}
			const path = Fsa.join(bp, p);
			const cont = await fsa.readFile(path);
			if (cont === null) {
				continue;  // Error
			}
			const dp  = makeDefPath(path, defExt);
			const def = await fsa.readFile(dp);
			if (def === null) {
				continue;
			}
			ret.push(def);
		}
	}
	return ret;
}

function makeDefPath(path: string, defExt: string) {
	const dir = Fsa.dirName(path);
	const ext = Fsa.extName(path);
	const bn  = Fsa.baseName(path, ext);
	return Fsa.join(dir, DEF_DIR, `${bn}${defExt}`);
}
