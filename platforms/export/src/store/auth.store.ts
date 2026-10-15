import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  accessToken:  string | null;
  refreshToken: string | null;
  userId:       string | null;
  staffId:      string | null;
  staffName:    string | null;
  staffRole:    string | null;
  facilityId:   string | null;
  facilityCode: string | null;
  facilityName: string | null;
  facilityType: string | null;
  isAuthenticated: boolean;

  setSession: (s: {
    accessToken:  string;
    refreshToken: string;
    userId:       string;
    staffId:      string;
    staffName:    string;
    staffRole:    string;
    facilityId:   string;
    facilityCode: string;
    facilityName: string;
    facilityType: string;
  }) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken:  null,
      refreshToken: null,
      userId:       null,
      staffId:      null,
      staffName:    null,
      staffRole:    null,
      facilityId:   null,
      facilityCode: null,
      facilityName: null,
      facilityType: null,
      isAuthenticated: false,

      setSession: (s) => set({ ...s, isAuthenticated: true }),
      clearSession: () => set({
        accessToken: null, refreshToken: null, userId: null,
        staffId: null, staffName: null, staffRole: null,
        facilityId: null, facilityCode: null, facilityName: null, facilityType: null,
        isAuthenticated: false,
      }),
    }),
    {
      name: 'qxlits-export-auth',
      partialize: (s) => ({
        accessToken: s.accessToken, refreshToken: s.refreshToken,
        userId: s.userId, staffId: s.staffId, staffName: s.staffName,
        staffRole: s.staffRole, facilityId: s.facilityId,
        facilityCode: s.facilityCode, facilityName: s.facilityName,
        facilityType: s.facilityType, isAuthenticated: s.isAuthenticated,
      }),
    },
  ),
);
