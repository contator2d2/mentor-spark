import { useEffect, useState, FormEvent } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { MessageCircle, Pin, Trash2, Send, Users, Sparkles, Loader2, Heart, ThumbsUp, Flame, Lightbulb, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const EMOJIS = [
  { e: "👍", I: ThumbsUp },
  { e: "❤️", I: Heart },
  { e: "🔥", I: Flame },
  { e: "💡", I: Lightbulb },
  { e: "🎉", I: PartyPopper },
];

interface Post {
  id: string;
  authorId: string;
  authorName?: string;
  authorAvatarUrl?: string;
  authorRole: string;
  title?: string;
  body: string;
  audience: string;
  pinned: boolean;
  locked: boolean;
  reactionCount: number;
  commentCount: number;
  createdAt: string;
  reactions: { emoji: string; count: number }[];
  myReactions: string[];
}

interface Comment {
  id: string;
  authorName?: string;
  authorAvatarUrl?: string;
  authorRole: string;
  body: string;
  createdAt: string;
}

interface Props {
  /** Quando true, renderiza versão "mentorado" sem alguns controles. */
  asMentorado?: boolean;
}

export default function CommunityFeed({ asMentorado = false }: Props) {
  const { user } = useAuth();
  const isMentor = user?.role === "mentor" || user?.role === "super_admin" || user?.role === "mentor_team";
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState({ title: "", body: "", audience: "all", pinned: false, locked: false });
  const [openComments, setOpenComments] = useState<Record<string, Comment[]>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    try {
      setPosts(await api<Post[]>("/community/posts"));
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function createPost(e: FormEvent) {
    e.preventDefault();
    if (!draft.body.trim()) return;
    try {
      await api("/community/posts", { method: "POST", body: draft });
      setDraft({ title: "", body: "", audience: "all", pinned: false, locked: false });
      setComposerOpen(false);
      load();
    } catch (err: any) { toast.error(err.message); }
  }

  async function react(postId: string, emoji: string) {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const has = p.myReactions.includes(emoji);
        const reactions = has
          ? p.reactions.map((r) => (r.emoji === emoji ? { ...r, count: Math.max(0, r.count - 1) } : r)).filter((r) => r.count > 0)
          : p.reactions.find((r) => r.emoji === emoji)
            ? p.reactions.map((r) => (r.emoji === emoji ? { ...r, count: r.count + 1 } : r))
            : [...p.reactions, { emoji, count: 1 }];
        return {
          ...p,
          myReactions: has ? p.myReactions.filter((m) => m !== emoji) : [...p.myReactions, emoji],
          reactions,
          reactionCount: has ? Math.max(0, p.reactionCount - 1) : p.reactionCount + 1,
        };
      })
    );
    try { await api(`/community/posts/${postId}/react`, { method: "POST", body: { emoji } }); }
    catch (e: any) { toast.error(e.message); load(); }
  }

  async function toggleComments(postId: string) {
    if (openComments[postId]) {
      setOpenComments((prev) => { const n = { ...prev }; delete n[postId]; return n; });
      return;
    }
    try {
      const list = await api<Comment[]>(`/community/posts/${postId}/comments`);
      setOpenComments((prev) => ({ ...prev, [postId]: list }));
    } catch (e: any) { toast.error(e.message); }
  }

  async function postComment(postId: string) {
    const body = commentDraft[postId]?.trim();
    if (!body) return;
    try {
      const c = await api<Comment>(`/community/posts/${postId}/comments`, { method: "POST", body: { body } });
      setOpenComments((prev) => ({ ...prev, [postId]: [...(prev[postId] || []), c] }));
      setCommentDraft((prev) => ({ ...prev, [postId]: "" }));
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p));
    } catch (e: any) { toast.error(e.message); }
  }

  async function pin(postId: string) {
    try {
      await api(`/community/posts/${postId}/pin`, { method: "POST" });
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function remove(postId: string) {
    if (!confirm("Excluir este post?")) return;
    try {
      await api(`/community/posts/${postId}`, { method: "DELETE" });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-4">
      {!asMentorado && (
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" /> Comunidade
          </h1>
          <p className="text-muted-foreground">Feed em tempo real com seus mentorados.</p>
        </div>
      )}

      {/* Composer */}
      <Card className="p-4">
        {!composerOpen ? (
          <button
            onClick={() => setComposerOpen(true)}
            className="w-full text-left text-sm text-muted-foreground hover:text-foreground transition py-2 px-3 rounded-md bg-muted/30 hover:bg-muted/50 flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {asMentorado ? "Compartilhe algo com a comunidade..." : "Anunciar, perguntar ou compartilhar..."}
          </button>
        ) : (
          <form onSubmit={createPost} className="space-y-3">
            {isMentor && (
              <Input
                placeholder="Título (opcional)"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            )}
            <Textarea
              autoFocus
              rows={4}
              placeholder="No que está pensando?"
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            />
            {isMentor && (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Público:</Label>
                  <Select value={draft.audience} onValueChange={(v) => setDraft({ ...draft, audience: v })}>
                    <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos (leads + mentorados)</SelectItem>
                      <SelectItem value="clients">Apenas mentorados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex items-center gap-1 text-xs">
                  <Switch checked={draft.pinned} onCheckedChange={(v) => setDraft({ ...draft, pinned: v })} />
                  Fixar
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <Switch checked={draft.locked} onCheckedChange={(v) => setDraft({ ...draft, locked: v })} />
                  Bloquear comentários
                </label>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setComposerOpen(false)}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={!draft.body.trim()}><Send className="h-3 w-3 mr-1" />Publicar</Button>
            </div>
          </form>
        )}
      </Card>

      {loading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}

      {!loading && posts.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          Nenhum post ainda. Seja o primeiro!
        </Card>
      )}

      {posts.map((p) => {
        const initials = (p.authorName || "?").slice(0, 2).toUpperCase();
        const isAuthor = p.authorId === user?.id;
        return (
          <Card key={p.id} className={cn("p-4 space-y-3", p.pinned && "border-primary/40 bg-primary/5")}>
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10">
                {p.authorAvatarUrl && <AvatarImage src={p.authorAvatarUrl} />}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{p.authorName || "Anônimo"}</span>
                  {(p.authorRole === "mentor" || p.authorRole === "super_admin") && <Badge variant="secondary" className="text-[10px] h-5">Mentor</Badge>}
                  {p.pinned && <Badge className="text-[10px] h-5 bg-primary"><Pin className="h-2.5 w-2.5 mr-0.5" />Fixado</Badge>}
                  <span className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
                </div>
                {p.title && <div className="font-display text-lg mt-1">{p.title}</div>}
              </div>
              {(isMentor || isAuthor) && (
                <div className="flex gap-1">
                  {isMentor && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => pin(p.id)} title={p.pinned ? "Desafixar" : "Fixar"}><Pin className="h-3 w-3" /></Button>}
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(p.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </div>
              )}
            </div>

            <div className="text-sm whitespace-pre-wrap">{p.body}</div>

            <div className="flex items-center gap-1 flex-wrap pt-2 border-t border-border/50">
              {EMOJIS.map(({ e }) => {
                const r = p.reactions.find((x) => x.emoji === e);
                const mine = p.myReactions.includes(e);
                return (
                  <button
                    key={e}
                    onClick={() => react(p.id, e)}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-full text-xs transition",
                      mine ? "bg-primary/15 text-primary border border-primary/30" : "hover:bg-muted"
                    )}
                  >
                    <span>{e}</span>
                    {r && <span className="font-semibold">{r.count}</span>}
                  </button>
                );
              })}
              <button
                onClick={() => toggleComments(p.id)}
                className="ml-auto flex items-center gap-1 px-2 py-1 rounded-full text-xs hover:bg-muted transition"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                {p.commentCount} {p.commentCount === 1 ? "comentário" : "comentários"}
              </button>
            </div>

            {openComments[p.id] !== undefined && (
              <div className="space-y-2 pt-2 border-t border-border/50 animate-fade-in">
                {openComments[p.id].map((c) => (
                  <div key={c.id} className="flex gap-2 items-start">
                    <Avatar className="h-7 w-7">
                      {c.authorAvatarUrl && <AvatarImage src={c.authorAvatarUrl} />}
                      <AvatarFallback className="text-[10px]">{(c.authorName || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 bg-muted/40 rounded-2xl px-3 py-1.5">
                      <div className="text-xs font-semibold flex items-center gap-1">
                        {c.authorName || "Anônimo"}
                        {(c.authorRole === "mentor" || c.authorRole === "super_admin") && <Badge variant="secondary" className="text-[9px] h-4 px-1">Mentor</Badge>}
                      </div>
                      <div className="text-sm whitespace-pre-wrap">{c.body}</div>
                    </div>
                  </div>
                ))}
                {(!p.locked || isMentor) && (
                  <div className="flex gap-2 pt-1">
                    <Input
                      placeholder="Comentar..."
                      value={commentDraft[p.id] || ""}
                      onChange={(e) => setCommentDraft((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); postComment(p.id); } }}
                      className="h-8 text-sm"
                    />
                    <Button size="sm" className="h-8" onClick={() => postComment(p.id)}><Send className="h-3 w-3" /></Button>
                  </div>
                )}
                {p.locked && !isMentor && (
                  <div className="text-xs text-muted-foreground italic text-center py-1">Comentários bloqueados pelo mentor.</div>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
