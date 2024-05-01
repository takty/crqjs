/**
 * Code Analyzer
 *
 * @author Takuto Yanagida
 * @version 2022-11-01
 */

import { parse as acorn_parse } from './lib/acorn/acorn.mjs';
import { base as acorn_walk_base } from './lib/acorn/walk.mjs';

function analyze(code) {
	function walk(node, visitors, base, state, override) {
		if (!base) {
			base = acorn_walk_base;
		}
		(function c(node, st, override) {
			const type  = override || node.type;
			const found = visitors[type];
			if (found) {
				found(node, st);
			}
			base[type](node, st, c);
		})(node, state, override);
	}

	const FE  = 'FunctionExpression';
	const AFE = 'ArrowFunctionExpression';
	const CE  = 'ClassExpression';
	const ID  = 'Identifier';

	const fnNames = [];
	let success = true;

	try {
		const ast = acorn_parse(code, { ecmaVersion: 'latest' });

		walk(ast, {
			ClassDeclaration: (node, state, c) => {
				fnNames.push(node.id.name);
			},
			VariableDeclaration: (node, state, c) => {  // const f = function () {...};
				for (let d of node.declarations) {
					if (
						d.init !== null &&
						(
							d.init.type === FE ||
							d.init.type === AFE ||
							d.init.type === CE
						)
					) {
						fnNames.push(d.id.name);
					}
				}
			},
			FunctionDeclaration: (node, state, c) => {  // function f () {...}
				fnNames.push(node.id.name);
			},
			AssignmentExpression: (node, state, c) => {  // f = function () {...};
				const nl = node.left;
				const nr = node.right;
				if (
					nl.type === ID &&
					(
						nr.type === FE ||
						nr.type === AFE ||
						nr.type === CE
					)
				) {
					fnNames.push(nl.name);
				}
			},
		});
	} catch (e) {
		const es = e.toString();
		if (!es.startsWith('SyntaxError') && !es.startsWith('UnexpectedToken')) {
			console.error(e);
		}
		success = false;
	}
	return { fnNames, success };
}

export default analyze;
