import { useState, FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { sanitizeUsername, isValidInviteCode } from "../lib/sanitize";
import OrbitSpinner from "../components/OrbitSpinner";

export default function Signup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const presetInvite = params.get("ref") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [inviteCode, setInviteCode] = useState(presetInvite.toUpperCase());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = sanitizeUsername(username);
    if (cleanUsername.length < 2) {
      setError("Please enter a valid username (at least 2 characters).");
      return;
    }

    if (inviteCode && !isValidInviteCode(inviteCode)) {
      setError("Invite code must be 8 alphanumeric characters.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const { error } = await signUp(email.trim(), password, cleanUsername, inviteCode || undefined);
    setLoading(false);

    if (error) {
      setError(error);
    } else {
      navigate("/posts");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-card">
        <Link to="/" className="logo" style={{ justifyContent: "center", marginBottom: 24 }}>
          <div className="logo-mark">O</div>
          Orbit
        </Link>
        <h1>Create your account</h1>
        <p className="subtitle">Join the community and start earning rewards</p>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              className="form-input"
              type="text"
              placeholder="Your display name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              maxLength={50}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={100}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              maxLength={100}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Invite Code (optional)</label>
            <input
              className="form-input"
              type="text"
              placeholder="Enter a friend's code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              maxLength={8}
            />
          </div>
          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? <OrbitSpinner label="" /> : "Create Account"}
          </button>
        </form>
        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
