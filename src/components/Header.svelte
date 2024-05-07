<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import * as DropdownMenu  from "$lib/components/ui/dropdown-menu/index.js";
    import type { ButtonEventHandler } from "bits-ui";

	export let handler: ((id: string) => void)|null = null;

	const el = (e: ButtonEventHandler<MouseEvent>) => {
		if ('function' === typeof handler) {
			handler((e.target as Element).id ?? '');
		}
	}
</script>

<div class="container flex items-start justify-between items-center px-4 py-4">
	<DropdownMenu.Root>
		<DropdownMenu.Trigger asChild let:builder>
			<Button variant="secondary" builders={[builder]}>
				<span class="sr-only">Actions</span>
				<!-- <DotsHorizontal class="h-4 w-4" /> -->
			</Button>
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end">
			<DropdownMenu.Item>
				Save as library
			</DropdownMenu.Item>
			<DropdownMenu.Separator />
		</DropdownMenu.Content>
	</DropdownMenu.Root>

	<h2 class="text-lg font-semibold">Crqjs</h2>

	<div class="ml-auto flex w-full space-x-2 sm:justify-end">
		<Button variant="secondary" on:click={el} id="open">Open...</Button>
		<Button variant="secondary" on:click={el} id="save">Save</Button>
		<Button variant="secondary" on:click={el} id="save-as">Save As...</Button>
		<Button variant="secondary" on:click={el} id="run">Run</Button>
	</div>
</div>
