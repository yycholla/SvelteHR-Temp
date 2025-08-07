import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";

import Root from "./dropdown-menu.svelte";
import Trigger from "./dropdown-menu-trigger.svelte";
import Content from "./dropdown-menu-content.svelte";
import Item from "./dropdown-menu-item.svelte";

const Sub = DropdownMenuPrimitive.Sub;
const SubTrigger = DropdownMenuPrimitive.SubTrigger;
const SubContent = DropdownMenuPrimitive.SubContent;
const Separator = DropdownMenuPrimitive.Separator;
const Arrow = DropdownMenuPrimitive.Arrow;

export {
	Root,
	Trigger,
	Content,
	Item,
	Sub,
	SubTrigger,
	SubContent,
	Separator,
	Arrow,
	//
	Root as DropdownMenu,
	Trigger as DropdownMenuTrigger,
	Content as DropdownMenuContent,
	Item as DropdownMenuItem,
	Sub as DropdownMenuSub,
	SubTrigger as DropdownMenuSubTrigger,
	SubContent as DropdownMenuSubContent,
	Separator as DropdownMenuSeparator,
	Arrow as DropdownMenuArrow,
};