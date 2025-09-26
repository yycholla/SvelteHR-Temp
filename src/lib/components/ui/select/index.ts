import { Select as SelectPrimitive } from 'bits-ui';

import Group from './select-group.svelte';
import Label from './select-label.svelte';
import Item from './select-item.svelte';
import Content from './select-content.svelte';
import Trigger from './select-trigger.svelte';
import Separator from './select-separator.svelte';
import ScrollDownButton from './select-scroll-down-button.svelte';
import ScrollUpButton from './select-scroll-up-button.svelte';
import GroupHeading from './select-group-heading.svelte';

const Root = SelectPrimitive.Root;
// const Value = SelectPrimitive.Value; // Temporarily commented - may not be available in current bits-ui version

export {
	Root,
	// Value, // Temporarily disabled
	Group,
	Label,
	Item,
	Content,
	Trigger,
	Separator,
	ScrollDownButton,
	ScrollUpButton,
	GroupHeading,
	//
	Root as Select,
	// Value as SelectValue, // Temporarily disabled
	Group as SelectGroup,
	Label as SelectLabel,
	Item as SelectItem,
	Content as SelectContent,
	Trigger as SelectTrigger,
	Separator as SelectSeparator,
	ScrollDownButton as SelectScrollDownButton,
	ScrollUpButton as SelectScrollUpButton,
	GroupHeading as SelectGroupHeading
};
