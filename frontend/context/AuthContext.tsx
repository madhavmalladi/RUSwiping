import React, { createContext, useContext, useEffect, useState } from 'react';
import { useGoogleAuth, handleGoogleResponse, signOut } from '@/utils/auth';
import { authApi, type User } from '@/utils/api';
import { getToken } from '@/utils/storage';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  promptGoogleSignIn: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [, googleResponse, promptAsync] = useGoogleAuth();

  // On mount, check if there's a stored JWT and fetch the current user
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const currentUser = await authApi.me();
          setUser(currentUser);
        }
      } catch {
        // Token expired or invalid — treat as logged out
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Handle Google OAuth redirect response
  useEffect(() => {
    if (!googleResponse) return;
    (async () => {
      try {
        const result = await handleGoogleResponse(googleResponse);
        if (result) {
          setUser(result.user);
        }
      } catch (err) {
        console.error('Google sign-in failed:', err);
      }
    })();
  }, [googleResponse]);

  async function promptGoogleSignIn() {
    await promptAsync();
  }

  async function logout() {
    await signOut();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, promptGoogleSignIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
