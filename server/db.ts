import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';

export interface UserRecord {
  id: number;
  username: string;
  password: string; // bcrypt hash
  role: 'supervisor' | 'staff';
  nama_lengkap: string;
}

export interface TaskRecord {
  id: number;
  user_id: number;
  nama_pekerjaan: string;
  status: 'belum_selesai' | 'selesai';
  foto_sebelum: string | null;
  foto_sesudah: string | null;
  tanggal: string; // YYYY-MM-DD
  waktu_input: string; // YYYY-MM-DD HH:mm:ss
}

export interface TaskWithUser extends TaskRecord {
  nama_staff: string;
  username_staff: string;
}

// Preset realistic cleaning photos (SVG base64 encoded) for instant demo & fallback testing
export const SAMPLE_BEFORE_PHOTOS = [
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%234a4238"/><rect x="40" y="220" width="520" height="150" fill="%236d5d4d"/><text x="300" y="70" font-family="sans-serif" font-size="24" font-weight="bold" fill="%23ffffff" text-anchor="middle">KONDISI SEBELUM (BERANTAKAN / KOTOR)</text><circle cx="150" cy="270" r="28" fill="%233e2723" opacity="0.8"/><circle cx="280" cy="290" r="35" fill="%235d4037" opacity="0.7"/><rect x="360" y="240" width="120" height="50" fill="%238d6e63" transform="rotate(15 420 265)"/><circle cx="480" cy="310" r="22" fill="%233e2723" opacity="0.85"/><text x="300" y="360" font-family="sans-serif" font-size="16" fill="%23ffcdd2" text-anchor="middle">❌ Debu tebal, noda cangkir kopi, dan kertas berserakan</text><rect x="20" y="20" width="130" height="32" rx="6" fill="%23d32f2f"/><text x="85" y="42" font-family="sans-serif" font-size="14" font-weight="bold" fill="%23ffffff" text-anchor="middle">FOTO SEBELUM</text></svg>',
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%2337474f"/><rect x="60" y="160" width="480" height="200" fill="%23546e7a"/><circle cx="180" cy="230" r="45" fill="%23263238" opacity="0.7"/><circle cx="390" cy="270" r="50" fill="%23263238" opacity="0.6"/><text x="300" y="70" font-family="sans-serif" font-size="24" font-weight="bold" fill="%23ffffff" text-anchor="middle">AREA PANTRY KANTOR (SEBELUM)</text><text x="300" y="340" font-family="sans-serif" font-size="16" fill="%23ffab91" text-anchor="middle">❌ Wastafel bernoda kotor dan tumpukan tempat minum kotor</text><rect x="20" y="20" width="130" height="32" rx="6" fill="%23d32f2f"/><text x="85" y="42" font-family="sans-serif" font-size="14" font-weight="bold" fill="%23ffffff" text-anchor="middle">FOTO SEBELUM</text></svg>'
];

