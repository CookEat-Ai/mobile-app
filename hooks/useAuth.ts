import { useState, useEffect } from 'react';
import apiService from '../services/api';

interface User {
  _id: string;
  firstName: string;
  email: string;
  subscriptionId?: string;
  subscriptionStatus?: string;
  plan?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      if (apiService.isAuthenticated()) {
        const response = await apiService.getCurrentUser();
        if (response.data) {
          setAuthState({
            user: response.data,
            isLoading: false,
            isAuthenticated: true,
          });
        } else {
          setAuthState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      } else {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    } catch (error) {
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await apiService.login(email, password);
      if (response.data) {
        await checkAuthStatus();
        return { success: true };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      return { success: false, error: 'Erreur de connexion' };
    }
  };

  const register = async (firstName: string, email: string, password: string) => {
    try {
      const response = await apiService.register(firstName, email, password);
      if (response.data) {
        await checkAuthStatus();
        return { success: true };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      return { success: false, error: 'Erreur d\'inscription' };
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  const refreshUser = async () => {
    await checkAuthStatus();
  };

  return {
    ...authState,
    login,
    register,
    logout,
    refreshUser,
  };
}; 