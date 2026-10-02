import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function UserAvatar({
  username,
  displayName,
  image,
  className,
  toProfile = true,
}: {
  username: string;
  displayName: string;
  image: string | null;
  className?: string;
  toProfile?: boolean;
}) {
  const letter = (displayName || username || "N").charAt(0).toUpperCase();
  const node = (
    <Avatar className={cn("size-10", className)}>
      {image ? <AvatarImage src={image} alt="" /> : null}
      <AvatarFallback>{letter}</AvatarFallback>
    </Avatar>
  );
  if (!toProfile) return node;
  return (
    <Link
      to="/u/$username"
      params={{ username }}
      className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {node}
    </Link>
  );
}
