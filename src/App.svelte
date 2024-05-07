<script lang="ts">
	import "./app.css";
	import Fsa from './scripts/lib/fsa.js';
	import Exporter from './scripts/exporter.js';
	import extractFunction from './scripts/lib/function-extractor.js';

	import Editor from "./components/Editor.svelte";
	import DirectoryFilePicker from "./components/DirectoryFilePicker.svelte";

	// let dfp: DirectoryFilePicker;
	let fileChooser: HTMLDialogElement;

	let fsa: Fsa|null = null;
	let fileName: string|null = null;
	let curPath: string[]|null = null;
	let source: string;

	let _onClose: (hDir: FileSystemDirectoryHandle | null, hFile: FileSystemFileHandle | null, fn: string|null) => void;

	function openDialog(onClose: (hDir: FileSystemDirectoryHandle | null, hFile: FileSystemFileHandle | null, fn: string|null) => void) {
		_onClose = onClose;
		fileChooser.showModal();
	}

	async function closeDialog({
		detail: [hDir, hFile, fn],
	}: {
		detail: [FileSystemDirectoryHandle | null, FileSystemFileHandle | null, string|null];
	}) {
		fileChooser.close();
		_onClose(hDir, hFile, fn);
	}

	function open() {
		openDialog(async (hDir: FileSystemDirectoryHandle | null, hFile: FileSystemFileHandle | null, fn: string|null) => {
			if (hDir && hFile) {
				const f = await hFile.getFile();
				source = await f.text();

				fsa = new Fsa(hDir);
				fileName = hFile.name;
			}
		});
	}

	async function save() {
		if (fsa !== null && fileName !== null) {
			fsa.writeFile([fileName], source);
		}
	}

	async function saveAs() {
		openDialog(async (hDir: FileSystemDirectoryHandle | null, hFile: FileSystemFileHandle | null, fn: string|null) => {
			if (hDir && fn) {
				fsa = new Fsa(hDir);
				fsa.writeFile([fn], source);
			}
		});
	}

	async function runCode() {
		console.log(fsa);
		console.log(fileName);
		if (fsa !== null && fileName !== null) {
			const ex  = new Exporter(fsa);
			const ext = Fsa.extName([fileName]);
			const fn  = fileName.substring(0, fileName.length - ext.length);
			const [r, path] = await ex.exportAsWebPage(source, [fileName], [`${fn}.export`], true, 'url');
			if (r && path) {
				curPath = path;
			}
			if (curPath) {
				const fh = await fsa.getFileHandle(curPath);
				if (null !== fh) {
					window.open(URL.createObjectURL(await fh.getFile()), 'field');
				}
			}
		} else {
			const hDir = await navigator.storage.getDirectory();
			const fsa = new Fsa(hDir);

			const ex  = new Exporter(fsa);
			const fn  = 'temp';
			const [r, path] = await ex.exportAsWebPage(source, [], [`/${fn}.export`], true, 'url');
			if (r && path) {
				const fh = await fsa.getFileHandle(path);
				if (null !== fh) {
					window.open(URL.createObjectURL(await fh.getFile()), 'field');
				}
			}
		}
	}

	async function saveAsLibrary() {
		if (fsa !== null && fileName !== null) {
			const ex  = new Exporter(fsa);
			const ext = Fsa.extName([fileName]);
			const fn  = fileName.substring(0, fileName.length - ext.length);
			const [r, path] = await ex.exportAsLibrary(source, [`${fn}.lib.js`], fn, extractFunction(source));
		}
	}

	import { Button } from "$lib/components/ui/button";
</script>

<main>
	<div class="action">
		<Button on:click={open}>Open...</Button>
		<Button on:click={save}>Save</Button>
		<Button on:click={saveAs}>Save As...</Button>
		<Button on:click={runCode}>Run</Button>
		<Button on:click={saveAsLibrary}>Save as library</Button>
	</div>

	<Editor bind:value={source}/>

	<div class="status-bar"></div>

	<DirectoryFilePicker
		bind:dialog={fileChooser}
		message="Select a file and the folder contains the file."
		on:close={closeDialog}
	/>
</main>


<style>
	main {
		display: flex;
		flex-direction: column;
		margin: 0;
		width: 100%;
	}
	.action {
		display: flex;
		gap: 1rem;
	}

	.status-bar {
		height: 1.5rem;
		background-color: #eee;
	}
</style>
