<script lang="ts">
	import CodeMirror from "svelte-codemirror-editor";
	import { javascript } from "@codemirror/lang-javascript";

	export let value: string = "";
</script>

<div>
	<CodeMirror
		bind:value
		lang={javascript()}
		tabSize={4}
		styles={{
			"&": {
				border: "1px solid #ddd",
				width: '100%',
				height: '100%',
			},
		}}
	/>
</div>

<style>
	div {
		flex-grow: 1;

		display: flex;

		& > * {
			flex-grow: 1;
		}
	}
</style>
