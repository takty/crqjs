<script lang="ts">
	import Fsa from './scripts/lib/fsa.js';
	import Exporter from './scripts/exporter.js';
	import extractFunction from './scripts/lib/function-extractor.js';

	import Editor from "./components/Editor.svelte";
	import DirectoryFilePicker from "./components/DirectoryFilePicker.svelte";

	let fileChooser: HTMLDialogElement;

	let fsa: Fsa|null = null;
	let fileName: string|null = null;
	let curPath: string|null = null;
	let source: string;

	function openDialog() {
		fileChooser.showModal();
	}

	async function closeDialog({
		detail: [hDir, hFile],
	}: {
		detail: [FileSystemDirectoryHandle | null, FileSystemFileHandle | null];
	}) {
		fileChooser.close();
		if (hDir && hFile) {
			const f = await hFile.getFile();
			source = await f.text();

			fsa = new Fsa(hDir);
			fileName = hFile.name;
		}
	}

	async function save() {
		if (fsa !== null && fileName !== null) {
			fsa.writeFile(fileName, source);
		}
	}

	async function runCode() {
		if (fsa !== null && fileName !== null) {
			const ex  = new Exporter(fsa);
			const ext = fsa.extName(fileName);
			const fn  = fileName.substring(0, fileName.length - ext.length);
			const [r, path] = await ex.exportAsWebPage(source, fileName, `/${fn}.export`, true, true);
			if (r && path) {
				curPath = path;
			}
			if (curPath) {
				const fh = await fsa.getFileHandle(curPath);
				if (null !== fh) {
					window.open(URL.createObjectURL(await fh.getFile()), 'field');
				}
			}
		}
	}

	async function saveAsLibrary() {
		if (fsa !== null && fileName !== null) {
			const ex  = new Exporter(fsa);
			const ext = fsa.extName(fileName);
			const fn  = fileName.substring(0, fileName.length - ext.length);
			const [r, path] = await ex.exportAsLibrary(source, `${fn}.lib.js`, fn, extractFunction(source));
		}
	}
</script>

<main>
	<div class="action">
		<button on:click={openDialog}>Open...</button>
		<button on:click={save}>Save</button>
		<button on:click={runCode}>Run</button>
		<button on:click={saveAsLibrary}>Save as library</button>
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
