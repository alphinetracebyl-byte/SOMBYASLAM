import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AccountRole = 'FARMER' | 'PREMISES_REP';

interface AuthState {
  isAuthenticated: boolean;
  userId:       string | null;
  accessToken:  string | null;
  refreshToken: string | null;
  farmerId:     string | null;
  farmerCode:   string | null;
  farmerName:   string | null;
  farmerStatus: string | null;
  region:       string | null;
  accountRole:  AccountRole | null;
  premisesCode: string | null;
  premisesId:   string | null;

  setFarmerSession: (session: {
    userId: string; accessToken: string; refreshToken: string;
    farmerId: string; farmerCode: string; farmerName: string;
    farmerStatus: string; region: string;
    accountRole?: AccountRole; premisesCode?: string; premisesId?: string;
  }) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      userId:       null,
      accessToken:  null,
      refreshToken: null,
      farmerId:     null,
      farmerCode:   null,
      farmerName:   null,
      farmerStatus: null,
      region:       null,
      accountRole:  null,
      premisesCode: null,
      premisesId:   null,

      setFarmerSession: ({ userId, accessToken, refreshToken, farmerId, farmerCode, farmerName, farmerStatus, region, accountRole, premisesCode, premisesId }) =>
        set({
          isAuthenticated: true,
          userId, accessToken, refreshToken,
          farmerId, farmerCode, farmerName, farmerStatus, region,
          accountRole:  accountRole  ?? 'FARMER',
          premisesCode: premisesCode ?? null,
          premisesId:   premisesId   ?? null,
        }),

      clearSession: () =>
        set({
          isAuthenticated: false,
          userId: null, accessToken: null, refreshToken: null,
          farmerId: null, farmerCode: null, farmerName: null,
          farmerStatus: null, region: null,
          accountRole: null, premisesCode: null, premisesId: null,
        }),
    }),
    { name: 'qxlits-farmer-auth' },
  ),
);
