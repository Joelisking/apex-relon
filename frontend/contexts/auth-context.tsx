'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import Cookies from 'js-cookie';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  teamId?: string;
  phone?: string | null;
  mustCompleteProfile?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  permissions: string[];
  login: (token: string, user: User, permissions?: string[]) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  hasPermission: (permission: string) => boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPermissions = useCallback(async (authToken: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/permissions`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPermissions(data.permissions || []);
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    }
  }, []);

  // Restore session from cookies on mount
  useEffect(() => {
    const storedToken = Cookies.get('token');
    const storedUser = Cookies.get('user');

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setToken(storedToken);
        setUser(parsedUser);
        fetchPermissions(storedToken);
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        Cookies.remove('token');
        Cookies.remove('user');
      }
    }

    setIsLoading(false);
  }, [fetchPermissions]);

  const login = (
    newToken: string,
    newUser: User,
    newPermissions?: string[],
  ) => {
    setToken(newToken);
    setUser(newUser);

    if (newPermissions) {
      setPermissions(newPermissions);
    } else {
      fetchPermissions(newToken);
    }

    // Store in cookies with 7 day expiry
    Cookies.set('token', newToken, { expires: 7, sameSite: 'lax' });
    Cookies.set('user', JSON.stringify(newUser), {
      expires: 7,
      sameSite: 'lax',
    });
  };

  const updateUser = (updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      Cookies.set('user', JSON.stringify(updated), {
        expires: 7,
        sameSite: 'lax',
      });
      return updated;
    });
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setPermissions([]);
    Cookies.remove('token');
    Cookies.remove('user');
  };

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user) return false;
      // CEO always has all permissions
      if (user.role === 'CEO') return true;
      return permissions.includes(permission);
    },
    [user, permissions],
  );

  const value = {
    user,
    token,
    permissions,
    login,
    logout,
    updateUser,
    hasPermission,
    isAuthenticated: !!token && !!user,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
