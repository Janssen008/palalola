import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  LayoutDashboard,
  ClipboardList,
  LogOut,
  Menu,
  Moon,
  Sun,
  ChevronLeft,
  X,
  Users as UsersIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProfileSettingsModal } from '@/components/ProfileSettingsModal';

const navItems = [
  { to: '/dept-head', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/dept-head/employees', icon: UsersIcon, label: 'My Employees', end: false },
  { to: '/dept-head/logs', icon: ClipboardList, label: 'Task Logs', end: false },
];

export default function DeptHeadLayout() {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'));

  const toggleDarkMode = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    setDarkMode(isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

  const handleSignOut = async () => {
    if (document.startViewTransition) {
      document.startViewTransition(async () => {
        await signOut();
        navigate('/login');
      });
    } else {
      await signOut();
      navigate('/login');
    }
  };

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn("flex items-center px-4 py-5 transition-all duration-300", (!collapsed || mobile) ? "gap-3" : "justify-center px-2 gap-0")}>
        <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center">
          <img src="/palagawalogo.png" alt="Logo" className="h-full w-full object-contain drop-shadow-md" />
        </div>
        <div className={cn(
          "flex flex-col min-w-0 overflow-hidden transition-all duration-300",
          (!collapsed || mobile) ? "w-32 opacity-100" : "w-0 opacity-0"
        )}>
          <span className="font-bold text-sm bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent block truncate">
            PalaGawa
          </span>
          <span className="text-[10px] text-muted-foreground block truncate whitespace-nowrap">Department Head</span>
        </div>
      </div>

      <Separator />

      {/* Nav Items */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const NavIcon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => mobile && setMobileOpen(false)}
              className={({ isActive }: { isActive: boolean }) =>
                cn(
                  "flex items-center py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  (!collapsed || mobile) ? "gap-3 px-3" : "justify-center px-2 gap-0",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )
              }
            >
              <NavIcon className="h-5 w-5 flex-shrink-0" />
              <div className={cn(
                "overflow-hidden transition-all duration-300",
                (!collapsed || mobile) ? "w-32 opacity-100" : "w-0 opacity-0"
              )}>
                <span className="truncate block whitespace-nowrap">{item.label}</span>
              </div>
            </NavLink>
          );
        })}
      </nav>

      <Separator />

      {/* Footer */}
      <div className={cn("p-3 space-y-2", collapsed && !mobile && "px-2")}>
        <ProfileSettingsModal>
          <div className={cn(
            "px-3 py-2 overflow-hidden transition-all duration-300 flex flex-col justify-center hover:bg-accent cursor-pointer rounded-xl",
            (!collapsed || mobile) ? "w-auto opacity-100 h-[80px]" : "w-0 opacity-0 h-0 p-0 m-0"
          )}>
            <p className="text-sm font-medium truncate">{profile?.full_name}</p>
            <div className="flex flex-col gap-0.5 mt-0.5">
              <p className="text-[11px] font-medium text-muted-foreground">Department Head</p>
              {profile?.offices?.name && (
                <p className="text-[10px] text-muted-foreground/80 line-clamp-2 leading-tight break-words" title={profile.offices.name}>
                  {profile.offices.name}
                </p>
              )}
            </div>
          </div>
        </ProfileSettingsModal>
        <div className={cn("flex gap-1", collapsed && !mobile ? "flex-col items-center" : "")}>
          <Button variant="ghost" size="icon" onClick={toggleDarkMode} className="h-9 w-9 rounded-xl">
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleSignOut} className="h-9 w-9 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r bg-sidebar transition-all duration-300 relative",
          collapsed ? "w-[68px]" : "w-64"
        )}
      >
        {SidebarContent({ mobile: false })}
        <Button
          variant="outline"
          size="icon"
          className="absolute -right-3 top-7 h-6 w-6 rounded-full border shadow-md bg-background z-10"
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronLeft className={cn("h-3 w-3 transition-transform", collapsed && "rotate-180")} />
        </Button>
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <SheetDescription className="sr-only">Navigation sidebar</SheetDescription>
          {SidebarContent({ mobile: true })}
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b bg-background/80 backdrop-blur-xl sticky top-0 z-40">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)} className="h-9 w-9 relative group">
            <Menu className={cn("h-5 w-5 absolute transition-all duration-300", mobileOpen ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100")} />
            <X className={cn("h-5 w-5 absolute transition-all duration-300", mobileOpen ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0")} />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 flex items-center justify-center">
              <img src="/palagawalogo.png" alt="Logo" className="h-full w-full object-contain" />
            </div>
            <span className="font-semibold text-sm">Department Head</span>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="p-4 md:p-6 lg:p-8 w-full animate-slide-in h-full">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
