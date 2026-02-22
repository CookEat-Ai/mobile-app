import { useState, useEffect } from 'react';
import apiService from '../services/api';
import { getUniqueDeviceId } from '../services/deviceStorage';

interface User {
  _id: string;
  mobileId: string;
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
      const mobileId = await getUniqueDeviceId();
      const response = await apiService.getCurrentUser(mobileId);
      
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
    } catch (error) {
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  const refreshUser = async () => {
    await checkAuthStatus();
  };

  return {
    ...authState,
    refreshUser,
  };
};
