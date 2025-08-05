import Select from "./select.svelte";
import SelectContent from "./select-content.svelte";
import SelectItem from "./select-item.svelte";
import SelectTrigger from "./select-trigger.svelte";
import SelectValue from "./select-value.svelte";
import SelectSearchable from "./select-searchable.svelte";
import SelectMulti from "./select-multi.svelte";

export {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	SelectSearchable,
	SelectMulti,
	//
	Select as Root,
	SelectContent as Content,
	SelectItem as Item,
	SelectTrigger as Trigger,
	SelectValue as Value,
	SelectSearchable as Searchable,
	SelectMulti as Multi,
};

export type { SelectTriggerProps, SelectTriggerSize } from "./select-trigger.svelte";
export type { SelectOption, SearchableSelectProps } from "./select-searchable.svelte";
export type { MultiSelectProps } from "./select-multi.svelte";