/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Target, Calendar, CheckSquare, Settings, LogOut, Menu, X, Sparkles } from 'lucide-react';

interface NavbarProps {
  activePage: string;
  onPageChange: (page: string) => void;
  user: { name: string; email: string } | null;
  onLogout: () => void;
}

export default function Navbar({ activePage, onPageChange, user, onLogout }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Target },
    { id: 'goals', label: 'My Goal', icon: Target },
    { id: 'weekly', label: 'Weekly Plan', icon: Calendar },
    { id: 'daily', label: 'Daily Tasks', icon: CheckSquare },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (id: string) => {
    onPageChange(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Side Navigation for Desktop */}
      <nav id="desktop-sidebar" className="hidden md:flex flex-col justify-between w-64 bg-[#0A0A0A] border-r border-white/10 h-screen fixed left-0 top-0 p-6 z-20">
        <div className="space-y-8">
          {/* Logo / Header Branding */}
          <div className="flex items-center gap-3 px-2 pt-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-black font-display text-base">
              F
            </div>
            <div>
              <h1 className="font-sans font-bold text-lg tracking-tight text-white leading-none">
                FocusFlow
              </h1>
              <span className="text-[9px] font-mono font-bold text-emerald-400 tracking-wider">AI PRODUCTIVITY</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-1.5">
            <span className="px-2 text-[10px] uppercase tracking-[0.2em] text-white/40 mb-4 block">Navigation</span>
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  id={`nav-link-${item.id}`}
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-white/5 text-white border border-white/10 font-medium'
                      : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {isActive ? (
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  ) : (
                    <div className="w-2 h-2 rounded-full border border-white/30 shrink-0" />
                  )}
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar Info & User Box */}
        <div className="space-y-4">
          <div className="px-2">
            <div className="p-4 bg-gradient-to-br from-indigo-900/20 to-emerald-900/10 rounded-2xl border border-white/5">
              <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-1">Gemini AI Pro</div>
              <p className="text-[11px] leading-relaxed text-white/60 mb-3">AI assistant is active and ready to plan your goals.</p>
              <button 
                onClick={() => handleNavClick('settings')}
                className="w-full py-2 bg-white hover:bg-white/90 text-black text-xs font-bold rounded-lg transition"
              >
                Settings
              </button>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 space-y-3">
            {user && (
              <div className="px-2 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-display font-bold text-xs text-emerald-400 shrink-0">
                  {user.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate leading-snug">{user.name}</p>
                  <p className="text-[10px] text-white/40 truncate mt-0.5 leading-none">{user.email}</p>
                </div>
              </div>
            )}

            <button
              id="btn-sidebar-logout"
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-white/50 hover:text-rose-400 hover:bg-rose-500/5 border border-transparent hover:border-rose-500/10 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-white/40" />
              Keluar (Logout)
            </button>
          </div>
        </div>
      </nav>

      {/* Top Header for Mobile */}
      <header id="mobile-header" className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0A0A0A] border-b border-white/10 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-black text-sm">
            F
          </div>
          <h1 className="font-sans font-bold text-sm text-white">FocusFlow</h1>
        </div>

        <button
          id="btn-mobile-menu-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Drawer Overlay Menu */}
      {isMobileMenuOpen && (
        <div id="mobile-drawer" className="md:hidden fixed inset-0 top-[49px] bg-[#0A0A0A]/95 backdrop-blur-md z-20 flex flex-col justify-between p-5">
          <div className="space-y-6">
            <div className="space-y-1.5">
              {navItems.map(item => {
                const isActive = activePage === item.id;
                return (
                  <button
                    id={`mobile-nav-link-${item.id}`}
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs transition duration-150 ${
                      isActive
                        ? 'bg-white/5 text-white border border-white/10 font-bold'
                        : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    {isActive ? (
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    ) : (
                      <div className="w-2 h-2 rounded-full border border-white/30 shrink-0" />
                    )}
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-white/10 pt-5 space-y-4">
            {user && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400 font-bold text-sm">
                  {user.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{user.name}</p>
                  <p className="text-[10px] text-white/40">{user.email}</p>
                </div>
              </div>
            )}

            <button
              id="btn-mobile-logout"
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold transition"
            >
              <LogOut className="w-4 h-4" />
              Logout dari Akun
            </button>
          </div>
        </div>
      )}
    </>
  );
}
