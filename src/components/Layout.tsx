import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

const menuLinks = [
  ["/cgpa", "CGPA Calculator", "calculate"], ["/assignment", "Assignments", "assignment"],
  ["/discussions", "Discussions", "forum"], ["/download", "Downloads", "download"],
  ["/news", "News Feed", "newspaper"], ["/pq", "Past Questions", "quiz"],
  ["/skillswap", "SkillSwap", "swap_horiz"], ["/subscriptions", "Subscriptions", "star"],
];
const bottomLinks = [["/", "Home", "home"], ["/calendar", "Calendar", "calendar_month"], ["/note", "Notes", "book"], ["/chatbot", "AI Chat", "chat"], ["/profile", "Profile", "person"]];

export default function Layout() {
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) && !buttonRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to sign out?")) {
      await logout();
      navigate("/login");
    }
  };

  return <div className="page-body">
    <div className="animated-bg"><div className="animated-blob blob-1" /><div className="animated-blob blob-2" /><div className="animated-blob blob-3" /></div>
    <header className="top-navbar">
      <Link to="/" className="navbar-brand">Campus Core</Link>
      <div className="navbar-actions">
        <button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle theme"><span className="material-symbols-rounded">{theme === "dark" ? "dark_mode" : "light_mode"}</span></button>
        <button ref={buttonRef} className="menu-btn" onClick={() => setOpen((value) => !value)} aria-label="Open menu"><span className="material-symbols-rounded">menu</span></button>
      </div>
    </header>
    {open && <nav className="nav-dropdown" ref={menuRef}>
      {menuLinks.map(([to, label, icon]) => <Link key={to} to={to} className="dropdown-item"><span className="material-symbols-rounded">{icon}</span>{label}</Link>)}
      <div className="dropdown-divider" />
      <Link to="/privacy" className="dropdown-item"><span className="material-symbols-rounded">privacy_tip</span>Privacy Policy</Link>
      <Link to="/support" className="dropdown-item"><span className="material-symbols-rounded">support_agent</span>Support</Link>
      <div className="dropdown-divider" />
      <button className="dropdown-item dropdown-danger" onClick={handleLogout}><span className="material-symbols-rounded">logout</span>Sign Out</button>
    </nav>}
    <main className="main-content"><Outlet /></main>
    <nav className="bottom-nav">{bottomLinks.map(([to, label, icon]) => {
      const active = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
      return <Link key={to} to={to} className={`nav-item ${active ? "active" : ""}`}><div className="nav-icon-wrap"><span className="material-symbols-rounded">{icon}</span></div><span className="nav-label">{label}</span></Link>;
    })}</nav>
  </div>;
}
