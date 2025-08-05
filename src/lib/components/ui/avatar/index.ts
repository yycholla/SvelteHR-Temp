import Avatar from "./avatar.svelte";
import AvatarFallback from "./avatar-fallback.svelte";
import AvatarImage from "./avatar-image.svelte";

export {
	Avatar,
	AvatarFallback,
	AvatarImage,
	//
	Avatar as Root,
	AvatarFallback as Fallback,
	AvatarImage as Image,
};

export type { AvatarProps, AvatarSize } from "./avatar.svelte";