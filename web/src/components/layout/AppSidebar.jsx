import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../ui/utils';
import {
  LayoutDashboard,
  BarChart3,
  ClipboardList,
  Megaphone,
  FileText,
  Lightbulb,
  Plug,
  Settings,
  HelpCircle,
  Archive,
  Building2,
  Users,
  UserPlus,
  Share2,
  Layers,
  FileCode,
  Map,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "../ui/sidebar.jsx";

const navigationItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: BarChart3, label: "Analytics", href: "/analytics" },
  { icon: ClipboardList, label: "Surveys", href: "/surveys" },
  { icon: Megaphone, label: "Campaigns", href: "/campaigns" },
  { icon: FileText, label: "Briefs & Reviews", href: "/review" },
  { icon: Map, label: "Roadmap", href: "/roadmap" },
  { icon: Lightbulb, label: "Solution Management", href: "/solution-management" },
];

const secondaryItems = [
  { icon: Archive, label: "Administrative Archive", href: "/dashboard?tab=archive" },
  { icon: Building2, label: "Enterprise", href: "/dashboard?tab=enterprise" },
  { icon: Users, label: "User Management", href: "/dashboard?tab=users" },
  { icon: UserPlus, label: "Invites", href: "/dashboard?tab=invites" },
  { icon: Share2, label: "Share Links", href: "/dashboard?tab=shares" },
  { icon: Layers, label: "Stack Management", href: "/dashboard?tab=stack" },
  { icon: FileCode, label: "Templates", href: "/dashboard?tab=unified-templates" },
  { icon: Settings, label: "Organization Settings", href: "/dashboard?tab=organization-settings" },
  { icon: Plug, label: "Integrations", href: "/dashboard?tab=integrations" },
  { icon: HelpCircle, label: "Help & Changelog", href: "/dashboard?tab=help" },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useSidebar();

  const handleNavigation = (href) => {
    if (href.startsWith('/dashboard')) {
      // Handle dashboard tabs
      const url = new URL(href, window.location.origin);
      const tab = url.searchParams.get('tab');
      if (tab) {
        navigate(`/dashboard?tab=${tab}`);
      } else {
        navigate('/dashboard');
      }
    } else {
      navigate(href);
    }
  };

  const isActive = (href) => {
    if (href.startsWith('/dashboard') && location.pathname === '/dashboard') {
      const url = new URL(href, window.location.origin);
      return url.searchParams.get('tab') === (new URL(location.search, window.location.origin)).searchParams.get('tab');
    }
    return location.pathname === href;
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-1">
          {state === "collapsed" ? (
            <img 
              src="/images/uptaik-logo-gradient-cropped.png" 
              alt="Uptaik" 
              className="w-8 h-auto mx-auto"
            />
          ) : (
            <img 
              src="/images/uptaik-logo-text-gradient-cropped.png" 
              alt="Uptaik" 
              className="h-10 w-auto"
            />
          )}
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton asChild isActive={isActive(item.href)} onClick={() => handleNavigation(item.href)}>
                    <a>
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupLabel className={cn(state === "collapsed" && "hidden")}>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton asChild isActive={isActive(item.href)} onClick={() => handleNavigation(item.href)}>
                    <a>
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter>
        <div className={cn("px-4 py-3 text-xs text-muted-foreground", state === "collapsed" && "hidden")}>
          v1.0.0-beta
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}