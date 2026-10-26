import React from 'react';
import { User } from '../types';
import { Sparkles, ShieldCheck, UserCheck, LogOut, Radio, Info, Layers } from 'lucide-react';

interface NavbarProps {
  user: User;
  onLogout: () => void;
  sseConnected: boolean;
  onOpenDemoSwitcher: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  sseConnected,
  onOpenDemoSwitcher,
}) => {
  const isSupervisor = user.role === 'supervisor';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">CleanDesk</span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded-full">
                  v2.0 Pro
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden md:block">
                Manajemen Tugas Cleaning Service Kantor Real-Time
              </p>
            </div>
          </div>

          {/* Center Info / Tab Isolation Indicator */}
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-600">
            <Layers className="w-3.5 h-3.5 text-teal-600" />
            <span className="font-medium text-slate-700">Sesi Terisolasi Tab Browser:</span>
            <span className="font-semibold text-teal-700">
              {isSupervisor ? 'Mode Supervisor' : `Staff (${user.nama_lengkap.split(' ')[0]})`}
            </span>
            <span
              className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded cursor-help"
              title="Sesi login disimpan dalam sessionStorage per tab. Buka tab baru untuk menguji login staf dan supervisor bersamaan tanpa tertukar."
            >
              Multi-Tab Ready
            </span>
          </div>

          {/* Right side status & user profile */}
          <div className="flex items-center space-x-3">
            {/* Live SSE Indicator */}
            <div
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                sseConnected
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
              title={sseConnected ? 'Server-Sent Events aktif: Pembaruan tugas diterima live' : 'Menghubungkan ke server real-time...'}
            >
              <Radio
                className={`w-3.5 h-3.5 ${
                  sseConnected ? 'text-emerald-500 animate-pulse' : 'text-amber-500'
                }`}
              />
              <span className="hidden sm:inline">
                {sseConnected ? 'Live Real-Time' : 'Menghubungkan...'}
              </span>
            </div>

            {/* Demo switcher helper button */}
            <button
              onClick={onOpenDemoSwitcher}
              className="hidden md:inline-flex items-center space-x-1 text-xs text-slate-600 hover:text-teal-700 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors"
              title="Buka panduan multi-tab / ganti akun demo"
            >
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>Info Multi-Tab</span>
            </button>

            {/* User Profile Badge */}
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                  isSupervisor
                    ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500/20'
                    : 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500/20'
                }`}
              >
                {isSupervisor ? (
                  <ShieldCheck className="w-4 h-4" />
                ) : (
                  <UserCheck className="w-4 h-4" />
                )}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-slate-900 leading-none">
                  {user.nama_lengkap}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 capitalize flex items-center gap-1">
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${
                      isSupervisor ? 'bg-indigo-500' : 'bg-emerald-500'
                    }`}
                  />
                  {user.role} ({user.username})
                </div>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Logout dari tab ini"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
