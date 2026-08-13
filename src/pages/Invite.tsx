import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase, Profile } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { sanitizeText } from "../lib/sanitize";
import OrbitSpinner from "../components/OrbitSpinner";

const INVITE_TARGET = 10;

export default function Invite() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [invitedUsers, setInvitedUsers] = useState<Profile[]>([]);
  const [inviteCount, setInviteCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const loadInvites = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: invites, error } = await supabase
      .from("invites")
      .select("invited_id, created_at, profiles!invited_id(username, created_at)")
      .eq("inviter_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load invites:", error.message);
      setInvitedUsers([]);
      setInviteCount(0);
    } else if (invites) {
      const mapped: Profile[] = invites.map((inv: Record<string, unknown> & { invited_id: string }) => ({
        id: inv.invited_id as string,
        username: (inv.profiles as { username: string })?.username || "Anonymous",
        invite_code: "",
        premium_until: null,
        invited_by: null,
        created_at: (inv as { created_at?: string }).created_at || new Date().toISOString(),
      }));
      setInvitedUsers(mapped);
      setInviteCount(mapped.length);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  const inviteCode = profile?.invite_code || "--------";
  const inviteLink = `${window.location.origin}/signup?ref=${inviteCode}`;
  const progress = Math.min((inviteCount / INVITE_TARGET) * 100, 100);
  const isPremium = profile?.premium_until && new Date(profile.premium_until) > new Date();
  const premiumDaysLeft = isPremium
    ? Math.ceil((new Date(profile!.premium_until!).getTime() - Date.now()) / 86400000)
    : 0;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = inviteLink;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (ts: string) => new Date(ts).toLocaleDateString();

  return (
    <div className="app-layout">
      <nav className="navbar">
        <div className="container nav-inner">
          <Link to="/posts" className="logo">
            <div className="logo-mark">O</div>
            Orbit
          </Link>
          <div className="nav-links">
            <Link to="/posts">Posts</Link>
            <Link to="/invite" className="active">Invite & Earn</Link>
          </div>
          <div className="nav-actions">
            {isPremium && (
              <span className="premium-badge">
                <span style={{ fontSize: 14 }}>star</span>
                Premium ({premiumDaysLeft}d left)
              </span>
            )}
            <Link to="/posts" className="btn btn-ghost btn-sm">Posts</Link>
            <button className="btn btn-danger btn-sm" onClick={signOut}>Sign Out</button>
          </div>
        </div>
      </nav>

      <div className="container invite-page">
        <div className="invite-hero">
          <h1>Invite Friends, Earn Premium</h1>
          <p>
            Share your unique invite code with friends. When {INVITE_TARGET} people sign up
            using your code, you unlock a full week of premium features — absolutely free.
          </p>
        </div>

        {isPremium && (
          <div className="reward-banner">
            <div className="reward-icon" style={{ color: "var(--warning)" }}>star</div>
            <div>
              <h4>Premium is active!</h4>
              <p>You have {premiumDaysLeft} day{premiumDaysLeft !== 1 ? "s" : ""} of premium remaining. Keep inviting to extend it.</p>
            </div>
          </div>
        )}

        <div className="invite-code-card">
          <div className="invite-code-label">Your Unique Invite Code</div>
          <div className="invite-code-display">{sanitizeText(inviteCode)}</div>
          <div className="invite-link-box">
            <code>{sanitizeText(inviteLink)}</code>
            <button className="btn btn-primary btn-sm" onClick={copyLink}>
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 12 }}>
            Share this link with friends. When they sign up, they'll be automatically linked to you.
          </p>
        </div>

        <div className="progress-card">
          <h3>Your Progress</h3>
          <div className="progress-bar-wrap">
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="progress-stats">
            <div className="stat">
              <div className="stat-num" style={{ color: "var(--primary)" }}>{inviteCount}</div>
              <div className="stat-label">Invited</div>
            </div>
            <div className="stat">
              <div className="stat-num" style={{ color: "var(--text-muted)" }}>{INVITE_TARGET - inviteCount > 0 ? INVITE_TARGET - inviteCount : 0}</div>
              <div className="stat-label">Remaining</div>
            </div>
            <div className="stat">
              <div className="stat-num" style={{ color: isPremium ? "var(--success)" : "var(--text-dim)" }}>
                {isPremium ? "Active" : "Locked"}
              </div>
              <div className="stat-label">Premium Status</div>
            </div>
          </div>
          {inviteCount >= INVITE_TARGET && !isPremium && (
            <div className="auth-success" style={{ marginTop: 16 }}>
              You've reached {INVITE_TARGET} invites! Your premium is being activated.
            </div>
          )}
        </div>

        <div className="progress-card">
          <h3>People You've Invited ({invitedUsers.length})</h3>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
              <OrbitSpinner label="Loading invites" />
            </div>
          ) : invitedUsers.length === 0 ? (
            <div className="empty-state" style={{ padding: "32px 16px" }}>
              <p>No invites yet. Share your code to get started!</p>
            </div>
          ) : (
            <div className="invited-list">
              {invitedUsers.map((invited, i) => (
                <div className="invited-row" key={i}>
                  <div className="avatar">{sanitizeText(invited.username).charAt(0).toUpperCase()}</div>
                  <div className="name">{sanitizeText(invited.username)}</div>
                  <div className="date">Joined {formatDate(invited.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="reward-banner">
          <div className="reward-icon" style={{ color: "var(--warning)" }}>gift</div>
          <div>
            <h4>How it works</h4>
            <p>Invite {INVITE_TARGET} friends with your code to unlock 1 week of premium. Each friend must create an account using your link.</p>
          </div>
        </div>
      </div>

      {copied && <div className="toast success">Invite link copied to clipboard!</div>}
    </div>
  );
}
