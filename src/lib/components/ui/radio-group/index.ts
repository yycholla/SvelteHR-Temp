import RadioGroup from "./radio-group.svelte";
import RadioGroupItem from "./radio-group-item.svelte";

export {
	RadioGroup,
	RadioGroupItem,
	//
	RadioGroup as Root,
	RadioGroupItem as Item,
};

export type { RadioGroupProps, RadioGroupOrientation } from "./radio-group.svelte";
export type { RadioGroupItemProps, RadioGroupItemSize } from "./radio-group-item.svelte";