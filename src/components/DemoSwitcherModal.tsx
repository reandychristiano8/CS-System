import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { DemoAccount, User } from '../types';
import { Layers, Shield, UserCheck, X, Check, ExternalLink, ArrowRight } from 'lucide-react';

interface DemoSwitcherModalProps {
  currentUser: User;
  onClose: () => void;
  onSwitchUser: (user: User) => void;
}

export const DemoSwitcherModal: React.FC<DemoSwitcherModalProps> = ({
  currentUser,
  onClose,
  onSwitchUser,
}) => {
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [loadingUser, setLoadingUser] = useState<string | null>(null);

  useEffect(() => {
    api.getDemoAccounts()
      .then((accs) => setDemoAccounts(accs))
      .catch((err) => console.error(err));
  }, []);

  const handleSwitch = async (acc: DemoAccount) => {
    try {
      setLoadingUser(acc.username);
      const res = await api.login(acc.username, acc.passwordHint);
      onSwitchUser(res.user);
      onClose();
    } catch (err: any) {
      alert('Gagal beralih akun: ' + (err.message || 'Error'));
    } finally {
      setLoadingUser(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Manajemen Sesi Anti-Tertukar
              </h3>
              <p className="text-xs text-slate-500">
                Fitur isolasi token per tab browser (sessionStorage)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Explanation */}
        <div className="mt-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-2">
          <p className="font-semibold text-slate-900 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-500" />
            Bagaimana Cara Menguji Multi-Tab?
          </p>
          <p className="leading-relaxed text-slate-600">
            Aplikasi ini menyimpan token kriptografis di <code>sessionStorage</code> (bukan shared cookie global). Artinya:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
            <li>
              <strong>Tab 1:</strong> Buka sebagai <strong>Supervisor</strong> untuk memantau pengerjaan secara real-time.
            </li>
            <li>
              <strong>Tab 2 (Tab Baru):</strong> Buka sebagai <strong>Staff (Budi / Siti / Agus)</strong> untuk menambah tugas mandiri &amp; menyelesaikan ceklist dengan 2 foto.
            </li>
            <li>
              Saat Staff menyelesaikan tugas di Tab 2, Tab 1 milik Supervisor akan <strong>langsung terupdate secara live</strong> tanpa refresh!
            </li>
          </ul>
        </div>

        {/* Quick Switch on This Tab */}
        <div className="mt-4">
          <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Beralih Akun Cepat di Tab Ini:
          </div>

          <div className="space-y-2">
            {demoAccounts.map((acc) => {
              const isCurrent = currentUser.username === acc.username;
              const isSuper = acc.role === 'supervisor';

              return (
                <button
                  key={acc.username}
                  onClick={() => handleSwitch(acc)}
                  disabled={isCurrent || loadingUser !== null}
                  className={`w-full p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                    isCurrent
                      ? 'bg-teal-50/80 border-teal-300 ring-1 ring-teal-400'
                      : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isSuper ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {isSuper ? <Shield className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{acc.label}</span>
                        {isCurrent && (
                          <span className="text-[10px] bg-teal-600 text-white px-1.5 py-0.2 rounded font-semibold">
                            Sedang Aktif di Tab Ini
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        User: <code className="text-slate-800">{acc.username}</code> • Pass: <code className="text-slate-800">{acc.passwordHint}</code>
                      </div>
                    </div>
                  </div>

                  {!isCurrent && (
                    <div className="text-teal-700 font-bold text-xs flex items-center gap-1">
                      {loadingUser === acc.username ? (
                        <span className="w-3.5 h-3.5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Pilih</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
