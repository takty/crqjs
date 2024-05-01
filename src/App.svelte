<script lang="ts">
	import Fsa from './scripts/lib/fsa-browser.js';
	import Exporter from './scripts/exporter.js';

	import Editor from "./components/Editor.svelte";
	import DirectoryFilePicker from "./components/DirectoryFilePicker.svelte";

	let fileChooser: HTMLDialogElement;

	let fs: Fsa|null = null;
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

			fs = new Fsa(hDir);
			fileName = hFile.name;
		}
	}

	async function save() {
		if (fs !== null && fileName !== null) {
			fs.writeFile(fileName, source);
		}
	}

	async function runCode() {
		if (fs !== null && fileName !== null) {
			const ex  = new Exporter(fs);
			const ext = fs.extName(fileName);
			const fn  = fileName.substring(0, fileName.length - ext.length);
			const [r, path] = await ex.exportAsWebPage(source, fileName, `/${fn}.export`, true, true);
			if (r) {
				curPath = path;
			}
			const fh = await fs.getFileHandle(curPath);
			window.open(URL.createObjectURL(await fh.getFile()), 'field');
		}
	}
</script>

<main>
	<h1>Crqjs</h1>

	<div class="action">
		<button on:click={openDialog}>Open...</button>
		<button on:click={save}>Save</button>
		<button on:click={runCode}>Run</button>
	</div>

	<Editor bind:source={source}/>

	<DirectoryFilePicker
		bind:dialog={fileChooser}
		message="Select a file and the folder contains the file."
		on:close={closeDialog}
	/>
</main>

<style>
	.action {
		display: flex;
		gap: 1rem;
	}
</style>
