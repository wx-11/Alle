import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  language: 'zh' | 'en';
  editMode: boolean;
  groupByInbox: boolean;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLanguage: (language: 'zh' | 'en') => void;
  setEditMode: (editMode: boolean) => void;
  setGroupByInbox: (groupByInbox: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      language: 'zh',
      editMode: false,
      groupByInbox: false,
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setEditMode: (editMode) => set({ editMode }),
      setGroupByInbox: (groupByInbox) => set({ groupByInbox }),
    }),
    {
      name: 'alle-settings',
    }
  )
);
