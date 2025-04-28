// Create a new file: src/context/SidebarStateContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';

type SidebarState = {
  openItems: Record<string, boolean>;
  setItemOpen: (itemId: string, isOpen: boolean) => void;
};

const SidebarStateContext = createContext<SidebarState | undefined>(undefined);

const STORAGE_KEY = 'sidebar_open_items';

export const SidebarStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize state from localStorage
  const [openItems, setOpenItems] = useState<Record<string, boolean>>(() => {
    const storedItems = localStorage.getItem(STORAGE_KEY);
    return storedItems ? JSON.parse(storedItems) : {};
  });

  // Update localStorage when state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(openItems));
  }, [openItems]);

  const setItemOpen = (itemId: string, isOpen: boolean) => {
    setOpenItems(prev => ({
      ...prev,
      [itemId]: isOpen
    }));
  };

  return (
    <SidebarStateContext.Provider value={{ openItems, setItemOpen }}>
      {children}
    </SidebarStateContext.Provider>
  );
};

export const useSidebarState = () => {
  const context = useContext(SidebarStateContext);
  if (context === undefined) {
    throw new Error('useSidebarState must be used within a SidebarStateProvider');
  }
  return context;
};