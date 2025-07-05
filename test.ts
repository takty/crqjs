import { FsaPath } from './src/lib/fsa-path.ts';

// const p = new Path('/a/b/c');
// console.log(p.parents().toString());

// let p = new Path('c:/Downloads/draft.txt')
// console.log(p.withStem('final').toString());
// p = new Path('c:/Downloads/pathlib.tar.gz');
// console.log(p.withStem('lib').toString());
// // p = new Path('/');
// // console.log(p.withStem('').toString());

// p = new Path('my/library.tar.gz');
// console.log(p.suffixes());
// p = new Path('my/library');
// console.log(p.suffixes());

let p = new FsaPath(null, '/turtle_4.export');
console.dir(p.join('injection.mjs').toString());
