"use client"

import React from "react"
import { useNavigate } from "react-router-dom"
import { MoreHorizontal, Play, Pause, AlertCircle, CheckCircle2 } from "lucide-react"
import { LucideIcon } from "lucide-react"
import { useSidebar } from "@/components/ui/sidebar"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { Progress } from "@/components/ui/progress"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,

} from "@/components/ui/sidebar"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"


interface Task {
  name: string
  url: string
  icon: LucideIcon
  status: "In Progress" | "Queued" | "Awaiting Review" | "Completed" | "Failed"
  patient: string
  completion: number
}

interface NavTasksProps {
  tasks: Task[]
}

export function NavTasks({ tasks }: NavTasksProps) {
  const navigate = useNavigate()
  const { state } = useSidebar()  
  if (state === "collapsed") return null 

  const getStatusColor = (status: Task["status"]) => {
    switch (status) {
      case "In Progress":
        return "text-blue-500"
      case "Queued":
        return "text-yellow-500"
      case "Awaiting Review":
        return "text-purple-500"
      case "Completed":
        return "text-green-500"
      case "Failed":
        return "text-red-500"
      default:
        return "text-gray-500"
    }
  }

  const getStatusIcon = (status: Task["status"]) => {
    switch (status) {
      case "In Progress":
        return Play
      case "Queued":
        return Pause
      case "Awaiting Review":
        return AlertCircle
      case "Completed":
        return CheckCircle2
      case "Failed":
        return AlertCircle
      default:
        return AlertCircle
    }
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="cursor-default">
        Active Tasks
      </SidebarGroupLabel>
      <SidebarMenu>
        {tasks.map((task) => {
          const StatusIcon = getStatusIcon(task.status)
          return (
            <SidebarMenuItem key={task.name} className="p-2">
              <div className="group relative flex items-center gap-4 p-2 rounded-lg bg-transparent">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-background">
                  <task.icon className="h-5 w-5" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {task.name}
                    </span>
                    <StatusIcon
                      className={`h-4 w-4 shrink-0 ${getStatusColor(task.status)}`}
                    />
                  </div>
                  <span className="truncate text-xs text-muted-foreground">
                    Patient: {task.patient}
                  </span>
                  {task.completion > 0 && (
                    <div className="mt-1">
                      <Progress value={task.completion} className="h-1.5" />
                    </div>
                  )}
                </div>
              </div>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
  
}
