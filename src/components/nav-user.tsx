import { useNavigate } from 'react-router-dom'
import { 
  ChevronsUpDown, 
  UserCog, 
  Bell, 
  ClipboardList, 
  LogOut, 
  UserCircle,
  Calendar,
  Clock,
  Shield
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { Badge } from "@/components/ui/badge"
import { useAuth } from '../context/AuthContext'
import { 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  useSidebar 
} from "@/components/ui/sidebar"

import { User } from "../context/AuthContext"

export function NavUser({ user }: { user: User }) {
    const { isMobile } = useSidebar()
    const navigate = useNavigate()
    const { logout } = useAuth()

    const getStatusColor = (status: User['status']) => {
        switch (status) {
        case 'Online':
            return 'bg-green-500'
        case 'Away':
            return 'bg-yellow-500'
        case 'Busy':
            return 'bg-red-500'
        case 'Offline':
            return 'bg-gray-500'
        default:
            return 'bg-gray-500'
        }
    }

    const handleLogout = async () => {
        try {
        await logout()
        navigate('/')
        } catch (error) {
        console.error('Logout failed:', error)
        }
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
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.firstName + " " + user.lastName} />
                <AvatarFallback className="rounded-lg">
                  {user.firstName.charAt(0) + user.lastName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.firstName + " " + user.lastName}</span>
                <span className="truncate text-xs">{user.role}</span>
              </div>
              <div 
                className={`absolute right-8 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full ${getStatusColor(user.status)}`} 
              />
              <ChevronsUpDown className="ml-auto h-4 w-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="end"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-2 py-1.5">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.firstName + " " + user.lastName} />
                  <AvatarFallback className="rounded-lg">
                    {user.firstName.charAt(0) + user.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 gap-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{user.firstName + " " + user.lastName}</span>
                    <Badge variant="outline" className="ml-auto">
                      {user.role}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3" />
                    <span>{user.licenseNumber}</span>
                  </div>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <UserCircle className="mr-2 h-4 w-4" />
                <span>My Profile</span>
              </DropdownMenuItem>
              {/* <DropdownMenuItem onClick={() => navigate('/schedule')}>
                <Calendar className="mr-2 h-4 w-4" />
                <span>My Schedule</span>
              </DropdownMenuItem> */}
              <DropdownMenuItem onClick={() => navigate('/tasks')}>
                <ClipboardList className="mr-2 h-4 w-4" />
                <span>My Tasks</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => navigate('/notifications')}>
                <Bell className="mr-2 h-4 w-4" />
                <span>Notifications</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <UserCog className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-red-600 focus:text-red-600" 
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
            {user.lastActive && (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>Last active: {user.lastActive}</span>
                </div>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}