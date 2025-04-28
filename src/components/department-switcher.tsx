import * as React from "react"
import { useNavigate } from 'react-router-dom'
import { ChevronsUpDown, Plus, Building2, Clock, Users } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  useSidebar 
} from "@/components/ui/sidebar"

interface Department {
  name: string
  logo: React.ElementType
  status: 'Active' | 'Available' | 'Restricted'
  recentActivity?: string
  staffCount?: number
}

interface DepartmentSwitcherProps {
  departments: Department[]
}

export function DepartmentSwitcher({ departments }: DepartmentSwitcherProps) {
  const { isMobile } = useSidebar()
  const [activeDepartment, setActiveDepartment] = React.useState(departments[0])
  const [showNewDepartmentDialog, setShowNewDepartmentDialog] = React.useState(false)
  const navigate = useNavigate()

  const getStatusColor = (status: Department['status']) => {
    switch (status) {
      case 'Active':
        return 'bg-green-500'
      case 'Available':
        return 'bg-blue-500'
      case 'Restricted':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-500'
    }
  }

  const handleDepartmentChange = (department: Department) => {
    setActiveDepartment(department)
    // You can add navigation or other side effects here
    navigate('/dashboard')
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="relative data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <activeDepartment.logo className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{activeDepartment.name}</span>
                <span className="truncate text-xs">{activeDepartment.status}</span>
              </div>
              <div className={`absolute right-8 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full ${getStatusColor(activeDepartment.status)}`} />
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-[16rem] rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
              <Building2 className="size-4" />
              Departments
            </DropdownMenuLabel>
            {departments.map((department, index) => (
              <DropdownMenuItem 
                key={department.name} 
                onClick={() => handleDepartmentChange(department)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <department.logo className="size-4 shrink-0" />
                </div>
                <div className="flex flex-1 flex-col">
                  <span>{department.name}</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {department.recentActivity && (
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {department.recentActivity}
                      </span>
                    )}
                    {department.staffCount && (
                      <span className="flex items-center gap-1">
                        <Users className="size-3" />
                        {department.staffCount} staff
                      </span>
                    )}
                  </div>
                </div>
                <div className={`size-2 rounded-full ${getStatusColor(department.status)}`} />
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <Dialog open={showNewDepartmentDialog} onOpenChange={setShowNewDepartmentDialog}>
              <DialogTrigger asChild>
                <DropdownMenuItem 
                  className="gap-2 p-2"
                  onSelect={(e) => e.preventDefault()}
                >
                  <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                    <Plus className="size-4" />
                  </div>
                  <span className="font-medium text-muted-foreground">Add Department</span>
                </DropdownMenuItem>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Department</DialogTitle>
                  <DialogDescription>
                    Add a new department to your organization.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Department Name</Label>
                    <Input id="name" placeholder="Enter department name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input id="description" placeholder="Enter department description" />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowNewDepartmentDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => {
                      // Handle department creation
                      setShowNewDepartmentDialog(false)
                    }}
                  >
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}