import { createFileRoute } from "@tanstack/react-router";
import { Feed } from "@/components/feed";
import { SignedShell } from "@/components/signed-shell";
import { useMe } from "@/hooks/use-me";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <SignedShell guest="landing">
      <HomeFeed />
    </SignedShell>
  );
}

function HomeFeed() {
  const { me } = useMe();
  if (!me) return null;
  return <Feed me={me} />;
}
