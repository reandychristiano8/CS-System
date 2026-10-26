import React, { useState, useEffect, useCallback } from 'react';
import { User, ToastMessage } from './types';
import { api, sessionManager } from './services/api';
import { Navbar } from './components/Navbar';
import { LoginView } from './components/LoginView';
import { StaffDashboard } from './components/StaffDashboard';
import { SupervisorDashboard } from './components/SupervisorDashboard';
import { DemoSwitcherModal } from './components/DemoSwitcherModal';
import { LiveToast } from './components/LiveToast';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [sseConnected, setSseConnected] = useState(false);
  const [realtimePulse, setRealtimePulse] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showDemoModal, setShowDemoModal] = useState(false);

  // Add toast helper
  const addToast = useCallback((title: string, message: string, type: 'info' | 'success' | 'warning' = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const newToast: ToastMessage = { id, title, message, type, timestamp: now };
    setToasts((prev) => [...prev.slice(-3), newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Check auth on tab mount
  useEffect(() => {
    const checkSession = async () => {
      if (sessionManager.hasToken()) {
        try {
          const res = await api.getMe();
          setUser(res.user);
        } catch (err) {
          console.warn('Session expired or invalid, please login again.');
          sessionManager.clearToken();
          setUser(null);
        }
      }
      setCheckingAuth(false);
    };

    checkSession();
  }, []);

  // Server-Sent Events (SSE) setup
  useEffect(() => {
    if (!user) {
      setSseConnected(false);
      return;
    }

    const token = sessionManager.getToken();
    const eventSourceUrl = token ? `/api/events?token=${encodeURIComponent(token)}` : '/api/events';
    const es = new EventSource(eventSourceUrl);

    es.addEventListener('open', () => {
      setSseConnected(true);
    });

    es.addEventListener('connected', () => {
      setSseConnected(true);
    });

    es.addEventListener('task_created', (e) => {
      try {
        const payload = JSON.parse(e.data);
        setRealtimePulse((p) => p + 1);
        addToast('Tugas Baru Ditambahkan', payload.message || 'Staff menambahkan tugas baru', 'info');
      } catch (err) {
        console.error(err);
      }
    });

    es.addEventListener('task_completed', (e) => {
      try {
        const payload = JSON.parse(e.data);
        setRealtimePulse((p) => p + 1);
        addToast(
          'Tugas Selesai (2 Bukti Foto)',
          payload.message || `${payload.staffName} menyelesaikan tugas!`,
          'success'
        );
      } catch (err) {
        console.error(err);
      }
    });

    es.addEventListener('task_deleted', (e) => {
      try {
        setRealtimePulse((p) => p + 1);
      } catch (err) {
        console.error(err);
      }
    });

    es.addEventListener('staff_added', (e) => {
      try {
        const payload = JSON.parse(e.data);
        setRealtimePulse((p) => p + 1);
        addToast('Staff Baru Terdaftar', payload.message, 'info');
      } catch (err) {
        console.error(err);
      }
    });

    es.onerror = () => {
      setSseConnected(false);
    };

    return () => {
      es.close();
      setSseConnected(false);
    };
  }, [user, addToast]);

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400 font-medium tracking-wide">
            Memuat Sesi CleanDesk Terisolasi...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        user={user}
        onLogout={handleLogout}
        sseConnected={sseConnected}
        onOpenDemoSwitcher={() => setShowDemoModal(true)}
      />

      {/* Main Content View by Role */}
      <main className="flex-1">
        {user.role === 'supervisor' ? (
          <SupervisorDashboard
            user={user}
            realtimePulse={realtimePulse}
          />
        ) : (
          <StaffDashboard
            user={user}
            onTaskUpdated={() => setRealtimePulse((p) => p + 1)}
          />
        )}
      </main>

      {/* Live Toast Notifications */}
      <LiveToast toasts={toasts} onDismiss={dismissToast} />

      {/* Multi-Tab & Demo Accounts Switcher Modal */}
      {showDemoModal && (
        <DemoSwitcherModal
          currentUser={user}
          onClose={() => setShowDemoModal(false)}
          onSwitchUser={(newUser) => setUser(newUser)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>CleanDesk &copy; 2026 — Manajemen Tugas Cleaning Service Kantor.</span>
          <span className="text-slate-400">
            Node.js (Express + TypeScript + React) • MySQL Relational Architecture • Real-Time SSE
          </span>
        </div>
      </footer>
    </div>
  );
}
