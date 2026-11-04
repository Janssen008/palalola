import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  ClipboardCheck,
  LogOut,
  Moon,
  Sun,
  FileText,
  CalendarDays,
  FileCheck2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProfileSettingsModal } from '@/components/ProfileSettingsModal';
import GlassSurface from '@/components/GlassSurface';
import Goo from 'gooey-react';
import gsap from 'gsap';

const navItems = [
  { to: '/user', icon: ClipboardCheck, label: 'Daily Tasks', end: true },
  { to: '/user/summary', icon: FileText, label: 'Task Summary', end: false },
  { to: '/user/agenda', icon: CalendarDays, label: 'Agenda', end: false },
  { to: '/user/minutes', icon: FileCheck2, label: 'Minutes', end: false },
];

const GooeyMetaball = ({ activeIndex, variant = 'mobile' }: { activeIndex: number, variant?: 'desktop' | 'mobile' }) => {
  const prevBlobRef = React.useRef<HTMLDivElement>(null);
  const nextBlobRef = React.useRef<HTMLDivElement>(null);
  const movingBlobRef = React.useRef<HTMLDivElement>(null);
  const [prevIndex, setPrevIndex] = React.useState(activeIndex);
  const [isAnimating, setIsAnimating] = React.useState(false);

  React.useEffect(() => {
    if (activeIndex !== prevIndex) {
      setIsAnimating(true);
      const offset = variant === 'desktop' ? 160 : 80;
      
      const tl = gsap.timeline({
        onComplete: () => {
          setPrevIndex(activeIndex);
          setIsAnimating(false);
        }
      });
      
      tl.fromTo(prevBlobRef.current, { scale: 1 }, { scale: 0, duration: 0.5, ease: "power2.inOut" }, 0);
      tl.fromTo(nextBlobRef.current, { scale: 0 }, { scale: 1, duration: 0.5, ease: "power2.inOut" }, 0);
      tl.fromTo(movingBlobRef.current, 
        { left: prevIndex * offset }, 
        { left: activeIndex * offset, duration: 0.5, ease: "power2.inOut" }, 
      0);
    }
  }, [activeIndex, prevIndex, variant]);

  const offset = variant === 'desktop' ? 160 : 80;
  const sizeClass = variant === 'desktop' ? 'w-36 h-10 rounded-2xl' : 'w-12 h-12 rounded-full';
  const bg = '#3b82f6'; // Vibrant blue

  return (
    <div className="absolute inset-0 pointer-events-none">
      <Goo intensity="strong" composite>
        <div className="relative w-full h-full">
          {/* Static Blob at Prev Index (Shrinks) */}
          <div
            ref={prevBlobRef}
            className={`absolute ${sizeClass}`}
            style={{
              left: prevIndex * offset,
              background: bg,
              opacity: isAnimating ? 1 : 0,
            }}
          />

          {/* Static Blob at Active Index (Grows) */}
          <div
            ref={nextBlobRef}
            className={`absolute ${sizeClass}`}
            style={{
              left: activeIndex * offset,
              background: bg,
              opacity: isAnimating ? 1 : 0,
            }}
          />

          {/* Moving Blob (Travels from Prev to Active) */}
          <div
            ref={movingBlobRef}
            className={`absolute ${sizeClass} transition-opacity duration-200`}
            style={{
              left: isAnimating ? prevIndex * offset : activeIndex * offset,
              background: bg,
              opacity: isAnimating ? 1 : 0,
            }}
          />
        </div>
      </Goo>

      {/* The Blue Frosted Glass Pill (Resting State) - OUTSIDE the Goo wrapper so it can be transparent and blur! */}
      <div
        className={`absolute ${sizeClass} backdrop-blur-md border border-white/20 transition-all duration-300`}
        style={{
          left: activeIndex * offset,
          background: 'rgba(59, 130, 246, 0.45)', // Semi-transparent blue for the frost effect
          boxShadow: '0 8px 32px 0 rgba(59, 130, 246, 0.25)',
          opacity: isAnimating ? 0 : 1,
          transform: isAnimating ? 'scale(0.8)' : 'scale(1)',
        }}
      />
    </div>
  );
};

