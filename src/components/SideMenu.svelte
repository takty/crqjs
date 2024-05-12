<script lang="ts">
	import LineChart from "lucide-svelte/icons/line-chart";
	import Package from "lucide-svelte/icons/package";
	import Home from "lucide-svelte/icons/home";
	import ShoppingCart from "lucide-svelte/icons/shopping-cart";
	import Menu from "lucide-svelte/icons/menu";
	import Package2 from "lucide-svelte/icons/package-2";
	import Users from "lucide-svelte/icons/users";
	import { Button } from "$lib/components/ui/button/index.js";
	import * as Sheet from "$lib/components/ui/sheet/index.js";

	import Calculator from "lucide-svelte/icons/calculator";
	import Calendar from "lucide-svelte/icons/calendar";
	import CreditCard from "lucide-svelte/icons/credit-card";
	import Settings from "lucide-svelte/icons/settings";
	import Smile from "lucide-svelte/icons/smile";
	import User from "lucide-svelte/icons/user";
	import * as Command from "$lib/components/ui/command/index.js";

	import * as DropdownMenu  from "$lib/components/ui/dropdown-menu/index.js";
</script>

<Sheet.Root>
	<Sheet.Trigger asChild let:builder>
		<Button
			variant="outline"
			size="icon"
			class="shrink-0"
			builders={[builder]}
		>
			<Menu class="h-5 w-5" />
		</Button>
	</Sheet.Trigger>
	<Sheet.Content side="left" class="">
		<Command.Root class="">
			<Command.List class="max-h-[100vh]">
				<Command.Group heading="File">
					<Command.Item>
						<Calendar class="mr-2 h-4 w-4" />
						<span>New</span>
					</Command.Item>
					<Command.Item>
						<Smile class="mr-2 h-4 w-4" />
						<span>Open...</span>
					</Command.Item>
					<Command.Item>
						<Calculator class="mr-2 h-4 w-4" />
						<span>Save</span>
					</Command.Item>
					<Command.Item>
						<Calculator class="mr-2 h-4 w-4" />
						<span>Save As</span>
					</Command.Item>
					<Command.Item>
						<Calculator class="mr-2 h-4 w-4" />
						<span>Save Duplicate</span>
					</Command.Item>
				</Command.Group>
				<Command.Separator />
				<Command.Group heading="Settings">
					<Command.Item>
						<User class="mr-2 h-4 w-4" />
						<span>Profile</span>
						<Command.Shortcut>⌘P</Command.Shortcut>
					</Command.Item>
					<Command.Item>
						<CreditCard class="mr-2 h-4 w-4" />
						<span>Billing</span>
						<Command.Shortcut>⌘B</Command.Shortcut>
						</Command.Item>
					<Command.Item>
						<Settings class="mr-2 h-4 w-4" />
						<span>Settings</span>
						<Command.Shortcut>⌘S</Command.Shortcut>
					</Command.Item>
				</Command.Group>
			</Command.List>
		</Command.Root>
	</Sheet.Content>
</Sheet.Root>

<DropdownMenu.Root>
	<DropdownMenu.Trigger asChild let:builder>
		<Button
			variant="outline"
			size="icon"
			class="shrink-0"
			builders={[builder]}
		>
			<Menu class="h-5 w-5" />
		</Button>
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end">
		<DropdownMenu.Label>File</DropdownMenu.Label>
		<DropdownMenu.Separator />
		<DropdownMenu.Item>
			<Calendar class="mr-2 h-4 w-4" />
			<span>New</span>
		</DropdownMenu.Item>
		<DropdownMenu.Item>
			<Smile class="mr-2 h-4 w-4" />
			<span>Open...</span>
		</DropdownMenu.Item>
		<DropdownMenu.Item>
			<Calculator class="mr-2 h-4 w-4" />
			<span>Save</span>
		</DropdownMenu.Item>
		<DropdownMenu.Item>
			<Calculator class="mr-2 h-4 w-4" />
			<span>Save As</span>
		</DropdownMenu.Item>
		<DropdownMenu.Item>
			<Calculator class="mr-2 h-4 w-4" />
			<span>Save Duplicate</span>
		</DropdownMenu.Item>
		<DropdownMenu.Item>
			Save as library
		</DropdownMenu.Item>
		<DropdownMenu.Separator />
	</DropdownMenu.Content>
</DropdownMenu.Root>

<style>
	[data-cmdk-list] {
		min-height: unset;
		height: auto;
		max-height: unset;
	}
</style>