export const SAMPLE_AFTER_PHOTOS = [
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%23e8f5e9"/><rect x="40" y="220" width="520" height="150" fill="%2381c784"/><rect x="40" y="220" width="520" height="15" fill="%23c8e6c9"/><text x="300" y="70" font-family="sans-serif" font-size="24" font-weight="bold" fill="%231b5e20" text-anchor="middle">KONDISI SESUDAH (BERSIH & HIGIENIS)</text><circle cx="150" cy="270" r="18" fill="%23ffffff" opacity="0.6"/><path d="M 280 260 L 300 280 L 340 240" stroke="%232e7d32" stroke-width="8" fill="none" stroke-linecap="round"/><rect x="380" y="235" width="80" height="55" rx="6" fill="%23a5d6a7"/><circle cx="420" cy="250" r="12" fill="%23ffffff"/><text x="300" y="350" font-family="sans-serif" font-size="16" font-weight="bold" fill="%231b5e20" text-anchor="middle">✨ Permukaan mengkilap, disanitasi & tertata rapi sesuai SOP</text><rect x="20" y="20" width="130" height="32" rx="6" fill="%232e7d32"/><text x="85" y="42" font-family="sans-serif" font-size="14" font-weight="bold" fill="%23ffffff" text-anchor="middle">FOTO SESUDAH</text></svg>',
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%23e0f2f1"/><rect x="60" y="160" width="480" height="200" fill="%234db6ac"/><text x="300" y="70" font-family="sans-serif" font-size="24" font-weight="bold" fill="%23004d40" text-anchor="middle">AREA PANTRY KANTOR (SESUDAH)</text><path d="M 270 250 L 290 270 L 330 230" stroke="%23004d40" stroke-width="8" fill="none" stroke-linecap="round"/><text x="300" y="340" font-family="sans-serif" font-size="16" font-weight="bold" fill="%23004d40" text-anchor="middle">✨ Wastafel kinclong, meja pantry higienis & wangi</text><rect x="20" y="20" width="130" height="32" rx="6" fill="%232e7d32"/><text x="85" y="42" font-family="sans-serif" font-size="14" font-weight="bold" fill="%23ffffff" text-anchor="middle">FOTO SESUDAH</text></svg>'
];

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'cleandesk_relational.json');

interface DatabaseStore {
  users: UserRecord[];
  tasks: TaskRecord[];
  lastUserId: number;
  lastTaskId: number;
}

class DatabaseManager {
  private useMySQL = false;
  private pool: mysql.Pool | null = null;
  private memoryStore: DatabaseStore = {
    users: [],
    tasks: [],
    lastUserId: 0,
    lastTaskId: 0,
  };
  private initialized = false;

  public async init(): Promise<void> {
    if (this.initialized) return;

    // Check if MySQL connection credentials are provided
    const host = process.env.MYSQL_HOST || process.env.DB_HOST;
    const user = process.env.MYSQL_USER || process.env.DB_USER;
    const password = process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD;
    const database = process.env.MYSQL_DATABASE || process.env.DB_NAME;

    if (host && user && database) {
      try {
        console.log(`[DB] Attempting MySQL connection to ${host}:${process.env.MYSQL_PORT || 3306} (${database})...`);
        this.pool = mysql.createPool({
          host,
          port: Number(process.env.MYSQL_PORT) || 3306,
          user,
          password: password || '',
          database,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
        });

        // Test connection
        await this.pool.query('SELECT 1');
        this.useMySQL = true;
        console.log('[DB] Successfully connected to MySQL database.');
        await this.initMySQLTables();
        await this.seedMySQL();
        this.initialized = true;
        return;
      } catch (err: any) {
        console.warn(`[DB] MySQL connection failed (${err.message}). Falling back to file-backed relational store.`);
        this.useMySQL = false;
        this.pool = null;
      }
    } else {
      console.log('[DB] MySQL credentials not provided in environment. Using high-fidelity relational file store.');
    }

    // Fallback: Persistent relational JSON database
    await this.initFileStore();
    this.initialized = true;
  }

