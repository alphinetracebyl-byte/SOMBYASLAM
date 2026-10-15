import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  roles: string[];
  territoryType: string | null;
  regionCode: string | null;
  districtCode: string | null;
  isAuthenticated: boolean;

  setSession: (tokens: {
    accessToken: string;
    refreshToken: string;
    userId: string;
    roles: string[];
    territoryType: string;
    regionCode: string | null;
    districtCode: string | null;
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
      regionCode: null,
      districtCode: null,
      isAuthenticated: false,

      setSession: ({ accessToken, refreshToken, userId, roles, territoryType, regionCode, districtCode }) =>
        set({ accessToken, refreshToken, userId, roles, territoryType, regionCode, districtCode, isAuthenticated: true }),

      clearSession: () =>
        set({
          accessToken: null,
          refreshToken: null,
          userId: null,
          roles: [],
          territoryType: null,
          regionCode: null,
          districtCode: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'qxlits-field-auth',
      partialize: (state) => ({
        refreshToken: state.refreshToken,
        userId: state.userId,
        roles: state.roles,
        territoryType: state.territoryType,
        regionCode: state.regionCode,
        districtCode: state.districtCode,
      }),
    },
  ),
);
