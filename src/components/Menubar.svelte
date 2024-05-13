<script lang="ts">
	import * as Menubar from "$lib/components/ui/menubar";

	import {
		HardDriveDownload,
		Layers2,
		BookText,
		PanelTop,
		Play,
	} from "lucide-svelte";

	import logo from '../assets/crqjs.svg';

	let isOutputPaneVisible = false;

	export let handler: ((id: string) => void)|null = null;

	const el = (id: string) => {
		if ('function' === typeof handler) {
			handler(id);
		}
	}
</script>

<Menubar.Root class="border-none">
	<Menubar.Menu>
		<Menubar.Trigger>
			<img class="h-6 w-6" alt="Crqjs" src={logo} />
		</Menubar.Trigger>
		<Menubar.Content>
			<Menubar.Label>
				Crqjs
			</Menubar.Label>
			<Menubar.Separator />
			<Menubar.Item>
				<span class="mr-2 h-4 w-4" />
				<span>About...</span>
			</Menubar.Item>
		</Menubar.Content>
	</Menubar.Menu>
	<Menubar.Menu>
		<Menubar.Trigger>File</Menubar.Trigger>
		<Menubar.Content>
			<Menubar.Item>
				<span class="mr-2 h-4 w-4" />
				<span>New</span>
			</Menubar.Item>
			<Menubar.Item on:click={() => el('open')}>
				<span class="mr-2 h-4 w-4" />
				<span>Open...</span>
			</Menubar.Item>
			<Menubar.Item on:click={() => el('save')}>
				<HardDriveDownload class="mr-2 h-4 w-4" />
				<span>Save</span>
			</Menubar.Item>
			<Menubar.Item on:click={() => el('save-as')}>
				<span class="mr-2 h-4 w-4" />
				<span>Save As</span>
			</Menubar.Item>
			<Menubar.Item>
				<Layers2 class="mr-2 h-4 w-4" />
				<span>Save a Copy</span>
			</Menubar.Item>
			<Menubar.Separator />
			<Menubar.Item on:click={() => el('export-library')}>
				<BookText class="mr-2 h-4 w-4" />
				Export as Library
			</Menubar.Item>
			<Menubar.Item>
				<PanelTop class="mr-2 h-4 w-4" />
				Export as Web Page
			</Menubar.Item>
		</Menubar.Content>
	</Menubar.Menu>
	<Menubar.Menu>
		<Menubar.Trigger>Code</Menubar.Trigger>
		<Menubar.Content>
			<Menubar.Item on:click={() => el('run')}>
				<Play class="mr-2 h-4 w-4" />
				<span>Run</span>
			</Menubar.Item>
			<Menubar.Item>
				<span class="mr-2 h-4 w-4" />
				<span>Stop</span>
			</Menubar.Item>
		</Menubar.Content>
	</Menubar.Menu>
	<Menubar.Menu>
		<Menubar.Trigger>View</Menubar.Trigger>
		<Menubar.Content>
			<Menubar.CheckboxItem bind:checked={isOutputPaneVisible}>
				<span>Show Output Pane</span>
			</Menubar.CheckboxItem>
		</Menubar.Content>
	</Menubar.Menu>
</Menubar.Root>

<style>
</style>
