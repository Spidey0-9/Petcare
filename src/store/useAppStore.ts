import { create } from 'zustand';
import type { UserRole } from '../types';

type AppState = {
  isBootstrapped: boolean;
  role: UserRole | null;
  setBootstrapped: (value: boolean) => void;
  setRole: (role: UserRole | null) => void;
  resetSessionState: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  isBootstrapped: false,
  role: null,
  setBootstrapped: (value) => set({ isBootstrapped: value }),
  setRole: (role) => set({ role }),
  resetSessionState: () => set({ role: null, isBootstrapped: false }),
}));
