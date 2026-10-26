export interface User {
  id: number;
  username: string;
  role: 'supervisor' | 'staff';
  nama_lengkap: string;
}

export interface Task {
  id: number;
  user_id: number;
  nama_pekerjaan: string;
  status: 'belum_selesai' | 'selesai';
  foto_sebelum: string | null;
  foto_sesudah: string | null;
  tanggal: string; // YYYY-MM-DD
  waktu_input: string; // YYYY-MM-DD HH:mm:ss
  nama_staff: string;
  username_staff: string;
}

export interface Stats {
  today: string;
  todayStats: {
    total: number;
    selesai: number;
    belum: number;
    progressPercent: number;
  };
  allTimeStats: {
    total: number;
    selesai: number;
    belum: number;
  };
  totalStaff: number;
  totalUsers: number;
}

export interface DemoAccount {
  role: 'supervisor' | 'staff';
  username: string;
  passwordHint: string;
  label: string;
  description: string;
}

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  timestamp: string;
}
