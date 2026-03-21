import { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  username: string;
  displayName: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
}

interface MockUser extends User {
  password: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Mock credentials — replace with Azure AD / MSAL later
const MOCK_USERS: MockUser[] = [
  { username: 'admin', password: 'demo', displayName: 'Admin User', role: 'Administrator' },
  { username: 'user', password: 'demo', displayName: 'Jane Smith', role: 'Viewer' },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('rmsb_user');
    return stored ? (JSON.parse(stored) as User) : null;
  });

  function login(username: string, password: string): { ok: boolean; error?: string } {
    const match = MOCK_USERS.find(
      (u) => u.username === username && u.password === password
    );
    if (!match) return { ok: false, error: 'Invalid username or password' };
    const { password: _, ...safeUser } = match;
    setUser(safeUser);
    localStorage.setItem('rmsb_user', JSON.stringify(safeUser));
    return { ok: true };
  }

  function logout(): void {
    setUser(null);
    localStorage.removeItem('rmsb_user');
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
