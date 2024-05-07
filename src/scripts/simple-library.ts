/**
 * Simplified Library
 *
 * @author Takuto Yanagida
 * @version 2024-05-05
 */

import Fsa from './lib/fsa.js';
import extractFunction from './lib/function-extractor.js';
import extractDeclarations from './custom-declaration.js';

const EXP_EOL = '\r\n';

export async function exportAsLibrary(code: string, fsa: Fsa, filePs: string[], nameSpace: string, codeStructure: { fns: string[] }, doIncludeUseLib: boolean = false) {
	const fns = [...codeStructure.fns];
	let inc = '';

	if (doIncludeUseLib) {
		const bp = Fsa.dirName(filePs);
		const ul = await concatUseLib(code, fsa, bp, fns);
		if (Array.isArray(ul)) {
			return ul;
		}
		inc = ul;
	}
	const lc  = createLibraryCode(code, fns, nameSpace, 0, inc);
	const res = await fsa.writeFile(filePs, lc);
	return [res, filePs];
}

export async function readAsLibrary(fsa: Fsa, filePs: string[], nameSpace: string, indent: number = 0) {
	const c = await fsa.readFile(filePs) as string;
	if (null === c) {
		return null;
	}
	const { fns } = extractFunction(c);
	return createLibraryCode(c, fns, nameSpace, indent);
}

async function concatUseLib(code: string, fsa: Fsa, baseDirPs: string[], fns: string[]) {
	const decs = extractDeclarations(code).filter(e => null !== e[1]) as [string ,string][];
	const lcs  = [];

	for (let [lib, ns] of decs) {
		const lc = await readAsLibrary(fsa, [...baseDirPs, ...Fsa.pathToPs(lib)], ns, 1);
		if (!lc) {
			return [false, lib];
		}
		lcs.push(lc);
		fns.push(ns);
	}
	return lcs.join(EXP_EOL);
}

function createLibraryCode(code: string, fns: string[], nameSpace: string, indent: number = 0, inc: string = '') {
	const ls  = code.split('\n').map(l => l.trimEnd());
	const tab = '\t'.repeat(indent);

	const ret = [`${tab}const ${nameSpace} = (() => {`];
	if (inc.length) {
		ret.push(inc);
	}
	ret.push(
		ls.map(l => `${tab}\t${l.replace(/\s+$/, '')}`).join(EXP_EOL),
		`${tab}\treturn { ${fns.join(', ')} };`,
		`${tab}})();`
	);
	return ret.join(EXP_EOL);
}
