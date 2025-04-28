// Modification to app-sidebar.tsx

import type * as React from "react"
import {
  LayoutDashboard,
  Users,
  Brain,
  Activity,
  Settings2,
  FileText,
  Calculator,
  History,
  HelpCircle,
  ClipboardList
} from "lucide-react"

import { NavMain } from "./nav-main"
import { NavTasks } from "./nav-tasks"
import { NavUser } from "./nav-user"
import { DepartmentSwitcher } from "./department-switcher"
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarHeader, 
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton
} from "@/components/ui/sidebar"

import { useAuth } from "@/context/AuthContext"
import { useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useSidebarState } from "@/context/SidebarStateContext"

// Updated data structure for medical context
const data = {
  departments: [
    {
      name: "Radiation Oncology",
      logo: Activity,
      status: "Active",
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      items: [
        {
          title: "Home",
          url: "/home",
        },
        {
          title: "Overview",
          url: "/dashboard",
        },
      ],
    },
    {
      title: "Patient Management",
      url: "/patients",
      icon: Users,
      items: [
        {
          title: "Patient List",
          url: "/patients",
        },
        {
          title: "New Patient",
          url: "/patients-new",
        },
        {
          title: "Orthanc",
          url: import.meta.env.VITE_ORTHANC_URL || "http://localhost:8042/ui/app/index.html#/",
        }
      ],
    },
    {
      title: "AI Services",
      url: "/ai-services",
      icon: Brain,
      items: [
        {
          title: "Patient Intake",
          url: "/patient-intake-agent",
        },
        {
          title: "Auto Contouring",
          url: "auto-contouring-agent",
        },
        {
          title: "Treatment Planning",
          url: "/treatment-planning-agent",
        },
        {
          title: "Viewer",
          url: import.meta.env.VITE_VIEWER_BASE_URL || "http://localhost:8000/",
        },
      ],
    },
    {
      title: "Task Management (BETA)",
      url: "/tasks",
      icon: ClipboardList,
      items: [
        {
          title: "Active Tasks",
          url: "/tasks/active",
        },
        {
          title: "Completed Tasks",
          url: "/tasks/completed",
        },
        {
          title: "Task Queue",
          url: "/tasks/queue",
        },
      ],
    },
  ],
  activeTasks: [
    {
      name: "Patient Intake Analysis",
      url: "/tasks/intake/123",
      icon: FileText,
      status: "In Progress",
      patient: "John Doe",
      completion: 75
    },
    {
      name: "Segmentation & Contouring",
      url: "/tasks/contouring/456",
      icon: Brain,
      status: "Queued",
      patient: "Jane Smith",
      completion: 0
    },
    {
      name: "Treatment Plan Review",
      url: "/tasks/planning/789",
      icon: Activity,
      status: "Awaiting Review",
      patient: "Robert Johnson",
      completion: 90
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  const location = useLocation();
  const { setItemOpen } = useSidebarState();
  
  // Set the correct item as active based on the current route
  useEffect(() => {
    const currentPath = location.pathname;
    
    // Find which main nav item should be open based on the current path
    data.navMain.forEach(item => {
      const shouldBeOpen = 
        currentPath === item.url || 
        (item.items && item.items.some(subItem => currentPath === subItem.url));
      
      if (shouldBeOpen) {
        setItemOpen(item.title, true);
      }
    });
  }, [location.pathname, setItemOpen]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="relative"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg text-sidebar-primary-foreground">
                <img 
                  src="/med-ai-logo.png" 
                  alt="Med.AI Logo" 
                  className="size-8"
                />
              </div>
              <span className="text-xl font-bold text-sidebar-primary">
                Med.AI
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <DepartmentSwitcher departments={data.departments} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavTasks tasks={data.activeTasks} />
      </SidebarContent>
      <SidebarFooter>
        {user && <NavUser user={user} />}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}