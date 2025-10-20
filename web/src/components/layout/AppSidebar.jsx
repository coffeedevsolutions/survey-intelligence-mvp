import React, { useState } from 'react';
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
import { GlossyBubble } from "../ui/glossy-bubble.jsx";

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
  { icon: Archive, label: "Archive", href: "/archive" },
  { icon: Building2, label: "Enterprise Settings", href: "/enterprise" },
  { icon: Users, label: "User Management", href: "/user-management" },
  { icon: Layers, label: "Stack Management", href: "/stack-management" },
  { icon: FileCode, label: "Templates", href: "/templates" },
];

// Layered Logo Component with nested rotations
function LayeredLogo({ children }) {
  return (
    <div className="logo-wrap">
      <div className="spin-base">
        <div className="spin-boost">
          {children}
        </div>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useSidebar();
  const [hoveredItem, setHoveredItem] = useState(null);

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
    <Sidebar collapsible="icon" className="bg-transparent">
      <SidebarHeader className={cn("relative h-[56px] bg-transparent px-0 py-0 m-auto mt-2", state === "collapsed" ? "w-[56px]" : "w-full")}>
        <div className="relative z-40 flex items-center justify-center h-full w-full">
          <GlossyBubble 
            collapsed={state === "collapsed"} 
            onClick={() => handleNavigation('/dashboard')}
            className="focus:outline-none focus:ring-0"
          >
            <LayeredLogo>
              <img src="/images/uptaik-logo-2-white.png" alt="Uptaik" className="w-8 h-auto" />
            </LayeredLogo>
            <span className="font-[family-name:var(--font-suse-mono)]">Uptaik</span>
          </GlossyBubble>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-2 py-4 flex flex-col h-full items-center overflow-hidden">
        {/* Glassmorphic navigation container */}
        <div className="
          relative rounded-lg p-3 flex-1 flex flex-col w-full max-w-56
          backdrop-blur-md border-none
          shadow-[0_10px_20px_rgba(0,0,0,.1),inset_0_-2px_6px_rgba(0,0,0,.05)]
          before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-b before:from-white/10 before:to-transparent before:opacity-50
          animate-gradient-x
        " style={{
          background: 'linear-gradient(90deg, rgba(73,118,255,1) 0%, rgba(143,52,252,1) 100%)',
          backgroundSize: '200% 200%',
          animation: 'gradient-x 8s ease infinite'
        }}>
          {/* Sheen effect */}
          <span
            aria-hidden
            className="
              pointer-events-none
              absolute left-0 top-0 h-[50%] w-full rounded-md
              bg-[radial-gradient(120%_120%_at_50%_0%,rgba(255, 255, 255, 0.4)_0%,rgba(255,255,255,0)_50%)]
              mix-blend-screen
            "
          />
          
          <div className="flex flex-col h-full relative z-10 gap-4">
            {/* Collapsed state navigation */}
            {state === "collapsed" && (
              <div className="flex flex-col gap-2 list-none">
                {navigationItems.map((item) => (
                  <SidebarMenuItem key={item.label} className="list-none">
                    <SidebarMenuButton 
                      isActive={isActive(item.href)} 
                      onClick={() => handleNavigation(item.href)}
                      className="hover:bg-transparent hover:text-white text-white rounded-none px-0 py-1 transition-none justify-center relative"
                    >
                      {isActive(item.href) && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full"></div>
                      )}
                      <item.icon className="w-4 h-4" />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                {secondaryItems.map((item) => (
                  <SidebarMenuItem key={item.label} className="list-none">
                    <SidebarMenuButton 
                      isActive={isActive(item.href)} 
                      onClick={() => handleNavigation(item.href)}
                      className="hover:bg-transparent hover:text-white text-white rounded-none px-0 py-1 transition-none justify-center relative"
                    >
                      {isActive(item.href) && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full"></div>
                      )}
                      <item.icon className="w-4 h-4" />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </div>
            )}
            
            {/* Expanded state containers */}
            {state !== "collapsed" && (
              <>
                {/* Dashboard buttons container */}
                <div className="bg-white/8 backdrop-blur-md rounded-lg pr-3 pt-1 pb-1">
                  <SidebarGroup>
                    <SidebarGroupContent>
                      <SidebarMenu className="list-none">
                        {navigationItems.map((item) => (
                          <SidebarMenuItem key={item.label} className="list-none">
                            <SidebarMenuButton 
                              isActive={isActive(item.href)} 
                              onClick={() => handleNavigation(item.href)}
                              onMouseEnter={() => setHoveredItem(item.href)}
                              onMouseLeave={() => setHoveredItem(null)}
                              className="hover:bg-transparent hover:text-white text-white rounded-none px-2 py-1 transition-none relative overflow-hidden w-full"
                            >
                              {isActive(item.href) && (
                                <div className="absolute right-[1px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/60 rounded-full"></div>
                              )}
                              {/* Momentum-based L-shape animation */}
                              {/* Horizontal line - slower, starts first */}
                              <div className="absolute left-2 bottom-0 h-0.5 bg-white/60 transition-all duration-300 ease-out"
                                   style={{ 
                                     width: hoveredItem === item.href ? '94%' : '0%',
                                     opacity: hoveredItem === item.href ? 1 : 0,
                                     transitionDelay: hoveredItem === item.href ? '0ms' : '25ms'
                                   }}>
                              </div>
                              {/* Vertical line - faster, appears with momentum */}
                              <div className="absolute right-[3px] bottom-0 w-0.5 bg-white/60 transition-all duration-200 ease-out"
                                   style={{ 
                                     height: hoveredItem === item.href ? '10px' : '0px',
                                     opacity: hoveredItem === item.href ? 1 : 0,
                                     transform: hoveredItem === item.href ? 'translateY(-2px)' : 'translateY(0px)',
                                     transitionDelay: hoveredItem === item.href ? '150ms' : '0ms'
                                   }}>
                              </div>
                              {/* Circle border at the end of the L */}
                              <div className="absolute right-[0px] bottom-0 w-2 h-2 border border-white/60 rounded-full transition-all duration-200 ease-out"
                                   style={{ 
                                     opacity: hoveredItem === item.href ? 1 : 0,
                                     transform: hoveredItem === item.href ? 'translateY(-12px)' : 'translateY(0px)',
                                     transitionDelay: hoveredItem === item.href ? '200ms' : '0ms'
                                   }}>
                              </div>
                              <item.icon className="w-4 h-4" />
                              <span>{item.label}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                </div>
                
                {/* System buttons container */}
                <div className="bg-white/8 backdrop-blur-sm rounded-lg pr-3 pl-2 pt-1 pb-1">
                  <SidebarGroup>
                    <SidebarGroupContent>
                      <SidebarMenu className="list-none">
                        {secondaryItems.map((item) => (
                          <SidebarMenuItem key={item.label} className="list-none">
                            <SidebarMenuButton 
                              isActive={isActive(item.href)} 
                              onClick={() => handleNavigation(item.href)}
                              onMouseEnter={() => setHoveredItem(item.href)}
                              onMouseLeave={() => setHoveredItem(null)}
                              className="hover:bg-transparent hover:text-white text-white rounded-none px-2 py-1 transition-none relative overflow-hidden w-full"
                            >
                              {isActive(item.href) && (
                                <div className="absolute right-[1px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/60 rounded-full"></div>
                              )}
                              {/* Momentum-based L-shape animation */}
                              {/* Horizontal line - slower, starts first */}
                              <div className="absolute left-2 bottom-0 h-0.5 bg-white/60 transition-all duration-300 ease-out"
                                   style={{ 
                                     width: hoveredItem === item.href ? '94%' : '0%',
                                     opacity: hoveredItem === item.href ? 1 : 0,
                                     transitionDelay: hoveredItem === item.href ? '0ms' : '25ms'
                                   }}>
                              </div>
                              {/* Vertical line - faster, appears with momentum */}
                              <div className="absolute right-[3px] bottom-0 w-0.5 bg-white/60 transition-all duration-200 ease-out"
                                   style={{ 
                                     height: hoveredItem === item.href ? '10px' : '0px',
                                     opacity: hoveredItem === item.href ? 1 : 0,
                                     transform: hoveredItem === item.href ? 'translateY(-2px)' : 'translateY(0px)',
                                     transitionDelay: hoveredItem === item.href ? '150ms' : '0ms'
                                   }}>
                              </div>
                              {/* Circle border at the end of the L */}
                              <div className="absolute right-[0px] bottom-0 w-2 h-2 border border-white/60 rounded-full transition-all duration-200 ease-out"
                                   style={{ 
                                     opacity: hoveredItem === item.href ? 1 : 0,
                                     transform: hoveredItem === item.href ? 'translateY(-12px)' : 'translateY(0px)',
                                     transitionDelay: hoveredItem === item.href ? '200ms' : '0ms'
                                   }}>
                              </div>
                              <item.icon className="w-4 h-4" />
                              <span>{item.label}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                </div>
              </>
            )}
            
            {/* Footer at the bottom */}
            <div className="mt-auto pt-4">
              <div className={cn("px-4 py-3 text-xs text-muted-foreground", state === "collapsed" && "hidden")}>
                v1.0.0-beta
              </div>
            </div>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}