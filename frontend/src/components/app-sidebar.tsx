import { useMemo, type ComponentProps } from "react"
import {
  IconDashboard,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

import citlogo from '@/assets/images/citlogo.png'
import { Computer } from "lucide-react"
import { useAuth } from "@/context/AuthContext"

const navSecondary = [
  {
    title: "Settings",
    url: "#",
    icon: IconSettings,
  },
]

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {

  const { logoutUser, email, firstName, lastName, admin } = useAuth()

  const navMain = useMemo(() => {
    const items = [
      {
        title: "Dashboard",
        url: "/",
        icon: IconDashboard,
      },
      {
        title: "Apps",
        url: "/apps",
        icon: Computer,
      },
    ]
    if (admin) {
      items.push({
        title: "User management",
        url: "/user-management",
        icon: IconUsers,
      })
    }
    return items
  }, [admin])

  return (
    <Sidebar  collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu >
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="#">
                <img src={citlogo} alt="CIT Id" className="w-8 h-8 object-contain shrink-0" />
                <span className=" font-bold tracking-wide text-lg">CIT ID</span>
              </a>
                
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser  user={{ name: `${firstName} ${lastName}`, email: email!, avatar: "/avatars/shadcn.jpg" }} logoutUser={logoutUser} />
      </SidebarFooter>
    </Sidebar>
  )
}