  private async initMySQLTables(): Promise<void> {
    if (!this.pool) return;
    const createUsers = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('supervisor', 'staff') NOT NULL,
        nama_lengkap VARCHAR(150) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    const createTasks = `
      CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        nama_pekerjaan VARCHAR(255) NOT NULL,
        status ENUM('belum_selesai', 'selesai') NOT NULL DEFAULT 'belum_selesai',
        foto_sebelum LONGTEXT,
        foto_sesudah LONGTEXT,
        tanggal VARCHAR(20) NOT NULL,
        waktu_input VARCHAR(30) NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await this.pool.query(createUsers);
    await this.pool.query(createTasks);
  }

  private async seedMySQL(): Promise<void> {
    if (!this.pool) return;
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT COUNT(*) as count FROM users');
    if (rows[0].count === 0) {
      console.log('[DB] Seeding default users into MySQL...');
      const adminPass = await bcrypt.hash('admin123', 10);
      const staffPass = await bcrypt.hash('staff123', 10);

      await this.pool.query(
        'INSERT INTO users (username, password, role, nama_lengkap) VALUES ?',
        [[
          ['supervisor', adminPass, 'supervisor', 'Pak Hendra (Supervisor Operasional)'],
          ['budi', staffPass, 'staff', 'Budi Santoso'],
          ['siti', staffPass, 'staff', 'Siti Rahmawati'],
          ['agus', staffPass, 'staff', 'Agus Pratama'],
        ]]
      );

      // Seed initial tasks
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      await this.pool.query(
        'INSERT INTO tasks (user_id, nama_pekerjaan, status, foto_sebelum, foto_sesudah, tanggal, waktu_input) VALUES ?',
        [[
          [2, 'Membersihkan & Sanitasi Meja Kerja Ruang HRD Lantai 3', 'selesai', SAMPLE_BEFORE_PHOTOS[0], SAMPLE_AFTER_PHOTOS[0], today, `${today} 08:30:00`],
          [2, 'Vakum Karpet Koridor Depan Ruang Direksi', 'belum_selesai', null, null, today, `${today} 09:15:00`],
          [3, 'Pembersihan & Pengurasan Wastafel Pantry Lantai 2', 'selesai', SAMPLE_BEFORE_PHOTOS[1], SAMPLE_AFTER_PHOTOS[1], today, `${today} 08:45:00`],
          [3, 'Pengosongan Tempat Sampah Daur Ulang Area Terbuka', 'belum_selesai', null, null, today, `${today} 10:00:00`],
          [4, 'Sterilisasi Gagang Pintu & Kaca Pintu Masuk Lobi Utama', 'belum_selesai', null, null, today, `${today} 08:00:00`],
        ]]
      );
    }
  }

  private async initFileStore(): Promise<void> {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.memoryStore = JSON.parse(raw);
        console.log(`[DB] Loaded ${this.memoryStore.users.length} users and ${this.memoryStore.tasks.length} tasks from ${DB_FILE}`);
        return;
      } catch (e) {
        console.error('[DB] Failed reading existing DB file, re-initializing seed.');
      }
    }

    console.log('[DB] Initializing new relational database store with seed data...');
    const adminPass = await bcrypt.hash('admin123', 10);
    const staffPass = await bcrypt.hash('staff123', 10);

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    this.memoryStore = {
      users: [
        {
          id: 1,
          username: 'supervisor',
          password: adminPass,
          role: 'supervisor',
          nama_lengkap: 'Pak Hendra (Supervisor Operasional)',
        },
        {
          id: 2,
          username: 'budi',
          password: staffPass,
          role: 'staff',
          nama_lengkap: 'Budi Santoso',
        },
        {
          id: 3,
          username: 'siti',
          password: staffPass,
          role: 'staff',
          nama_lengkap: 'Siti Rahmawati',
        },
        {
          id: 4,
          username: 'agus',
          password: staffPass,
          role: 'staff',
          nama_lengkap: 'Agus Pratama',
        },
      ],
      tasks: [
        {
          id: 1,
          user_id: 2,
          nama_pekerjaan: 'Membersihkan & Sanitasi Meja Kerja Ruang HRD Lantai 3',
          status: 'selesai',
          foto_sebelum: SAMPLE_BEFORE_PHOTOS[0],
          foto_sesudah: SAMPLE_AFTER_PHOTOS[0],
          tanggal: today,
          waktu_input: `${today} 08:30:00`,
        },
        {
          id: 2,
          user_id: 2,
          nama_pekerjaan: 'Vakum Karpet Koridor Depan Ruang Direksi',
          status: 'belum_selesai',
          foto_sebelum: null,
          foto_sesudah: null,
          tanggal: today,
          waktu_input: `${today} 09:15:00`,
        },
        {
          id: 3,
          user_id: 3,
          nama_pekerjaan: 'Pembersihan & Pengurasan Wastafel Pantry Lantai 2',
          status: 'selesai',
          foto_sebelum: SAMPLE_BEFORE_PHOTOS[1],
          foto_sesudah: SAMPLE_AFTER_PHOTOS[1],
          tanggal: today,
          waktu_input: `${today} 08:45:00`,
        },
        {
          id: 4,
          user_id: 3,
          nama_pekerjaan: 'Pengosongan Tempat Sampah Daur Ulang Area Terbuka',
          status: 'belum_selesai',
          foto_sebelum: null,
          foto_sesudah: null,
          tanggal: today,
          waktu_input: `${today} 10:00:00`,
        },
        {
          id: 5,
          user_id: 4,
          nama_pekerjaan: 'Sterilisasi Gagang Pintu & Kaca Pintu Masuk Lobi Utama',
          status: 'belum_selesai',
          foto_sebelum: null,
          foto_sesudah: null,
          tanggal: today,
          waktu_input: `${today} 08:00:00`,
        },
        {
          id: 6,
          user_id: 4,
          nama_pekerjaan: 'Mengepel Lantai Koridor Timur & Penggantian Pengharum Ruangan',
          status: 'selesai',
          foto_sebelum: SAMPLE_BEFORE_PHOTOS[0],
          foto_sesudah: SAMPLE_AFTER_PHOTOS[0],
          tanggal: yesterday,
          waktu_input: `${yesterday} 16:30:00`,
        },
      ],
      lastUserId: 4,
      lastTaskId: 6,
    };

    this.saveFileStore();
  }

  private saveFileStore(): void {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.memoryStore, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Failed saving file store:', err);
    }
  }

  // --- User Queries ---

  public async getUserByUsername(username: string): Promise<UserRecord | null> {
    await this.init();
    if (this.useMySQL && this.pool) {
      const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
        'SELECT * FROM users WHERE username = ? LIMIT 1',
        [username]
      );
      if (rows.length === 0) return null;
      return rows[0] as UserRecord;
    }

    const user = this.memoryStore.users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase().trim()
    );
    return user ? { ...user } : null;
  }

  public async getUserById(id: number): Promise<UserRecord | null> {
    await this.init();
    if (this.useMySQL && this.pool) {
      const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
        'SELECT * FROM users WHERE id = ? LIMIT 1',
        [id]
      );
      if (rows.length === 0) return null;
      return rows[0] as UserRecord;
    }

    const user = this.memoryStore.users.find((u) => u.id === id);
    return user ? { ...user } : null;
  }

  public async getAllUsers(): Promise<Omit<UserRecord, 'password'>[]> {
    await this.init();
    if (this.useMySQL && this.pool) {
      const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
        'SELECT id, username, role, nama_lengkap FROM users ORDER BY id ASC'
      );
      return rows as Omit<UserRecord, 'password'>[];
    }

    return this.memoryStore.users.map(({ password, ...rest }) => rest);
  }

  public async createUser(data: {
    username: string;
    passwordPlain: string;
    role: 'supervisor' | 'staff';
    nama_lengkap: string;
  }): Promise<Omit<UserRecord, 'password'>> {
    await this.init();
    const existing = await this.getUserByUsername(data.username);
    if (existing) {
      throw new Error(`Username "${data.username}" sudah digunakan.`);
    }

    const hashedPassword = await bcrypt.hash(data.passwordPlain, 10);

    if (this.useMySQL && this.pool) {
      const [result]: any = await this.pool.query(
        'INSERT INTO users (username, password, role, nama_lengkap) VALUES (?, ?, ?, ?)',
        [data.username.trim(), hashedPassword, data.role, data.nama_lengkap.trim()]
      );
      return {
        id: result.insertId,
        username: data.username.trim(),
        role: data.role,
        nama_lengkap: data.nama_lengkap.trim(),
      };
    }

    this.memoryStore.lastUserId += 1;
    const newUser: UserRecord = {
      id: this.memoryStore.lastUserId,
      username: data.username.trim(),
      password: hashedPassword,
      role: data.role,
      nama_lengkap: data.nama_lengkap.trim(),
    };
    this.memoryStore.users.push(newUser);
    this.saveFileStore();

    return {
      id: newUser.id,
      username: newUser.username,
      role: newUser.role,
      nama_lengkap: newUser.nama_lengkap,
    };
  }

  // --- Task Queries ---

  public async getTasks(filters?: {
    userId?: number;
    tanggal?: string;
    status?: 'belum_selesai' | 'selesai';
    search?: string;
  }): Promise<TaskWithUser[]> {
    await this.init();

    if (this.useMySQL && this.pool) {
      let query = `
        SELECT 
          t.id, t.user_id, t.nama_pekerjaan, t.status, 
          t.foto_sebelum, t.foto_sesudah, t.tanggal, t.waktu_input,
          u.nama_lengkap AS nama_staff, u.username AS username_staff
        FROM tasks t
        JOIN users u ON t.user_id = u.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (filters?.userId) {
        query += ' AND t.user_id = ?';
        params.push(filters.userId);
      }
      if (filters?.tanggal) {
        query += ' AND t.tanggal = ?';
        params.push(filters.tanggal);
      }
      if (filters?.status) {
        query += ' AND t.status = ?';
        params.push(filters.status);
      }
      if (filters?.search) {
        query += ' AND (t.nama_pekerjaan LIKE ? OR u.nama_lengkap LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      query += ' ORDER BY t.id DESC';
      const [rows] = await this.pool.query<mysql.RowDataPacket[]>(query, params);
      return rows as TaskWithUser[];
    }

    // In-memory / file relational query with JOIN
    const userMap = new Map<number, UserRecord>();
    for (const u of this.memoryStore.users) {
      userMap.set(u.id, u);
    }

    let results = this.memoryStore.tasks.map((t) => {
      const u = userMap.get(t.user_id);
      return {
        ...t,
        nama_staff: u ? u.nama_lengkap : 'Staf Tidak Dikenal',
        username_staff: u ? u.username : 'unknown',
      };
    });

    if (filters?.userId) {
      results = results.filter((t) => t.user_id === filters.userId);
    }
    if (filters?.tanggal) {
      results = results.filter((t) => t.tanggal === filters.tanggal);
    }
    if (filters?.status) {
      results = results.filter((t) => t.status === filters.status);
    }
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      results = results.filter(
        (t) =>
          t.nama_pekerjaan.toLowerCase().includes(s) ||
          t.nama_staff.toLowerCase().includes(s)
      );
    }

