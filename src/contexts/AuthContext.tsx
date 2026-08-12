import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  updateProfile,
  type User,
} from "firebase/auth";
import { ref, get, set, update, push } from "firebase/database";
import { auth, db } from "../lib/firebase";

export interface UserProfile {
  fullName?: string;
  email?: string;
  level?: string;
  university?: string;
  department?: string;
  verified?: boolean;
  createdAt?: number;
  cgpa?: number;
  courseCount?: number;
}

interface SignupData {
  fullName: string;
  email: string;
  password: string;
  department: string;
  level: string;
  university: string;
}

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string): Promise<UserProfile | null> => {
    const snap = await get(ref(db, `profiles/${uid}`));
    return snap.val() as UserProfile | null;
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        setProfile(await loadProfile(u.uid));
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const snap = await get(ref(db, `profiles/${cred.user.uid}`));
    if (!snap.exists()) {
      await signOut(auth);
      throw new Error("Account not found. Please sign up first.");
    }
  };

  const signup = async (data: SignupData) => {
    const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
    await updateProfile(cred.user, { displayName: data.fullName });
    await sendEmailVerification(cred.user);
    await set(ref(db, `profiles/${cred.user.uid}`), {
      fullName: data.fullName,
      email: data.email,
      level: data.level,
      university: data.university,
      department: data.department,
      verified: false,
      createdAt: Date.now(),
    });
    await push(ref(db, `activities/${cred.user.uid}`), {
      title: "Welcome to Campus Core",
      description: "Your account has been created successfully.",
      timestamp: Date.now(),
      type: "profile",
    });
    setProfile(await loadProfile(cred.user.uid));
  };

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) setProfile(await loadProfile(user.uid));
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!user) return;
    await update(ref(db, `profiles/${user.uid}`), data);
    setProfile((prev) => (prev ? { ...prev, ...data } : data));
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, signup, logout, refreshProfile, updateProfileData }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
