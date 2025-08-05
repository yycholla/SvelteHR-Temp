import Card from "./card.svelte";
import CardContent from "./card-content.svelte";
import CardDescription from "./card-description.svelte";
import CardFooter from "./card-footer.svelte";
import CardHeader from "./card-header.svelte";
import CardTitle from "./card-title.svelte";
import CardSelectable from "./card-selectable.svelte";
import CardSkeleton from "./card-skeleton.svelte";

export {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	CardSelectable,
	CardSkeleton,
	//
	Card as Root,
	CardContent as Content,
	CardDescription as Description,
	CardFooter as Footer,
	CardHeader as Header,
	CardTitle as Title,
	CardSelectable as Selectable,
	CardSkeleton as Skeleton,
};

export type { 
	CardProps, 
	CardVariant, 
	CardPadding, 
	CardState 
} from "./card.svelte";

export type {
	SelectableCardProps
} from "./card-selectable.svelte";

export type {
	CardSkeletonProps
} from "./card-skeleton.svelte";