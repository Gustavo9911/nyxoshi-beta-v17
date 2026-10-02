import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Heart, Reply } from "lucide-react";
import { SignedShell } from "@/components/signed-shell";
import { PostCard } from "@/components/post-card";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FeedSkeleton } from "@/components/feed";
import { useMe } from "@/hooks/use-me";
import { createComment, getPost, listComments, toggleCommentReaction } from "@/lib/nyxoshi/server";
import { relativeTime } from "@/lib/nyxoshi/time";

export const Route = createFileRoute("/post/$postId")({
  component: PostPage,
});

function PostPage() {
  return (
    <SignedShell>
      <PostInner />
    </SignedShell>
  );
}

function PostInner() {
  const { postId } = Route.useParams();
  const { me } = useMe();
  const queryClient = useQueryClient();
  const post = useQuery({
    queryKey: ["post", postId],
    queryFn: () => getPost({ data: postId }),
  });
  const comments = useQuery({
    queryKey: ["comments", postId],
    queryFn: () => listComments({ data: postId }),
  });
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);

  async function submit() {
    if (!body.trim()) return;
    setBusy(true);
    try {
      await createComment({ data: { postId, body, parentId: replyTo } });
      setBody("");
      setReplyTo(null);
      void queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      void queryClient.invalidateQueries({ queryKey: ["post", postId] });
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível comentar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-bg/85 px-3 py-3 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          onClick={() => history.back()}
        >
          <ArrowLeft className="size-4" />
          <span className="sr-only">Voltar</span>
        </Button>
        <h1 className="font-display text-xl tracking-tight">Publicação</h1>
      </header>
      {post.isLoading ? (
        <FeedSkeleton />
      ) : !post.data ? (
        <p className="px-6 py-16 text-center text-sm text-muted">
          Esta publicação não existe mais.
        </p>
      ) : (
        <>
          <PostCard
            post={post.data}
            viewerId={me?.userId ?? null}
            onChanged={() => void post.refetch()}
          />
          {me ? (
            <div className="flex gap-3 border-b border-border px-4 py-4">
              <UserAvatar
                username={me.username}
                displayName={me.displayName}
                image={me.image}
              />
              <div className="min-w-0 flex-1">
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value.slice(0, 300))}
                  placeholder={replyTo ? "Respondendo ao comentário…" : "Escreva um comentário"}
                  className="min-h-20"
                />
                <div className="mt-2 flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => void submit()}
                    disabled={busy || !body.trim()}
                  >
                    Responder
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
          {comments.data?.map((comment) => (
            <article key={comment.id} className={`flex gap-3 border-b border-border px-4 py-4 ${comment.parentId ? "ml-8 bg-secondary/20" : ""}`}>
              <UserAvatar username={comment.author.username} displayName={comment.author.displayName} image={comment.author.image} className="size-9" />
              <div className="min-w-0 flex-1">
                <p className="text-sm"><span className="font-medium">{comment.author.displayName}</span>{" "}<span className="text-muted">@{comment.author.username}</span><span className="text-subtle"> · {relativeTime(comment.createdAt)}</span></p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{comment.body}</p>
                <div className="mt-2 flex items-center gap-1">
                  {me ? <button type="button" onClick={()=>void toggleCommentReaction({data:{id:comment.id,reaction:"like"}}).then(()=>queryClient.invalidateQueries({queryKey:["comments",postId]}))} className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${comment.reactedByMe?"text-like":"text-muted hover:text-fg"}`}><Heart className={`size-3.5 ${comment.reactedByMe?"fill-current":""}`}/>{comment.reactionCount}</button> : null}
                  {me ? <button type="button" onClick={()=>{setReplyTo(comment.id); window.scrollTo({top:0,behavior:"smooth"});}} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted hover:text-fg"><Reply className="size-3.5"/>Responder</button> : null}
                  {comment.replyCount ? <span className="px-2 text-xs text-muted">{comment.replyCount} resposta(s)</span> : null}
                </div>
              </div>
            </article>
          ))}
        </>
      )}
    </div>
  );
}
