/**
 * Library Utilities
 *
 * @author Takuto Yanagida
 * @version 2024-05-06
 */

import Fsa from './fsa.js';
import extractDeclarations from './custom-declaration.js';

const DEF_DIR_PS = ['def'];

export async function checkLibraryReadable(fsa: Fsa, code: string, filePs: string[]) {
	const decs = extractDeclarations(code);
	const bp   = filePs.length ? Fsa.dirName(filePs) : null;

	for (let [lib, ns] of decs) {
		if (!lib.startsWith('http')) {
			if (!bp) {
				return lib;  // Error
			}
			const cont = await fsa.readFile([...bp, ...Fsa.pathToPs(lib)]);
			if (cont === null) {
				return lib;  // Error
			}
		}
	}
	return true;
}

export async function  loadDefFile(fsa: Fsa, code: string, filePs: string[] = [], defExt: string = '.json') {
	const decs = extractDeclarations(code);
	const bp   = filePs.length ? Fsa.dirName(filePs) : null;
	const ret: string[]  = [];

	for (let [lib, ns] of decs) {
		if (!lib.startsWith('http')) {
			if (!bp) {
				continue;
			}
			const ps = [...bp, ...Fsa.pathToPs(lib)];
			const cont = await fsa.readFile(ps) as string;
			if (cont === null) {
				continue;  // Error
			}
			const dp  = makeDefPath(ps, defExt);
			const def = await fsa.readFile(dp) as string;
			if (def === null) {
				continue;
			}
			ret.push(def);
		}
	}
	return ret;
}

function makeDefPath(ps: string[], defExt: string) {
	const dir = Fsa.dirName(ps);
	const ext = Fsa.extName(ps);
	const bn  = Fsa.baseName(ps, ext);
	return [...dir, ...DEF_DIR_PS, `${bn}${defExt}`];
}
