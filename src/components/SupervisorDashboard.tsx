import React, { useState, useEffect, useMemo } from 'react';
import { User, Task, Stats } from '../types';
import { api } from '../services/api';
import { 
  ShieldCheck, Users, CheckCircle2, Clock, Calendar, 
  Search, Filter, ZoomIn, ZoomOut, RotateCcw, UserPlus, 
  Download, Printer, Radio, Eye, Check, X, Sparkles, RefreshCw,
  Maximize2, ArrowRightLeft, SlidersHorizontal, ChevronRight, Layers
} from 'lucide-react';

interface SupervisorDashboardProps {
  user: User;
  realtimePulse: number; // triggers re-fetch on SSE event
}

export const SupervisorDashboard: React.FC<SupervisorDashboardProps> = ({
  user,
  realtimePulse,
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedStaff, setSelectedStaff] = useState<string>('all');
  const [selectedDateMode, setSelectedDateMode] = useState<'today' | 'custom' | 'all'>('today');
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [inspectTask, setInspectTask] = useState<Task | null>(null);
  const [inspectionMode, setInspectionMode] = useState<'side-by-side' | 'slider'>('side-by-side');
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [zoomLevel, setZoomLevel] = useState<number>(100); // 100% to 250%

  // Add Staff Modal
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffUsername, setNewStaffUsername] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffNama, setNewStaffNama] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'staff' | 'supervisor'>('staff');
  const [addingStaffLoading, setAddingStaffLoading] = useState(false);
  const [addStaffError, setAddStaffError] = useState<string | null>(null);
  const [addStaffSuccess, setAddStaffSuccess] = useState<string | null>(null);

  // Staff Management view modal
  const [showStaffListModal, setShowStaffListModal] = useState(false);

  // Fetch all data
  const fetchData = async () => {
    try {
      setLoading(true);

      const targetDate =
        selectedDateMode === 'today'
          ? new Date().toISOString().split('T')[0]
          : selectedDateMode === 'custom'
          ? customDate
          : undefined;

      const [tasksData, usersData, statsData] = await Promise.all([
        api.getTasks({
          userId: selectedStaff === 'all' ? undefined : selectedStaff,
          tanggal: targetDate,
          status: selectedStatus === 'all' ? undefined : selectedStatus,
          search: searchQuery.trim() || undefined,
        }),
        api.getUsers(),
        api.getStats(),
      ]);

      setTasks(tasksData);
      setUsersList(usersData);
      setStats(statsData);
    } catch (err) {
      console.error('Error loading supervisor data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedStaff, selectedDateMode, customDate, selectedStatus, searchQuery, realtimePulse]);

  // Handle Add Staff
  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddStaffError(null);
    setAddStaffSuccess(null);

    if (!newStaffUsername.trim() || !newStaffPassword || !newStaffNama.trim()) {
      setAddStaffError('Semua kolom formulir wajib diisi.');
      return;
    }

    setAddingStaffLoading(true);
    try {
      await api.createUser({
        username: newStaffUsername.trim(),
        passwordPlain: newStaffPassword,
        role: newStaffRole,
        nama_lengkap: newStaffNama.trim(),
      });
      setAddStaffSuccess(`Akun "${newStaffNama}" berhasil didaftarkan!`);
      setNewStaffUsername('');
      setNewStaffPassword('');
      setNewStaffNama('');
      fetchData();
      setTimeout(() => {
        setShowAddStaffModal(false);
        setAddStaffSuccess(null);
      }, 1500);
    } catch (err: any) {
      setAddStaffError(err.message || 'Gagal mendaftarkan staff.');
    } finally {
      setAddingStaffLoading(false);
    }
  };

  // Zoom controls
  const handleZoom = (direction: 'in' | 'out' | 'reset' | number) => {
    if (typeof direction === 'number') {
      setZoomLevel(direction);
    } else if (direction === 'in') {
      setZoomLevel((prev) => Math.min(250, prev + 25));
    } else if (direction === 'out') {
      setZoomLevel((prev) => Math.max(100, prev - 25));
    } else {
      setZoomLevel(100);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Nama Pekerjaan', 'Nama Staff', 'Tanggal', 'Waktu Input', 'Status'];
    const rows = tasks.map((t) => [
      t.id,
      `"${t.nama_pekerjaan.replace(/"/g, '""')}"`,
      `"${t.nama_staff}"`,
      t.tanggal,
      `"${t.waktu_input}"`,
      t.status === 'selesai' ? 'SELESAI (2 FOTO)' : 'BELUM SELESAI',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cleandesk_laporan_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Report
  const handlePrint = () => {
    window.print();
  };

  const staffMembers = useMemo(() => {
    return usersList.filter((u) => u.role === 'staff');
  }, [usersList]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header & Metrics Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-8 border border-indigo-900/40">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Pusat Kendali Pengawasan Operasional</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <span>Dashboard Supervisor Real-Time</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live Monitoring
              </span>
            </h1>
            <p className="mt-1 text-slate-300 text-sm max-w-2xl leading-relaxed">
              Memantau pelaksanaan kebersihan kantor oleh seluruh tim cleaning service secara langsung melalui koneksi Server-Sent Events (SSE). Inspeksi foto sebelum & sesudah dengan zoom resolusi tinggi hingga 250%.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setAddStaffError(null);
                setAddStaffSuccess(null);
                setShowAddStaffModal(true);
              }}
              className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Tambah Akun Staff</span>
            </button>

            <button
              onClick={() => setShowStaffListModal(true)}
              className="inline-flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2.5 rounded-xl font-semibold text-xs border border-slate-700 transition-colors"
            >
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Kelola Tim Staff ({staffMembers.length})</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2.5 rounded-xl font-semibold text-xs border border-slate-700 transition-colors"
              title="Unduh CSV"
            >
              <Download className="w-4 h-4" />
              <span>CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2.5 rounded-xl font-semibold text-xs border border-slate-700 transition-colors"
              title="Cetak Laporan"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak</span>
            </button>

            <button
              onClick={fetchData}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors"
              title="Perbarui Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Real-time KPI Metric Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-indigo-900/60">
            <div className="bg-slate-800/60 backdrop-blur rounded-2xl p-4 border border-indigo-500/20">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Tugas Hari Ini</span>
                <Calendar className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                {stats.todayStats.total}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Total terdaftar untuk shift hari ini
              </div>
            </div>

            <div className="bg-slate-800/60 backdrop-blur rounded-2xl p-4 border border-emerald-500/20">
              <div className="flex items-center justify-between text-xs text-emerald-400">
                <span>Selesai (2 Bukti Foto)</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-1">
                {stats.todayStats.selesai}
              </div>
              <div className="mt-2 w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${stats.todayStats.progressPercent}%` }}
                />
              </div>
              <div className="text-[11px] text-emerald-300/80 mt-1 font-semibold">
                {stats.todayStats.progressPercent}% progres selesai
              </div>
            </div>

            <div className="bg-slate-800/60 backdrop-blur rounded-2xl p-4 border border-amber-500/20">
              <div className="flex items-center justify-between text-xs text-amber-400">
                <span>Belum Selesai (Pending)</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 mt-1">
                {stats.todayStats.belum}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Menunggu eksekusi & bukti staff
              </div>
            </div>

            <div className="bg-slate-800/60 backdrop-blur rounded-2xl p-4 border border-indigo-500/20">
              <div className="flex items-center justify-between text-xs text-indigo-300">
                <span>Total Staff Aktif</span>
                <Users className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                {staffMembers.length}
              </div>
              <div className="text-[11px] text-indigo-300/80 mt-1">
                Personil cleaning terdaftar
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Comprehensive Filter Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span>Panel Filter & Pencarian Lengkap</span>
          </div>

          {(selectedStaff !== 'all' || selectedDateMode !== 'today' || selectedStatus !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedStaff('all');
                setSelectedDateMode('today');
                setSelectedStatus('all');
                setSearchQuery('');
              }}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Semua Filter</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Filter Nama Staff */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Personil Staff Cleaning:
            </label>
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Staff ({staffMembers.length} personil)</option>
              {staffMembers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama_lengkap} (@{s.username})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Filter Tanggal */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Tanggal Pelaksanaan:
            </label>
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setSelectedDateMode('today')}
                className={`px-2.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  selectedDateMode === 'today'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => setSelectedDateMode('all')}
                className={`px-2.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  selectedDateMode === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Semua
              </button>
              <input
                type="date"
                value={customDate}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  setSelectedDateMode('custom');
                }}
                className={`flex-1 text-xs border rounded-lg px-2 py-1.5 ${
                  selectedDateMode === 'custom'
                    ? 'border-indigo-500 bg-indigo-50/50'
                    : 'border-slate-300 bg-slate-50'
                }`}
              />
            </div>
          </div>

          {/* 3. Filter Status Ceklist */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Status Ceklist:
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Status</option>
              <option value="selesai">Selesai (Ada Bukti 2 Foto)</option>
              <option value="belum_selesai">Belum Selesai (Pending)</option>
            </select>
          </div>

          {/* 4. Pencarian Kata Kunci */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Pencarian Kata Kunci:
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama ruangan, pekerjaan, dll..."
                className="w-full text-xs pl-8 pr-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Task Monitoring Table & Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="font-bold text-slate-900 text-base">
              Daftar Tugas Cleaning Service ({tasks.length})
            </h3>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
              Hasil Filter
            </span>
          </div>

          <div className="text-xs text-slate-500 hidden sm:block">
            Klik <strong>"Inspeksi & Zoom Foto"</strong> untuk memvalidasi kualitas pekerjaan
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500">Memuat data monitoring tugas real-time...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">Tidak Ada Tugas yang Sesuai</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Cobalah mereset filter atau memilih tanggal lain untuk melihat riwayat pekerjaan staff.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tasks.map((task) => {
              const isDone = task.status === 'selesai';

              return (
                <div
                  key={task.id}
                  className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                >
                  {/* Left: Task Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      {/* Status Badge */}
                      <span
                        className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
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
                            <span>Menunggu Pengerjaan</span>
                          </>
                        )}
                      </span>

                      {/* Staff Name Badge */}
                      <span className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full">
                        <Users className="w-3 h-3 text-slate-500" />
                        <span>Staff: {task.nama_staff}</span>
                      </span>

                      {/* Date */}
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {task.tanggal}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-slate-900 truncate">
                      {task.nama_pekerjaan}
                    </h4>

                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Waktu input: {task.waktu_input}
                    </p>
                  </div>

                  {/* Right: Photo Preview & Inspection Action */}
                  <div className="flex items-center gap-3 shrink-0">
                    {isDone && task.foto_sebelum && task.foto_sesudah ? (
                      <div className="flex items-center gap-3">
                        {/* Dual miniature preview */}
                        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                          <div className="relative w-16 h-12 rounded-lg overflow-hidden bg-black border border-red-200">
                            <img
                              src={task.foto_sebelum}
                              alt="Sebelum"
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-0 left-0 bg-red-600/90 text-[8px] font-bold text-white px-1">
                              Sebelum
                            </span>
                          </div>
                          <ArrowRightLeft className="w-3 h-3 text-slate-400" />
                          <div className="relative w-16 h-12 rounded-lg overflow-hidden bg-black border border-emerald-200">
                            <img
                              src={task.foto_sesudah}
                              alt="Sesudah"
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-0 left-0 bg-emerald-600/90 text-[8px] font-bold text-white px-1">
                              Sesudah
                            </span>
                          </div>
                        </div>

                        {/* Inspection Button */}
                        <button
                          onClick={() => {
                            setInspectTask(task);
                            setZoomLevel(100);
                            setSliderPos(50);
                          }}
                          className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition-colors shadow-2xs"
                        >
                          <ZoomIn className="w-4 h-4 text-indigo-600" />
                          <span>Inspeksi & Zoom Foto</span>
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
                        Belum ada foto yang diunggah oleh staff
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: INSPEKSI FOTO & PERBESAR RESOLUSI (ZOOM HINGGA 250%) */}
      {inspectTask && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl max-w-5xl w-full p-6 shadow-2xl flex flex-col max-h-[95vh]">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    Inspeksi Mutu Kebersihan
                  </span>
                  <span className="text-xs text-slate-400">
                    Oleh: <strong className="text-white">{inspectTask.nama_staff}</strong>
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1">
                  {inspectTask.nama_pekerjaan}
                </h3>
              </div>

              <button
                onClick={() => setInspectTask(null)}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Inspection Controls Toolbar */}
            <div className="py-3 px-4 bg-slate-800/80 rounded-2xl my-3 flex flex-wrap items-center justify-between gap-3 text-xs border border-slate-700">
              {/* Mode Toggle: Berdampingan vs Split Slider */}
              <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setInspectionMode('side-by-side')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                    inspectionMode === 'side-by-side'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Berdampingan (Side-by-Side)
                </button>
                <button
                  type="button"
                  onClick={() => setInspectionMode('slider')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                    inspectionMode === 'slider'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Interactive Split Slider
                </button>
              </div>

              {/* Zoom Controls (Hingga 250%) */}
              <div className="flex items-center space-x-2">
                <span className="text-slate-400 font-medium">Zoom Foto:</span>
                <button
                  type="button"
                  onClick={() => handleZoom('out')}
                  disabled={zoomLevel <= 100}
                  className="p-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 rounded-lg"
                  title="Perkecil Zoom"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>

                {/* Direct Zoom Presets */}
                <div className="flex items-center space-x-1">
                  {[100, 150, 200, 250].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => handleZoom(level)}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold ${
                        zoomLevel === level
                          ? 'bg-indigo-500 text-white'
                          : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {level}%
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleZoom('in')}
                  disabled={zoomLevel >= 250}
                  className="p-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 rounded-lg"
                  title="Perbesar Zoom (hingga 250%)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handleZoom('reset')}
                  className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg"
                  title="Reset Zoom ke 100%"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Inspection Canvas */}
            <div className="flex-1 overflow-auto rounded-2xl bg-black border border-slate-800 p-4 min-h-[360px] flex items-center justify-center">
              {inspectionMode === 'side-by-side' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                  {/* Foto Sebelum */}
                  <div className="flex flex-col items-center">
                    <div className="w-full flex items-center justify-between mb-2 px-1">
                      <span className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        Foto Kondisi Sebelum (Kotor)
                      </span>
                      <span className="text-[10px] text-slate-400">Zoom: {zoomLevel}%</span>
                    </div>
                    <div className="w-full overflow-hidden rounded-xl border border-red-500/30 bg-slate-950 flex items-center justify-center aspect-video">
                      <img
                        src={inspectTask.foto_sebelum || ''}
                        alt="Sebelum"
                        style={{
                          transform: `scale(${zoomLevel / 100})`,
                          transformOrigin: 'center center',
                          transition: 'transform 0.2s ease-out',
                        }}
                        className="max-h-full max-w-full object-contain cursor-grab active:cursor-grabbing"
                      />
                    </div>
                  </div>

                  {/* Foto Sesudah */}
                  <div className="flex flex-col items-center">
                    <div className="w-full flex items-center justify-between mb-2 px-1">
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Foto Kondisi Sesudah (Selesai &amp; Bersih)
                      </span>
                      <span className="text-[10px] text-slate-400">Zoom: {zoomLevel}%</span>
                    </div>
                    <div className="w-full overflow-hidden rounded-xl border border-emerald-500/30 bg-slate-950 flex items-center justify-center aspect-video">
                      <img
                        src={inspectTask.foto_sesudah || ''}
                        alt="Sesudah"
                        style={{
                          transform: `scale(${zoomLevel / 100})`,
                          transformOrigin: 'center center',
                          transition: 'transform 0.2s ease-out',
                        }}
                        className="max-h-full max-w-full object-contain cursor-grab active:cursor-grabbing"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Interactive Split Slider Mode */
                <div className="flex flex-col items-center w-full max-w-3xl">
                  <div className="w-full flex items-center justify-between mb-2 text-xs text-slate-400">
                    <span>Geser slider untuk membandingkan perbaikan kebersihan</span>
                    <span>Zoom: {zoomLevel}%</span>
                  </div>

                  <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-indigo-500/40 bg-slate-950 select-none">
                    {/* Background: After (Sesudah) */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img
                        src={inspectTask.foto_sesudah || ''}
                        alt="Sesudah"
                        style={{
                          transform: `scale(${zoomLevel / 100})`,
                          transformOrigin: 'center center',
                        }}
                        className="w-full h-full object-contain"
                      />
                      <span className="absolute bottom-3 right-3 bg-emerald-600/90 text-white text-xs font-bold px-2 py-1 rounded">
                        SESUDAH ({100 - sliderPos}%)
                      </span>
                    </div>

                    {/* Foreground: Before (Sebelum), clipped */}
                    <div
                      className="absolute inset-0 overflow-hidden"
                      style={{ width: `${sliderPos}%` }}
                    >
                      <div className="w-full h-full relative" style={{ width: '100%' }}>
                        <img
                          src={inspectTask.foto_sebelum || ''}
                          alt="Sebelum"
                          style={{
                            transform: `scale(${zoomLevel / 100})`,
                            transformOrigin: 'center center',
                          }}
                          className="w-full h-full object-contain"
                        />
                        <span className="absolute bottom-3 left-3 bg-red-600/90 text-white text-xs font-bold px-2 py-1 rounded">
                          SEBELUM ({sliderPos}%)
                        </span>
                      </div>
                    </div>

                    {/* Divider Line & Handle */}
                    <div
                      className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize shadow-2xl flex items-center justify-center"
                      style={{ left: `${sliderPos}%` }}
                    >
                      <div className="w-7 h-7 rounded-full bg-white text-slate-900 shadow-lg flex items-center justify-center font-bold text-[10px]">
                        ↔
                      </div>
                    </div>
                  </div>

                  {/* Range input for easy dragging */}
                  <div className="w-full mt-3 flex items-center space-x-3">
                    <span className="text-xs font-bold text-red-400">Sebelum</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={sliderPos}
                      onChange={(e) => setSliderPos(Number(e.target.value))}
                      className="flex-1 accent-indigo-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-emerald-400">Sesudah</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Summary */}
            <div className="pt-4 mt-3 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-3">
              <div>
                Dikerjakan pada: <strong className="text-slate-200">{inspectTask.tanggal} ({inspectTask.waktu_input})</strong>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setInspectTask(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl"
                >
                  Selesai Inspeksi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: PENAMBAHAN AKUN STAFF BARU */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Registrasi Staff Baru</h3>
                  <p className="text-xs text-slate-500">Buat akun untuk personil cleaning service</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddStaffModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addStaffError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>{addStaffError}</span>
              </div>
            )}

            {addStaffSuccess && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{addStaffSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAddStaffSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Lengkap Staff
                </label>
                <input
                  type="text"
                  value={newStaffNama}
                  onChange={(e) => setNewStaffNama(e.target.value)}
                  placeholder="Contoh: Rian Hidayat"
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Username Akun
                </label>
                <input
                  type="text"
                  value={newStaffUsername}
                  onChange={(e) => setNewStaffUsername(e.target.value)}
                  placeholder="Contoh: rian"
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Password (Akan dienkripsi bcrypt)
                </label>
                <input
                  type="password"
                  value={newStaffPassword}
                  onChange={(e) => setNewStaffPassword(e.target.value)}
                  placeholder="Minimal 5 karakter"
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Peran / Role
                </label>
                <select
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value as any)}
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="staff">Staff Cleaning Service</option>
                  <option value="supervisor">Supervisor Operasional</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={addingStaffLoading}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {addingStaffLoading ? (
                    <span>Mendaftarkan...</span>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Simpan Akun Staff</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: KELOLA TIM STAFF */}
      {showStaffListModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Daftar Personil Tim Terdaftar ({usersList.length})
                </h3>
              </div>
              <button
                onClick={() => setShowStaffListModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 overflow-y-auto flex-1 my-3 pr-1">
              {usersList.map((u) => (
                <div key={u.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900">{u.nama_lengkap}</div>
                    <div className="text-xs text-slate-500">
                      Username: <code className="text-indigo-600 font-semibold">{u.username}</code>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      u.role === 'supervisor'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {u.role}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setShowStaffListModal(false);
                  setShowAddStaffModal(true);
                }}
                className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Daftarkan Personil Baru</span>
              </button>
              <button
                type="button"
                onClick={() => setShowStaffListModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
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
