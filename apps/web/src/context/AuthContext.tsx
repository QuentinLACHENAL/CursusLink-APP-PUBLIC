'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: any;
  token: string | null;
  login: (token: string, userData: any) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
  isLoading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Restaurer la session au chargement
    const storedToken = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user_data');
    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
      } catch (e) {
        // Données corrompues - nettoyer le storage
        console.error('Failed to parse stored user data:', e);
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_data');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, userData: any) => {
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('access_token', newToken);
    localStorage.setItem('user_data', JSON.stringify(userData));
    router.push('/');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_data');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
