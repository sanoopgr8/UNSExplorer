import { create } from 'zustand'

interface UIStore {
  writeMode: boolean
  searchOpen: boolean
  searchQuery: string
  showBrokerDialog: boolean
  editingProfile: string | null   // profile id being edited
  showPublishPanel: boolean
  rightPanelOpen: boolean
  setWriteMode: (v: boolean) => void
  setSearchOpen: (v: boolean) => void
  setSearchQuery: (q: string) => void
  setShowBrokerDialog: (v: boolean, editId?: string | null) => void
  setShowPublishPanel: (v: boolean) => void
  setRightPanelOpen: (v: boolean) => void
}

export const useUIStore = create<UIStore>((set) => ({
  writeMode: false,
  searchOpen: false,
  searchQuery: '',
  showBrokerDialog: false,
  editingProfile: null,
  showPublishPanel: false,
  rightPanelOpen: false,

  setWriteMode: (v) => set({ writeMode: v }),
  setSearchOpen: (v) => set({ searchOpen: v, searchQuery: v ? '' : '' }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setShowBrokerDialog: (v, editId = null) => set({ showBrokerDialog: v, editingProfile: editId }),
  setShowPublishPanel: (v) => set({ showPublishPanel: v }),
  setRightPanelOpen: (v) => set({ rightPanelOpen: v }),
}))
