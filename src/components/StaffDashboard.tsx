import React, { useState, useEffect } from 'react';
import { User, Task } from '../types';
import { api } from '../services/api';
import { 
  Plus, CheckCircle2, Clock, Calendar, Camera, Upload, 
  Trash2, AlertTriangle, Sparkles, X, Check, Image as ImageIcon,
  HelpCircle, RefreshCw, Layers
} from 'lucide-react';

interface StaffDashboardProps {
  user: User;
  onTaskUpdated?: () => void;
}

const QUICK_TASK_SUGGESTIONS = [
  'Sanitasi Meja Kerja & Gagang Pintu Lantai 3',
  'Vakum Karpet Ruang Rapat Eksekutif A',
  'Pembersihan Wastafel & Meja Pantry Kantor',
  'Pengosongan & Pemilahan Tempat Sampah Kering',
  'Mengepel Koridor Utama dengan Disinfektan',
  'Pembersihan Kaca Jendela & Pintu Masuk Lobi',
  'Pembersihan & Pengharum Toilet Karyawan Lt. 2',
  'Pembersihan Area Tangga Darurat & Pegangan Tangga',
];

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ user, onTaskUpdated }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Modal State for New Task
  const [showAddModal, setShowAddModal] = useState(false);
  const [newJobName, setNewJobName] = useState('');
  const [newJobDate, setNewJobDate] = useState(new Date().toISOString().split('T')[0]);
  const [submittingNew, setSubmittingNew] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Modal State for 2-Photo Completion
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [beforePreview, setBeforePreview] = useState<string | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [afterPreview, setAfterPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submittingProof, setSubmittingProof] = useState(false);

  // Photo viewer modal
  const [viewingTaskPhotos, setViewingTaskPhotos] = useState<Task | null>(null);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await api.getTasks({
        userId: user.id,
        tanggal: selectedDate === 'all' ? undefined : selectedDate,
        status: filterStatus === 'all' ? undefined : filterStatus,
      });
      setTasks(data);
    } catch (err) {
      console.error('Error fetching staff tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [selectedDate, filterStatus]);

  // Handle adding new task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobName.trim()) {
      setAddError('Tuliskan nama pekerjaan yang akan dilakukan.');
      return;
    }

    setSubmittingNew(true);
    setAddError(null);
    try {
      await api.createTask(newJobName.trim(), newJobDate);
      setNewJobName('');
      setShowAddModal(false);
      await loadTasks();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err: any) {
      setAddError(err.message || 'Gagal menambahkan tugas.');
    } finally {
      setSubmittingNew(false);
    }
  };

  // Handle file selection for before photo
  const handleBeforeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBeforeFile(file);
      const reader = new FileReader();
      reader.onload = () => setBeforePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Handle file selection for after photo
  const handleAfterFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAfterFile(file);
      const reader = new FileReader();
      reader.onload = () => setAfterPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Quick preset sample photos for instant testing
  const handleUseDemoPresetPhotos = () => {
    // High-resolution clean demo images
    const sampleBefore = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%233e2723"/><rect x="40" y="200" width="520" height="160" fill="%235d4037"/><circle cx="150" cy="250" r="30" fill="%23271406" opacity="0.8"/><circle cx="320" cy="270" r="40" fill="%23271406" opacity="0.7"/><rect x="380" y="220" width="120" height="60" fill="%238d6e63" transform="rotate(12 440 250)"/><text x="300" y="80" font-family="sans-serif" font-size="24" font-weight="bold" fill="%23ffffff" text-anchor="middle">BUKTI KONDISI SEBELUM PENGERJAAN</text><text x="300" y="340" font-family="sans-serif" font-size="16" fill="%23ffcdd2" text-anchor="middle">Area kotor, berdebu, dan belum ditata rapi</text><rect x="20" y="20" width="130" height="32" rx="6" fill="%23d32f2f"/><text x="85" y="42" font-family="sans-serif" font-size="14" font-weight="bold" fill="%23ffffff" text-anchor="middle">FOTO SEBELUM</text></svg>';
    const sampleAfter = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%23e8f5e9"/><rect x="40" y="200" width="520" height="160" fill="%2381c784"/><path d="M 270 250 L 295 275 L 340 230" stroke="%231b5e20" stroke-width="8" fill="none" stroke-linecap="round"/><text x="300" y="80" font-family="sans-serif" font-size="24" font-weight="bold" fill="%231b5e20" text-anchor="middle">BUKTI KONDISI SESUDAH PENGERJAAN</text><text x="300" y="340" font-family="sans-serif" font-size="16" font-weight="bold" fill="%231b5e20" text-anchor="middle">Area bersih mengkilap, steril &amp; tertata rapi</text><rect x="20" y="20" width="130" height="32" rx="6" fill="%232e7d32"/><text x="85" y="42" font-family="sans-serif" font-size="14" font-weight="bold" fill="%23ffffff" text-anchor="middle">FOTO SESUDAH</text></svg>';
    setBeforePreview(sampleBefore);
    setAfterPreview(sampleAfter);
    setBeforeFile(null);
    setAfterFile(null);
    setUploadError(null);
  };

  // Submit 2-photo completion proof
  const handleSubmitCompletionProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingTask) return;

    if (!beforePreview || !afterPreview) {
      setUploadError('Peringatan: KEDUA foto (Foto Sebelum dan Foto Sesudah) WAJIB dilampirkan!');
      return;
    }

    setSubmittingProof(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      if (beforeFile) {
        formData.append('foto_sebelum', beforeFile);
      } else if (beforePreview) {
        formData.append('foto_sebelum', beforePreview);
      }

      if (afterFile) {
        formData.append('foto_sesudah', afterFile);
      } else if (afterPreview) {
        formData.append('foto_sesudah', afterPreview);
      }

      await api.completeTask(completingTask.id, formData);
      setCompletingTask(null);
      setBeforeFile(null);
      setBeforePreview(null);
      setAfterFile(null);
      setAfterPreview(null);
      await loadTasks();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err: any) {
      setUploadError(err.message || 'Gagal menyimpan bukti penyelesaian.');
    } finally {
      setSubmittingProof(false);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus tugas ini?')) return;
    try {
      await api.deleteTask(taskId);
      await loadTasks();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus tugas.');
    }
  };

  const completedCount = tasks.filter((t) => t.status === 'selesai').length;
  const pendingCount = tasks.filter((t) => t.status === 'belum_selesai').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Welcome & Actions */}
      <div className="bg-gradient-to-r from-teal-800 to-emerald-700 rounded-2xl p-6 sm:p-8 text-white shadow-xl shadow-teal-900/10 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2 text-teal-200 text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Portal Staff Cleaning Service</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Halo, {user.nama_lengkap}! 👋
            </h1>
            <p className="mt-1 text-teal-100 text-sm max-w-2xl leading-relaxed">
              Tulis daftar pekerjaan pembersihan Anda hari ini secara mandiri. Jangan lupa lampirkan <strong>Foto Sebelum</strong> dan <strong>Foto Sesudah</strong> saat menandai tugas telah selesai.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setNewJobName('');
                setAddError(null);
                setShowAddModal(true);
              }}
              className="inline-flex items-center space-x-2 bg-white text-teal-900 hover:bg-teal-50 px-4 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 text-teal-700" />
              <span>+ Input Tugas Mandiri</span>
            </button>
            <button
              onClick={loadTasks}
              className="p-2.5 bg-teal-700/60 hover:bg-teal-700 text-teal-100 rounded-xl transition-colors border border-teal-600"
              title="Refresh Daftar Tugas"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick summary counters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-teal-600/40">
          <div className="bg-teal-900/40 backdrop-blur rounded-xl p-3 border border-teal-500/30">
            <div className="text-xs text-teal-200">Total Tugas</div>
            <div className="text-xl font-extrabold mt-0.5">{tasks.length}</div>
          </div>
          <div className="bg-teal-900/40 backdrop-blur rounded-xl p-3 border border-teal-500/30">
            <div className="text-xs text-teal-200">Selesai (Ada Bukti)</div>
            <div className="text-xl font-extrabold mt-0.5 text-emerald-300">
              {completedCount}
            </div>
          </div>
          <div className="bg-teal-900/40 backdrop-blur rounded-xl p-3 border border-teal-500/30 col-span-2 sm:col-span-1">
            <div className="text-xs text-teal-200">Perlu Dikerjakan</div>
            <div className="text-xl font-extrabold mt-0.5 text-amber-300">
              {pendingCount}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Date Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs mb-6 flex flex-wrap items-center justify-between gap-4">
        {/* Date Selector */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700">
            <Calendar className="w-4 h-4 text-teal-600" />
            <span>Tanggal Pelaksanaan:</span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                selectedDate === new Date().toISOString().split('T')[0]
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Hari Ini
            </button>
            <input
              type="date"
              value={selectedDate === 'all' ? '' : selectedDate}
              onChange={(e) => setSelectedDate(e.target.value || 'all')}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <button
              type="button"
              onClick={() => setSelectedDate('all')}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                selectedDate === 'all'
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Semua
            </button>
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-1">
          <span className="text-xs text-slate-500 mr-1">Status:</span>
          {[
            { id: 'all', label: 'Semua' },
            { id: 'belum_selesai', label: 'Belum Selesai' },
            { id: 'selesai', label: 'Selesai' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filterStatus === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Memuat daftar tugas pengerjaan...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
          <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Plus className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Belum Ada Tugas pada Filter Ini</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Klik tombol di bawah untuk menuliskan pekerjaan pembersihan mandiri Anda hari ini.
          </p>
          <button
            onClick={() => {
              setNewJobName('');
              setShowAddModal(true);
            }}
            className="mt-4 inline-flex items-center space-x-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tulis Tugas Mandiri Pertama</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => {
            const isDone = task.status === 'selesai';

            return (
              <div
                key={task.id}
                className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between p-5 ${
                  isDone
                    ? 'border-emerald-200 shadow-xs bg-gradient-to-b from-emerald-50/20 to-white'
                    : 'border-slate-200 shadow-sm hover:border-teal-300'
                }`}
              >
                <div>
                  {/* Card Header: Status & Date */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        isDone
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {isDone ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Selesai (2 Bukti Foto)</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Belum Selesai</span>
                        </>
                      )}
                    </span>

                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {task.tanggal}
                    </span>
                  </div>

                  {/* Task Job Name */}
                  <h4 className={`text-base font-bold text-slate-900 leading-snug ${isDone ? 'line-through text-slate-600' : ''}`}>
                    {task.nama_pekerjaan}
                  </h4>

                  <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Waktu input: {task.waktu_input}
                  </p>
                </div>

                {/* Card Footer: Action Buttons */}
                <div className="mt-5 pt-4 border-t border-slate-100">
                  {isDone ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Terverifikasi 2 Foto
                        </span>
                        <button
                          type="button"
                          onClick={() => setViewingTaskPhotos(task)}
                          className="text-xs text-teal-700 hover:text-teal-900 font-semibold underline underline-offset-2 flex items-center gap-1"
                        >
                          <ImageIcon className="w-3.5 h-3.5" /> Lihat Bukti Foto
                        </button>
                      </div>

                      {/* Small thumbnail previews */}
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div
                          onClick={() => setViewingTaskPhotos(task)}
                          className="cursor-pointer group relative rounded-lg overflow-hidden border border-slate-200 bg-slate-100 h-20"
                        >
                          {task.foto_sebelum && (
                            <img
                              src={task.foto_sebelum}
                              alt="Sebelum"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          )}
                          <span className="absolute bottom-1 left-1 bg-red-600/90 text-white text-[9px] font-bold px-1.5 py-0.2 rounded">
                            Sebelum
                          </span>
                        </div>
                        <div
                          onClick={() => setViewingTaskPhotos(task)}
                          className="cursor-pointer group relative rounded-lg overflow-hidden border border-slate-200 bg-slate-100 h-20"
                        >
                          {task.foto_sesudah && (
                            <img
                              src={task.foto_sesudah}
                              alt="Sesudah"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          )}
                          <span className="absolute bottom-1 left-1 bg-emerald-600/90 text-white text-[9px] font-bold px-1.5 py-0.2 rounded">
                            Sesudah
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setCompletingTask(task);
                          setBeforeFile(null);
                          setBeforePreview(null);
                          setAfterFile(null);
                          setAfterPreview(null);
                          setUploadError(null);
                        }}
                        className="flex-1 inline-flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-3 rounded-xl font-bold text-xs shadow-xs transition-colors"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Tandai Selesai (Unggah 2 Foto)</span>
                      </button>

                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus tugas"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: INPUT TUGAS MANDIRI */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Input Tugas Mandiri</h3>
                  <p className="text-xs text-slate-500">Tuliskan nama pekerjaan cleaning yang Anda lakukan</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTask} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Pekerjaan / Ruangan / Lokasi
                </label>
                <textarea
                  value={newJobName}
                  onChange={(e) => setNewJobName(e.target.value)}
                  placeholder="Contoh: Membersihkan dan sanitasi meja kerja Ruang HRD Lantai 3"
                  rows={3}
                  className="w-full text-sm border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Tanggal Pelaksanaan
                </label>
                <input
                  type="date"
                  value={newJobDate}
                  onChange={(e) => setNewJobDate(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              {/* Quick suggestion chips */}
              <div>
                <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Saran Pekerjaan Cepat (Klik untuk memilih):
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {QUICK_TASK_SUGGESTIONS.map((suggestion, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setNewJobName(suggestion)}
                      className="text-left text-xs bg-slate-100 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-300 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      + {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingNew}
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs disabled:opacity-50 flex items-center space-x-1"
                >
                  {submittingNew ? (
                    <span>Menyimpan...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Simpan Tugas</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SISTEM CEKLIST WAJIB 2 FOTO (BEFORE & AFTER) */}
      {completingTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="inline-flex items-center space-x-1 text-[11px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full mb-1">
                  SOP Validasi Pekerjaan
                </span>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Ceklist Tugas: Wajib Unggah 2 Foto
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tugas: <strong className="text-slate-800">{completingTask.nama_pekerjaan}</strong>
                </p>
              </div>
              <button
                onClick={() => setCompletingTask(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Strict Notice banner */}
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-3 text-xs text-amber-900">
              <Camera className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-950">Aturan Ceklist Validasi Kebersihan:</p>
                <p className="mt-0.5 text-amber-800">
                  Sistem mewajibkan 2 foto: <strong>1 Foto Sebelum</strong> (kondisi berantakan/kotor) dan <strong>1 Foto Sesudah</strong> (kondisi kinclong/rapi). Tugas tidak dapat diselesaikan jika salah satu foto kosong.
                </p>
              </div>
            </div>

            {uploadError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitCompletionProof} className="mt-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Foto Sebelum */}
                <div className={`p-4 rounded-xl border-2 ${beforePreview ? 'border-red-300 bg-red-50/20' : 'border-dashed border-slate-300 bg-slate-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-red-700 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-600" />
                      1. Foto Sebelum (Wajib)
                    </span>
                    {beforePreview && (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Siap
                      </span>
                    )}
                  </div>

                  {beforePreview ? (
                    <div className="relative rounded-lg overflow-hidden border border-red-200 bg-black aspect-video flex items-center justify-center">
                      <img
                        src={beforePreview}
                        alt="Foto Sebelum"
                        className="w-full h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setBeforeFile(null);
                          setBeforePreview(null);
                        }}
                        className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white p-1 rounded-md text-xs"
                        title="Ganti Foto"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center aspect-video rounded-lg cursor-pointer hover:bg-slate-100 transition-colors border border-slate-200">
                      <Camera className="w-8 h-8 text-slate-400 mb-1" />
                      <span className="text-xs font-semibold text-slate-700">Ambil / Pilih Foto Sebelum</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, atau WebP</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleBeforeFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* 2. Foto Sesudah */}
                <div className={`p-4 rounded-xl border-2 ${afterPreview ? 'border-emerald-300 bg-emerald-50/20' : 'border-dashed border-slate-300 bg-slate-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      2. Foto Sesudah (Wajib)
                    </span>
                    {afterPreview && (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Siap
                      </span>
                    )}
                  </div>

                  {afterPreview ? (
                    <div className="relative rounded-lg overflow-hidden border border-emerald-200 bg-black aspect-video flex items-center justify-center">
                      <img
                        src={afterPreview}
                        alt="Foto Sesudah"
                        className="w-full h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setAfterFile(null);
                          setAfterPreview(null);
                        }}
                        className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white p-1 rounded-md text-xs"
                        title="Ganti Foto"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center aspect-video rounded-lg cursor-pointer hover:bg-slate-100 transition-colors border border-slate-200">
                      <Camera className="w-8 h-8 text-slate-400 mb-1" />
                      <span className="text-xs font-semibold text-slate-700">Ambil / Pilih Foto Sesudah</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, atau WebP</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleAfterFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Convenience Quick Fill Button for testing */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs text-slate-600 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Menguji tanpa kamera/file lokal?
                </span>
                <button
                  type="button"
                  onClick={handleUseDemoPresetPhotos}
                  className="text-xs text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 font-bold px-3 py-1.5 rounded-lg border border-teal-200 transition-colors"
                >
                  Gunakan Contoh Foto Demo Cepat (1-Klik)
                </button>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCompletingTask(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingProof || !beforePreview || !afterPreview}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md disabled:opacity-40 transition-all flex items-center space-x-1.5"
                >
                  {submittingProof ? (
                    <span>Memvalidasi & Mengunggah...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verifikasi & Selesaikan Tugas</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VIEW TASK PHOTOS */}
      {viewingTaskPhotos && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Bukti Ceklist Foto Pengerjaan</h3>
                <p className="text-xs text-slate-500">{viewingTaskPhotos.nama_pekerjaan}</p>
              </div>
              <button
                onClick={() => setViewingTaskPhotos(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <div className="text-xs font-bold text-red-600 mb-1">FOTO SEBELUM (BEFORE)</div>
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-black aspect-video flex items-center justify-center">
                  <img
                    src={viewingTaskPhotos.foto_sebelum || ''}
                    alt="Foto Sebelum"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-600 mb-1">FOTO SESUDAH (AFTER)</div>
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-black aspect-video flex items-center justify-center">
                  <img
                    src={viewingTaskPhotos.foto_sesudah || ''}
                    alt="Foto Sesudah"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Waktu Penyelesaian: {viewingTaskPhotos.waktu_input}</span>
              <button
                onClick={() => setViewingTaskPhotos(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
