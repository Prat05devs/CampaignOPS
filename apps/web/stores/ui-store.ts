import { create } from "zustand";

type UiState = {
  activeWorkspaceId: string | null;
  activeEventId: string | null;
  isSidebarOpen: boolean;
  setActiveWorkspaceId: (workspaceId: string | null) => void;
  setActiveEventId: (eventId: string | null) => void;
  setSidebarOpen: (isOpen: boolean) => void;
};

export const useUiStore = create<UiState>((set) => ({
  activeWorkspaceId: null,
  activeEventId: null,
  isSidebarOpen: true,
  setActiveWorkspaceId: (activeWorkspaceId) => set({ activeWorkspaceId }),
  setActiveEventId: (activeEventId) => set({ activeEventId }),
  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen })
}));

