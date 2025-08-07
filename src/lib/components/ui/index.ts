// Component re-exports
// Import components individually to avoid naming conflicts
// Example: import { Button } from "$lib/components/ui/button";

export { Alert, AlertDescription, AlertTitle } from "./alert/index.js";
export { Avatar, AvatarFallback, AvatarImage } from "./avatar/index.js";
export { Badge } from "./badge/index.js";
export { 
	Button, 
	ButtonGroup,
	buttonVariants,
	buttonGroupVariants,
	type ButtonProps,
	type ButtonSize,
	type ButtonVariant,
	type ButtonGroupProps,
	type ButtonGroupOrientation,
	type ButtonGroupSize,
	type ButtonGroupVariant
} from "./button/index.js";
export { 
	Card, 
	CardContent, 
	CardDescription, 
	CardFooter, 
	CardHeader, 
	CardTitle,
	CardSelectable,
	CardSkeleton,
	type CardProps,
	type CardVariant,
	type CardPadding,
	type CardState,
	type SelectableCardProps,
	type CardSkeletonProps
} from "./card/index.js";
export { Checkbox } from "./checkbox/index.js";
export { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./dialog/index.js";
export { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./dropdown-menu/index.js";
export { Input, InputGroup } from "./input/index.js";
export { Label } from "./label/index.js";
export { Progress } from "./progress/index.js";
export { RadioGroup, RadioGroupItem } from "./radio-group/index.js";
export { 
	Select, 
	SelectContent, 
	SelectItem, 
	SelectTrigger, 
	SelectValue,
	SelectSearchable,
	SelectMulti,
	type SelectTriggerProps,
	type SelectTriggerSize,
	type SelectOption,
	type SearchableSelectProps,
	type MultiSelectProps
} from "./select/index.js";
export { Separator } from "./separator/index.js";  
export { Skeleton } from "./skeleton/index.js";
export { Switch } from "./switch/index.js";
export { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs/index.js";
export { Textarea } from "./textarea/index.js";
export { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip/index.js";

// Design system types
export type * from "$lib/types/design-system.js";

// For component-specific types, import from individual component files:
// import type { ButtonProps } from "$lib/components/ui/button";
// import type { CardProps } from "$lib/components/ui/card";
// import type { InputVariant } from "$lib/components/ui/input";