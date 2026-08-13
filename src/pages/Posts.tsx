import { useEffect, useState, useCallback, FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase, Post, Profile } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { sanitizeText, stripHtml } from "../lib/sanitize";
import OrbitSpinner from "../components/OrbitSpinner";

interface PostWithAuthor extends Post {
  author_name?: string;
}

export default function Posts() {
  const { user, profile, signOut } = useAuth();
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string, type = "success") => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadPosts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("posts")
      .select("*, profiles!inner(username)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Failed to load posts:", error.message);
      setPosts([]);
    } else if (data) {
      const mapped: PostWithAuthor[] = data.map((p: Record<string, unknown> & { id: string; user_id: string; title: string; content: string; created_at: string }) => ({
        id: p.id,
        user_id: p.user_id,
        title: p.title,
        content: p.content,
        created_at: p.created_at,
        author_name: (p.profiles as { username: string })?.username || "Anonymous",
      }));
      setPosts(mapped);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const cleanTitle = stripHtml(newTitle.trim()).substring(0, 200);
    const cleanContent = stripHtml(newContent.trim()).substring(0, 2000);

    if (!cleanTitle || !cleanContent) {
      showToast("Title and content are required.", "error");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("posts").insert({
      title: cleanTitle,
      content: cleanContent,
    });

    setSubmitting(false);
    if (error) {
      showToast("Failed to create post. Please try again.", "error");
    } else {
      setNewTitle("");
      setNewContent("");
      showToast("Post published!");
      loadPosts();
    }
  };

  const startEdit = (post: PostWithAuthor) => {
    setEditingId(post.id);
    setEditTitle(post.title);
    setEditContent(post.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditContent("");
  };

  const handleSaveEdit = async (postId: string) => {
    const cleanTitle = stripHtml(editTitle.trim()).substring(0, 200);
    const cleanContent = stripHtml(editContent.trim()).substring(0, 2000);

    if (!cleanTitle || !cleanContent) {
      showToast("Title and content are required.", "error");
      return;
    }

    // Ownership check: verify the post belongs to the current user before updating.
    // RLS also enforces this server-side, but we check client-side for better UX.
    const { data: ownCheck } = await supabase
      .from("posts")
      .select("user_id")
      .eq("id", postId)
      .maybeSingle();

    if (!ownCheck || ownCheck.user_id !== user?.id) {
      showToast("You can only edit your own posts.", "error");
      cancelEdit();
      return;
    }

    const { error } = await supabase
      .from("posts")
      .update({ title: cleanTitle, content: cleanContent })
      .eq("id", postId);

    if (error) {
      showToast("Failed to update post.", "error");
    } else {
      showToast("Post updated!");
      cancelEdit();
      loadPosts();
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post? This cannot be undone.")) return;

    // Ownership check before delete
    const { data: ownCheck } = await supabase
      .from("posts")
      .select("user_id")
      .eq("id", postId)
      .maybeSingle();

    if (!ownCheck || ownCheck.user_id !== user?.id) {
      showToast("You can only delete your own posts.", "error");
      return;
    }

    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) {
      showToast("Failed to delete post.", "error");
    } else {
      showToast("Post deleted.");
      loadPosts();
    }
  };

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  const isPremium = profile?.premium_until && new Date(profile.premium_until) > new Date();

  return (
    <div className="app-layout">
      <nav className="navbar">
        <div className="container nav-inner">
          <Link to="/posts" className="logo">
            <div className="logo-mark">O</div>
            Orbit
          </Link>
          <div className="nav-links">
            <Link to="/posts" className="active">Posts</Link>
            <Link to="/invite">Invite & Earn</Link>
          </div>
          <div className="nav-actions">
            {isPremium && (
              <span className="premium-badge">
                <span style={{ fontSize: 14 }}>star</span>
                Premium
              </span>
            )}
            <Link to="/invite" className="btn btn-ghost btn-sm">Invite & Earn</Link>
            <button className="btn btn-danger btn-sm" onClick={signOut}>Sign Out</button>
          </div>
        </div>
      </nav>

      <div className="container posts-page">
        <div className="page-head">
          <h1>Community Posts</h1>
          <p>Share your thoughts with the community</p>
        </div>

        <div className="post-composer">
          <h3>Create a Post</h3>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <input
                className="form-input"
                type="text"
                placeholder="Post title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                maxLength={200}
                required
              />
            </div>
            <div className="form-group">
              <textarea
                className="form-input"
                placeholder="What's on your mind?"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                maxLength={2000}
                required
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? <OrbitSpinner label="" /> : "Publish Post"}
            </button>
          </form>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
            <OrbitSpinner label="Loading posts" />
          </div>
        ) : posts.length === 0 ? (
          <div className="empty-state">
            <div className="icon" style={{ color: "var(--text-dim)" }}>note</div>
            <p>No posts yet. Be the first to share something!</p>
          </div>
        ) : (
          posts.map((post) => {
            const isOwner = post.user_id === user?.id;
            // Sanitize all user-submitted content before rendering
            const safeTitle = sanitizeText(post.title);
            const safeContent = sanitizeText(post.content);
            const safeAuthor = sanitizeText(post.author_name || "Anonymous");

            return (
              <div className="post-card" key={post.id}>
                <div className="post-header">
                  <div className="post-author">
                    <div className="post-avatar">{safeAuthor.charAt(0).toUpperCase()}</div>
                    <div>
                      <div className="post-author-name">{safeAuthor}</div>
                      <div className="post-date">{formatDate(post.created_at)}</div>
                    </div>
                  </div>
                  {isOwner && editingId !== post.id && (
                    <div className="post-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => startEdit(post)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(post.id)}>Delete</button>
                    </div>
                  )}
                </div>

                {editingId === post.id ? (
                  <div className="edit-form">
                    <div className="form-group">
                      <input
                        className="form-input"
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        maxLength={200}
                      />
                    </div>
                    <div className="form-group">
                      <textarea
                        className="form-input"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        maxLength={2000}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => handleSaveEdit(post.id)}>Save</button>
                      <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3>{safeTitle}</h3>
                    <p className="post-content">{safeContent}</p>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {toast && <div className={`toast ${toast.includes("Failed") || toast.includes("only") ? "error" : "success"}`}>{toast}</div>}
    </div>
  );
}
