/**
 * File Path
 *
 * @author Takuto Yanagida
 * @version 2024-05-12
 */

export class Path {

	static #split(s: string) {
		const ret: string[] = [];
		if (s.startsWith('/')) {
			ret.push('/');
			s = s.slice(1);
		}
		if (s.endsWith('/')) {
			s = s.slice(0, -1);
		}
		ret.push(...s.split('/'));
		return ret.map(e => e.trim());
	}

	static #normalize(ps: readonly string[]) {
		const ret: string[] = [];
		for (const p of ps) {
			if ('.' !== p && '' !== p) {
				ret.push(p);
			}
		}
		return ret;
	}

	static #parent(ps: readonly string[]) {
		if (0 === ps.length) {
			return [];
		}
		if (1 === ps.length && '/' === ps[0]) {
			return ['/'];
		}
		return ps.slice(0, -1);
	}

	readonly #ps: string[] = [];

	constructor(...vs: readonly (string | Path)[]) {
		for (let v of vs) {
			let ts: string[];
			if (v instanceof Path) {
				ts = v.#ps;
			} else {
				ts = Path.#normalize(Path.#split(v));
			}
			if (ts.length && '/' === ts[0]) {
				this.#ps.length = 0;
			}
			this.#ps.push(...ts);
		}
	}

	segments() {
		return [...this.#ps];
	}

	toString(): string {
		let ret = '';
		if (0 === this.#ps.length) {
			ret = '.';
		} else if (0 < this.#ps.length && '/' === this.#ps[0]) {
			ret = '/' + this.#ps.slice(1).join('/');
		} else {
			ret = this.#ps.join('/');
		}
		return ret;
	}

	parents(): Path[] {
		const pss = [];
		let ps = this.#ps;
		do {
			ps = Path.#parent(ps);
			pss.push(ps);
		} while (0 !== ps.length && (1 !== ps.length || '/' !== ps[0]));
		return pss.map(ps => this.withSegments(...ps));
	}

	parent(): Path {
		return this.withSegments(...Path.#parent(this.#ps));
	}

	name(): string {
		let n = '';
		if (0 === this.#ps.length) {
			n = '';
		} else if (1 === this.#ps.length && '/' === this.#ps[0]) {
			n = '';
		} else {
			n = this.#ps.at(-1) as string;
		}
		return n;
	}

	suffix(): string {
		const name = this.name();
		let ret = '';
		if ('..' !== name) {
			const idx = name.lastIndexOf('.');
			if (-1 !== idx) {
				ret = name.substring(idx);
			}
		}
		return ret;
	}

	suffixes(): string[] {
		const ret: string[] = [];
		let name = this.name();
		if ('..' !== name) {
			while (true) {
				const idx = name.lastIndexOf('.');
				if (-1 === idx) {
					break;
				}
				ret.push(name.substring(idx));
				name = name.slice(0, idx);
			}
		}
		return ret.reverse();
	}

	stem(): string {
		let ret = this.name();
		if ('..' !== ret) {
			const idx = ret.lastIndexOf('.');
			if (-1 !== idx) {
				ret = ret.substring(0, idx);
			}
		}
		return ret;
	}

	isAbsolute(): boolean {
		return 0 < this.#ps.length && '/' === this.#ps[0];
	}

	join(...vs: (string | Path)[]): Path {
		return this.withSegments(...this.#ps, ...vs);
	}

	withName(name: string): Path {
		if ('' === this.name()) {
			throw new Error(`Path('${this.toString()}') has an empty name`);
		}
		return this.withSegments(...Path.#parent(this.#ps), name);
	}

	withStem(stem: string): Path {
		if ('' === this.name()) {
			throw new Error(`Path('${this.toString()}') has an empty name`);
		}
		return this.withSegments(...Path.#parent(this.#ps), stem + this.suffix());
	}

	withSuffix(suffix: string): Path {
		if (suffix.length < 2 || '.' !== suffix[0]) {
			throw new Error(`Invalid suffix '${suffix}'`);
		}
		if ('' === this.name()) {
			throw new Error(`Path('${this.toString()}') has an empty name`);
		}
		return this.withSegments(...Path.#parent(this.#ps), this.stem() + suffix);
	}

	withSegments(...vs: readonly (string | Path)[]): Path {
		return new Path(...vs);
	}

}
