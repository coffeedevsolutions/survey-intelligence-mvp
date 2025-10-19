import React from 'react';
import { Search, Bell, User } from "lucide-react";
import { Input } from "../ui/input.jsx";
import { Button } from "../ui/button.jsx";
import { Badge } from "../ui/badge.jsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu.jsx";
import { SidebarTrigger } from "../ui/sidebar.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useNavigate } from "react-router-dom";

export function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleSignOut = () => {
    logout();
  };

  const handleNavigation = (href) => {
    navigate(href);
  };

  return (
    <div className="sticky top-0 z-40 h-18 flex items-center justify-center pr-4 pl-2">
      {/* Glassmorphic topbar matching sidebar styling */}
      <div className="
        relative w-full h-[56px]
        rounded-lg p-3
        backdrop-blur-md border-none
        shadow-[0_10px_20px_rgba(0,0,0,.1),inset_0_-2px_6px_rgba(0,0,0,.05)]
        transition-transform duration-300 ease-in-out
        animate-gradient-x
        before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-b before:from-white/10 before:to-transparent before:opacity-50
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
        
        {/* Content */}
        <div className="relative z-10 flex items-center justify-between w-full h-full">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="text-white hover:text-white hover:bg-white/10 cursor-pointer" />
        </div>
        
        <div className="flex-1 flex items-center gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/80" />
            <Input
              placeholder="Search requests, surveys, docs..."
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 backdrop-blur-sm"
            />
          </div>
          <Badge variant="secondary" className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
            Beta
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative text-white hover:bg-white/10">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <div className="flex flex-col gap-1">
                  <p className="text-sm">New survey response received</p>
                  <p className="text-xs text-muted-foreground">WiFi Upgrade - Construction</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <div className="flex flex-col gap-1">
                  <p className="text-sm">Document ready for review</p>
                  <p className="text-xs text-muted-foreground">EHR Integration Brief</p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6E00FF] to-[#00D1FF] flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Help & Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        </div>
      </div>
    </div>
  );
}
