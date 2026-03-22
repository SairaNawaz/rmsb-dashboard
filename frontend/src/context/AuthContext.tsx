import { createContext, useContext, useState, ReactNode } from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../auth/msalConfig';

interface User {
  username: string;
  displayName: string;
  role: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => { ok: boolean; error?: string };
  loginWithMicrosoft: () => Promise<void>;
  logout: () => void;
}

interface MockUser extends User {
  password: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Mock credentials — fallback for local dev / admin access
const MOCK_USERS: MockUser[] = [
  { username: 'admin', password: 'demo', displayName: 'Admin User', role: 'Administrator' },
  { username: 'user',  password: 'demo', displayName: 'Jane Smith',  role: 'Viewer' },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const { instance } = useMsal();

  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('rmsb_user');
    return stored ? (JSON.parse(stored) as User) : null;
  });

  function saveUser(u: User) {
    setUser(u);
    localStorage.setItem('rmsb_user', JSON.stringify(u));
  }

  // Mock login (admin backdoor)
  function login(username: string, password: string): { ok: boolean; error?: string } {
    const match = MOCK_USERS.find(
      (u) => u.username === username && u.password === password
    );
    if (!match) return { ok: false, error: 'Invalid username or password' };
    const { password: _, ...safeUser } = match;
    saveUser(safeUser);
    return { ok: true };
  }

  // Microsoft login via MSAL popup
  async function loginWithMicrosoft(): Promise<void> {
    const result = await instance.loginPopup(loginRequest);
    const account = result.account;
    saveUser({
      username: account.username,
      displayName: account.name ?? account.username,
      role: 'Viewer', // default role — extend with Azure AD app roles later
      email: account.username,
    });
  }

  function logout(): void {
    setUser(null);
    localStorage.removeItem('rmsb_user');
    // Sign out of MSAL session if active
    const accounts = instance.getAllAccounts();
    if (accounts.length > 0) {
      instance.logoutPopup({ account: accounts[0] }).catch(() => {});
    }
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, loginWithMicrosoft, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
