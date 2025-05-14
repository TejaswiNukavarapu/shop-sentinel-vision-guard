
import React, { createContext, useState, useContext, useEffect } from 'react';
import { UserProfile } from '@/types';
import { toast } from '@/components/ui/sonner';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (userData: UserProfile) => void;
  logout: () => void;
  register: (userData: Omit<UserProfile, 'id' | 'createdAt'>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check local storage for user data
    const storedUser = localStorage.getItem('shopGuardUser');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        localStorage.removeItem('shopGuardUser');
      }
    }
    setLoading(false);
  }, []);

  const login = (userData: UserProfile) => {
    setUser(userData);
    localStorage.setItem('shopGuardUser', JSON.stringify(userData));
    
    // Log the event
    const eventData = {
      id: Date.now().toString(),
      timestamp: new Date(),
      type: 'login' as const,
      details: `${userData.firstName} ${userData.lastName} logged in`
    };
    
    const events = JSON.parse(localStorage.getItem('shopGuardEvents') || '[]');
    events.push(eventData);
    localStorage.setItem('shopGuardEvents', JSON.stringify(events));
    
    toast.success('Login successful!');
    navigate('/dashboard');
  };

  const logout = () => {
    if (user) {
      // Log the event
      const eventData = {
        id: Date.now().toString(),
        timestamp: new Date(),
        type: 'logout' as const,
        details: `${user.firstName} ${user.lastName} logged out`
      };
      
      const events = JSON.parse(localStorage.getItem('shopGuardEvents') || '[]');
      events.push(eventData);
      localStorage.setItem('shopGuardEvents', JSON.stringify(events));
    }
    
    setUser(null);
    localStorage.removeItem('shopGuardUser');
    toast.info('You have been logged out');
    navigate('/');
  };

  const register = async (userData: Omit<UserProfile, 'id' | 'createdAt'>) => {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newUser: UserProfile = {
        ...userData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
      };
      
      // Store user in localStorage
      localStorage.setItem('shopGuardUser', JSON.stringify(newUser));
      setUser(newUser);
      
      // Log the registration event
      const eventData = {
        id: Date.now().toString(),
        timestamp: new Date(),
        type: 'login' as const,
        details: `${newUser.firstName} ${newUser.lastName} registered and logged in`
      };
      
      const events = JSON.parse(localStorage.getItem('shopGuardEvents') || '[]');
      events.push(eventData);
      localStorage.setItem('shopGuardEvents', JSON.stringify(events));
      
      toast.success('Registration successful! Welcome to ShopGuard.');
      navigate('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Registration failed. Please try again.');
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
