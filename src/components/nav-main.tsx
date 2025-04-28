// src/components/nav-main.tsx
import { ChevronRight, type LucideIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { useSidebarState } from "@/context/SidebarStateContext"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const navigate = useNavigate()
  const { openItems, setItemOpen } = useSidebarState()
  
  const handleNavigate = (url: string) => {
    if (url.startsWith("/")) {
      // If the URL starts with '/', navigate to it directly
      navigate(url)
    } else if (url.startsWith("http")) {
      // If the URL starts with 'http', open it in a new tab
      window
        .open(url, "_blank")
        ?.focus()
    } else {
      // Otherwise, navigate to the URL relative to the current path
      navigate(`/${url}`)
    }
      
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Med.AI Navigation</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible 
            key={item.title} 
            asChild 
            open={openItems[item.title] ?? item.isActive} 
            onOpenChange={(open) => setItemOpen(item.title, open)}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton 
                  tooltip={item.title} 
                  className="text-sidebar-foreground hover:bg-accent"
                  onClick={() => {
                    if (!item.items) {
                      handleNavigate(item.url)
                    }
                  }}
                >
                  {item.icon && <item.icon className="size-5" />}
                  <span>{item.title}</span>
                  {item.items && (
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  )}
                </SidebarMenuButton>
              </CollapsibleTrigger>
              {item.items && (
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton 
                          onClick={() => handleNavigate(subItem.url)}
                          className="hover:bg-accent cursor-pointer"
                        >
                          <span>{subItem.title}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              )}
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}