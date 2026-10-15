import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  roles: string[];
  territoryType: string | null;
  isAuthenticated: boolean;

  setSession: (tokens: {
    accessToken: string;
    refreshToken: string;
    userId: string;
    roles: string[];
    territoryType: string;
  }) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      userId: null,
      roles: [],
      territoryType: null,
      isAuthenticated: false,

      setSession: ({ accessToken, refreshToken, userId, roles, territoryType }) =>
        set({ accessToken, refreshToken, userId, roles, territoryType, isAuthenticated: true }),

      clearSession: () =>
        set({ accessToken: null, refreshToken: null, userId: null, roles: [], territoryType: null, isAuthenticated: false }),
    }),
    {
      name: 'qxlits-ministry-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        userId: state.userId,
        roles: state.roles,
        territoryType: state.territoryType,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
