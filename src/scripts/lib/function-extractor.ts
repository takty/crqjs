/**
 * Function Extractor
 *
 * @author Takuto Yanagida
 * @version 2024-05-05
 */

import * as acorn from 'acorn';
import * as acorn_walk from 'acorn-walk';

export default function extractFunction(code: string) {
	const ID = 'Identifier';
	const FS = [
		'FunctionExpression',
		'ArrowFunctionExpression',
		'ClassExpression',
	];

	const fns: string[] = [];
	let res = true;

	try {
		acorn_walk.simple(
			acorn.parse(code, { ecmaVersion: 'latest' }),
			{
				ClassDeclaration: (n: acorn.ClassDeclaration | acorn.AnonymousClassDeclaration) => {
					if (n.id) {
						fns.push(n.id.name);
					}
				},
				VariableDeclaration: (n: acorn.VariableDeclaration) => {  // const f = function () {...};
					for (let d of n.declarations) {
						if (FS.includes(d.init?.type ?? '')) {
							fns.push((d.id as acorn.Identifier).name);
						}
					}
				},
				FunctionDeclaration: (n: acorn.Function) => {  // function f () {...}
					if (n.id) {
						fns.push(n.id.name);
					}
				},
				AssignmentExpression: (n: acorn.AssignmentExpression) => {  // f = function () {...};
					const { left: nl, right: nr } = n;
					if (nl.type === ID && FS.includes(nr.type)) {
						fns.push(nl.name);
					}
				},
			}, acorn_walk.base);
	} catch (e: unknown) {
		console.error(e);
		res = false;
	}
	return { fns, res };
}