    return results.sort((a, b) => b.id - a.id);
  }

  public async getTaskById(id: number): Promise<TaskWithUser | null> {
    await this.init();
    if (this.useMySQL && this.pool) {
      const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
        `SELECT 
          t.id, t.user_id, t.nama_pekerjaan, t.status, 
          t.foto_sebelum, t.foto_sesudah, t.tanggal, t.waktu_input,
          u.nama_lengkap AS nama_staff, u.username AS username_staff
        FROM tasks t
        JOIN users u ON t.user_id = u.id
        WHERE t.id = ? LIMIT 1`,
        [id]
      );
      if (rows.length === 0) return null;
      return rows[0] as TaskWithUser;
    }

    const t = this.memoryStore.tasks.find((task) => task.id === id);
    if (!t) return null;
    const u = this.memoryStore.users.find((user) => user.id === t.user_id);
    return {
      ...t,
      nama_staff: u ? u.nama_lengkap : 'Staf Tidak Dikenal',
      username_staff: u ? u.username : 'unknown',
    };
  }

  public async createTask(data: {
    userId: number;
    namaPekerjaan: string;
    tanggal: string;
  }): Promise<TaskWithUser> {
    await this.init();

    // Verify user exists (relational foreign key check)
    const user = await this.getUserById(data.userId);
    if (!user) {
      throw new Error(`User ID ${data.userId} tidak ditemukan.`);
    }

    const now = new Date();
    const waktuInput = `${now.toISOString().split('T')[0]} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;

    if (this.useMySQL && this.pool) {
      const [result]: any = await this.pool.query(
        'INSERT INTO tasks (user_id, nama_pekerjaan, status, foto_sebelum, foto_sesudah, tanggal, waktu_input) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [data.userId, data.namaPekerjaan.trim(), 'belum_selesai', null, null, data.tanggal, waktuInput]
      );
      return {
        id: result.insertId,
        user_id: data.userId,
        nama_pekerjaan: data.namaPekerjaan.trim(),
        status: 'belum_selesai',
        foto_sebelum: null,
        foto_sesudah: null,
        tanggal: data.tanggal,
        waktu_input: waktuInput,
        nama_staff: user.nama_lengkap,
        username_staff: user.username,
      };
    }

    this.memoryStore.lastTaskId += 1;
    const newTask: TaskRecord = {
      id: this.memoryStore.lastTaskId,
      user_id: data.userId,
      nama_pekerjaan: data.namaPekerjaan.trim(),
      status: 'belum_selesai',
      foto_sebelum: null,
      foto_sesudah: null,
      tanggal: data.tanggal,
      waktu_input: waktuInput,
    };

    this.memoryStore.tasks.push(newTask);
    this.saveFileStore();

    return {
      ...newTask,
      nama_staff: user.nama_lengkap,
      username_staff: user.username,
    };
  }

  public async completeTaskWithPhotos(data: {
    taskId: number;
    userId: number;
    userRole: 'supervisor' | 'staff';
    fotoSebelum: string;
    fotoSesudah: string;
  }): Promise<TaskWithUser> {
    await this.init();

    const task = await this.getTaskById(data.taskId);
    if (!task) {
      throw new Error(`Tugas dengan ID ${data.taskId} tidak ditemukan.`);
    }

    // Permission check: only assignee or supervisor can complete
    if (data.userRole !== 'supervisor' && task.user_id !== data.userId) {
      throw new Error('Anda hanya diperbolehkan menyelesaikan tugas milik Anda sendiri.');
    }

    if (!data.fotoSebelum || !data.fotoSesudah) {
      throw new Error('Kedua foto (Foto Sebelum dan Foto Sesudah) wajib diunggah untuk menyelesaikan tugas.');
    }

    if (this.useMySQL && this.pool) {
      await this.pool.query(
        'UPDATE tasks SET status = ?, foto_sebelum = ?, foto_sesudah = ? WHERE id = ?',
        ['selesai', data.fotoSebelum, data.fotoSesudah, data.taskId]
      );
      const updated = await this.getTaskById(data.taskId);
      return updated!;
    }

    const item = this.memoryStore.tasks.find((t) => t.id === data.taskId);
    if (item) {
      item.status = 'selesai';
      item.foto_sebelum = data.fotoSebelum;
      item.foto_sesudah = data.fotoSesudah;
      this.saveFileStore();
    }

    return (await this.getTaskById(data.taskId))!;
  }

  public async deleteTask(taskId: number): Promise<boolean> {
    await this.init();
    if (this.useMySQL && this.pool) {
      const [res]: any = await this.pool.query('DELETE FROM tasks WHERE id = ?', [taskId]);
      return res.affectedRows > 0;
    }

    const idx = this.memoryStore.tasks.findIndex((t) => t.id === taskId);
    if (idx !== -1) {
      this.memoryStore.tasks.splice(idx, 1);
      this.saveFileStore();
      return true;
    }
    return false;
  }
}

export const db = new DatabaseManager();
