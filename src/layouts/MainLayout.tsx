// src/layouts/MainLayout.tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { SidebarStateProvider } from '@/context/SidebarStateContext';

const MainLayout: React.FC = () => {
  return (
    <SidebarStateProvider>
      <SidebarProvider>
        <div className="flex h-screen w-full overflow-hidden bg-background">
          <AppSidebar className="shrink-0" />
          <SidebarInset className="flex w-full flex-col overflow-hidden">
            <main className="flex-1 overflow-auto">
              <div className="h-full w-full">
                <Outlet />
              </div>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </SidebarStateProvider>
  );
};

export default MainLayout;