export default function UserLayout() {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'));

  // Calculate active index for gooey animation
  const activeIndex = Math.max(0, navItems.findIndex(i => location.pathname === i.to || (i.to !== '/user' && location.pathname.startsWith(i.to))));

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

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const el = e.currentTarget;
    
    // Fluid squish effect using GSAP
    gsap.timeline()
      .to(el, {
        scale: 0.9,
        scaleX: 1.05,
        scaleY: 0.85,
        duration: 0.1,
        ease: 'power2.out',
      })
      .to(el, {
        scale: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 0.7,
        ease: 'elastic.out(1, 0.3)',
      });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background relative">
      {/* ── Background Effects ─────────────────────────────── */}
      {/* Background blobs removed as requested */}

      {/* ── Desktop Top Nav ─────────────────────────────── */}
      <nav className="hidden lg:flex fixed bottom-16 left-1/2 -translate-x-1/2 z-40">
        <GlassSurface
          width="auto"
          height="auto"
          borderRadius={24}
          distortionScale={-20}
          borderWidth={0.15}
          redOffset={0}
          greenOffset={1}
          blueOffset={2}
          blur={10}
          backgroundOpacity={0.10}
          className="border border-white/20 dark:border-white/10 shadow-2xl"
        >
          <div className="flex items-center gap-6 p-2">
            
            {/* Logo */}
            <div className="flex items-center gap-3 pl-4 pr-2 border-r border-white/20 dark:border-white/10 h-10">
              <div className="w-7 h-7 flex items-center justify-center">
                <img src="/palagawalogo.png" alt="Logo" className="w-full h-full object-contain drop-shadow-md" />
              </div>
              <span className="font-bold text-sm bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                PalaGawa
              </span>
            </div>

            {/* Nav Links */}
            <div className="relative flex items-center gap-4">
              {/* Static subtle backgrounds for inactive items */}
              <div className="absolute inset-0 flex items-center gap-4 z-0">
                {navItems.map((_, i) => (
                  <div key={i} className="w-36 h-10 rounded-2xl" 
                       style={{ background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }} />
                ))}
              </div>
              
              {/* Gooey Background Layer */}
              <div className="absolute inset-0 z-10 pointer-events-none">
                <GooeyMetaball activeIndex={activeIndex} variant="desktop" />
              </div>

              {/* Foreground Content Layer */}
              <div className="relative z-20 flex items-center gap-4">
                {navItems.map((item, i) => {
                  const NavIcon = item.icon;
                  const isActive = i === activeIndex;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={handleNavClick}
                      className={cn(
                        'flex flex-row items-center justify-center gap-2 w-36 h-10 rounded-2xl text-sm font-medium transition-colors duration-200',
                        isActive ? 'text-white' : 'text-muted-foreground hover:text-foreground'
                      )}
                      style={{ background: 'transparent' }}
                    >
                      <NavIcon className="w-4.5 h-4.5" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>

            {/* User Info & Actions */}
            <div className="flex items-center gap-4 pl-2 pr-4 border-l border-white/20 dark:border-white/10 h-10">
              
              <button
                onClick={toggleDarkMode}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground transition-colors"
                style={{
                  background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                }}
              >
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              <ProfileSettingsModal>
                <button className="flex items-center gap-3 px-3 py-1 hover:bg-white/5 rounded-xl transition-colors text-left group">
                  <div className="flex flex-col min-w-0 text-right">
                    <span className="text-sm font-semibold truncate max-w-[140px] text-foreground group-hover:text-primary transition-colors">
                      {profile?.full_name || 'User'}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                      {profile?.role || 'Member'} • {profile?.offices?.name || 'No Office'}
                    </span>
                  </div>
                  <div
                    className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md ring-2 ring-white/10 group-hover:ring-primary/50 transition-all"
                    style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)' }}
                  >
                    {profile?.full_name?.charAt(0) ?? 'U'}
                  </div>
                </button>
              </ProfileSettingsModal>

              <button
                onClick={handleSignOut}
                className="w-10 h-10 flex items-center justify-center rounded-xl transition-colors"
                style={{
                  color: 'hsl(0 63% 51%)',
                  background: darkMode ? 'rgba(220,38,38,0.08)' : 'rgba(220,38,38,0.05)',
                }}
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>

          </div>
        </GlassSurface>
      </nav>

      {/* ── Main content ─────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar (logo only) */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-xl sticky top-0 z-30 border-b border-border/40">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 flex items-center justify-center">
              <img src="/palagawalogo.png" alt="Logo" className="h-full w-full object-contain" />
            </div>
            <span className="font-bold text-sm bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
              PalaGawa
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleDarkMode}
              className="h-8 w-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground transition-colors"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-auto pb-28">
          <div className="p-4 md:p-6 lg:p-8 w-full animate-slide-in">
            <Outlet />
          </div>
        </div>
      </main>

      {/* ── Mobile Liquid Glass Bottom Nav ───────────────────────────── */}
      <div className="lg:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-50">
        <GlassSurface
          width="100%"
          height="100%"
          borderRadius={100}
          distortionScale={-40}
          borderWidth={0.25}
          redOffset={0}
          greenOffset={1}
          blueOffset={2}
          blur={8}
          backgroundOpacity={0.10}
          className="border border-white/30 dark:border-white/10 shadow-2xl"
        >
          <div className="flex items-center gap-6 px-4 py-1">
            <div className="relative">
            {/* Static subtle backgrounds for inactive items */}
            <div className="absolute inset-0 flex items-center gap-8 z-0">
              {navItems.map((_, i) => (
                <div key={i} className="w-12 h-12 rounded-full" 
                     style={{ background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }} />
              ))}
            </div>

            {/* Gooey Background Layer */}
            <div className="absolute inset-0 z-10 pointer-events-none">
              <GooeyMetaball activeIndex={activeIndex} variant="mobile" />
            </div>

            {/* Foreground Content Layer */}
            <div className="relative z-20 flex items-center gap-8">
              {navItems.map((item, i) => {
                const NavIcon = item.icon;
                const isActive = i === activeIndex;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={handleNavClick}
                    className={cn(
                      'flex items-center justify-center w-12 h-12 rounded-full transition-colors duration-200',
                      isActive ? 'text-white' : 'text-muted-foreground'
                    )}
                    style={{ background: 'transparent' }}
                  >
                    <NavIcon className="h-5 w-5" />
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div
            className="h-6 w-px mx-4"
            style={{
              background: darkMode
                ? 'rgba(255,255,255,0.12)'
                : 'rgba(0,0,0,0.1)',
            }}
          />

          {/* Profile icon */}
          <ProfileSettingsModal>
            <button
              className="flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 text-muted-foreground hover:text-foreground"
              style={{
                background: darkMode
                  ? 'rgba(255,255,255,0.06)'
                  : 'rgba(0,0,0,0.04)',
              }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                }}
              >
                {profile?.full_name?.charAt(0) ?? 'U'}
              </div>
            </button>
          </ProfileSettingsModal>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className="flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200"
            style={{ color: 'hsl(0 63% 51%)' }}
          >
            <LogOut className="h-5 w-5" />
          </button>
          </div>
        </GlassSurface>
      </div>

    </div>
  );
}

