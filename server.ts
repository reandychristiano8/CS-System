import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { db, UserRecord, TaskWithUser, SAMPLE_BEFORE_PHOTOS, SAMPLE_AFTER_PHOTOS } from './server/db.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Ensure uploads directory exists
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const unique = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file gambar (JPEG, PNG, WebP) yang diizinkan.'));
    }
  },
});

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(UPLOADS_DIR));

// In-memory isolated session store: token -> user
interface SessionData {
  token: string;
  user: Omit<UserRecord, 'password'>;
  createdAt: number;
}
const sessions = new Map<string, SessionData>();

// SSE Connected Supervisor Clients
interface SSEClient {
  id: string;
  res: Response;
  role: string;
}
let sseClients: SSEClient[] = [];

export function broadcastSSE(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.res.write(payload);
    } catch (err) {
      console.error('[SSE] Failed to send to client', client.id);
    }
  });
}

// Authentication Middleware
async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    res.status(401).json({ error: 'Token sesi tidak ditemukan. Silakan login terlebih dahulu.' });
    return;
  }

  const session = sessions.get(token);
  if (!session) {
    res.status(401).json({ error: 'Sesi login tidak valid atau telah berakhir. Silakan login kembali.' });
    return;
  }

  // Refresh user state from database in case role or name changed
  const freshUser = await db.getUserById(session.user.id);
  if (!freshUser) {
    sessions.delete(token);
    res.status(401).json({ error: 'Akun pengguna tidak ditemukan.' });
    return;
  }

  const { password, ...safeUser } = freshUser;
  (req as any).user = safeUser;
  (req as any).sessionToken = token;
  next();
}

// API Routes

// Health check & DB status
app.get('/api/health', async (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    activeSessions: sessions.size,
    connectedSSE: sseClients.length,
  });
});

// Demo accounts for instant test convenience
app.get('/api/auth/demo-accounts', async (_req, res) => {
  res.json({
    accounts: [
      {
        role: 'supervisor',
        username: 'supervisor',
        passwordHint: 'admin123',
        label: 'Supervisor (Pak Hendra)',
        description: 'Pemantauan real-time, filter, inspeksi zoom foto, & manajemen staff',
      },
      {
        role: 'staff',
        username: 'budi',
        passwordHint: 'staff123',
        label: 'Staff 1 (Budi Santoso)',
        description: 'Input pekerjaan mandiri, ceklist tugas dengan 2 foto bukti',
      },
      {
        role: 'staff',
        username: 'siti',
        passwordHint: 'staff123',
        label: 'Staff 2 (Siti Rahmawati)',
        description: 'Input pekerjaan mandiri & eksekusi ceklist',
      },
      {
        role: 'staff',
        username: 'agus',
        passwordHint: 'staff123',
        label: 'Staff 3 (Agus Pratama)',
        description: 'Input pekerjaan mandiri & eksekusi ceklist',
      },
    ],
  });
});

// Auth: Login with bcrypt check & per-tab token generation
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi.' });
    }

    const user = await db.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Username atau password salah.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Username atau password salah.' });
    }

    // Generate unique cryptographically secure session token
    const token = crypto.randomBytes(32).toString('hex');
    const safeUser: Omit<UserRecord, 'password'> = {
      id: user.id,
      username: user.username,
      role: user.role,
      nama_lengkap: user.nama_lengkap,
    };

    sessions.set(token, {
      token,
      user: safeUser,
      createdAt: Date.now(),
    });

    console.log(`[AUTH] User "${user.username}" (${user.role}) logged in. Session created: ${token.slice(0, 8)}...`);

    return res.json({
      message: 'Login berhasil.',
      token,
      user: safeUser,
    });
  } catch (error: any) {
    console.error('[AUTH] Login error:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan server saat login.' });
  }
});

// Auth: Current logged-in user (isolated per tab sessionStorage)
app.get('/api/auth/me', authenticateToken, (req: Request, res: Response) => {
  res.json({
    user: (req as any).user,
    sessionTokenPrefix: (req as any).sessionToken.slice(0, 8),
  });
});

// Auth: Logout
app.post('/api/auth/logout', authenticateToken, (req: Request, res: Response) => {
  const token = (req as any).sessionToken;
  sessions.delete(token);
  res.json({ message: 'Berhasil logout.' });
});

// Server-Sent Events (SSE) for Real-Time Supervisor Updates
app.get('/api/events', (req: Request, res: Response) => {
  const authHeader = req.query.token as string;
  let clientRole = 'guest';

  if (authHeader && sessions.has(authHeader)) {
    const s = sessions.get(authHeader);
    clientRole = s?.user.role || 'guest';
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const clientId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const newClient: SSEClient = { id: clientId, res, role: clientRole };
  sseClients.push(newClient);

  console.log(`[SSE] Client connected: ${clientId} (${clientRole}). Total active SSE: ${sseClients.length}`);

  // Send initial connected ping
  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, timestamp: Date.now() })}\n\n`);

  // Heartbeat ping every 20 seconds to keep connection alive through proxies
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients = sseClients.filter((c) => c.id !== clientId);
    console.log(`[SSE] Client disconnected: ${clientId}. Total active SSE: ${sseClients.length}`);
  });
});

// Tasks: List with filters
app.get('/api/tasks', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as Omit<UserRecord, 'password'>;
    const { userId, tanggal, status, search } = req.query;

    let targetUserId: number | undefined = undefined;
    if (user.role === 'staff') {
      // Staff only sees their own tasks
      targetUserId = user.id;
    } else if (userId && userId !== 'all') {
      targetUserId = Number(userId);
    }

    const tasks = await db.getTasks({
      userId: targetUserId,
      tanggal: tanggal && tanggal !== 'all' ? String(tanggal) : undefined,
      status: status && status !== 'all' ? (status as any) : undefined,
      search: search ? String(search) : undefined,
    });

    res.json({ tasks });
  } catch (error: any) {
    console.error('[API] Get tasks error:', error);
    res.status(500).json({ error: error.message || 'Gagal mengambil data tugas.' });
  }
});

// Tasks: Create a new task (staff writes self-assigned task)
app.post('/api/tasks', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as Omit<UserRecord, 'password'>;
    const { nama_pekerjaan, tanggal } = req.body;

    if (!nama_pekerjaan || !nama_pekerjaan.trim()) {
      return res.status(400).json({ error: 'Nama pekerjaan wajib diisi.' });
    }

    const targetDate = tanggal || new Date().toISOString().split('T')[0];

    const newTask = await db.createTask({
      userId: user.id,
      namaPekerjaan: nama_pekerjaan.trim(),
      tanggal: targetDate,
    });

    // Notify all real-time supervisor listeners
    broadcastSSE('task_created', {
      task: newTask,
      message: `${user.nama_lengkap} menambahkan tugas baru: "${newTask.nama_pekerjaan}"`,
    });

    return res.status(201).json({
      message: 'Tugas berhasil ditambahkan.',
      task: newTask,
    });
  } catch (error: any) {
    console.error('[API] Create task error:', error);
    return res.status(500).json({ error: error.message || 'Gagal menambahkan tugas.' });
  }
});

// Tasks: Complete task with 2 mandatory photos (upload via multer or base64 data URL)
app.post(
  '/api/tasks/:id/complete',
  authenticateToken,
  upload.fields([
    { name: 'foto_sebelum', maxCount: 1 },
    { name: 'foto_sesudah', maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user as Omit<UserRecord, 'password'>;
      const taskId = Number(req.params.id);

      if (isNaN(taskId)) {
        return res.status(400).json({ error: 'ID tugas tidak valid.' });
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

      // Extract photo paths from multer or body (if base64 fallback / preset photo was provided)
      let fotoSebelum: string | undefined = files?.['foto_sebelum']?.[0]
        ? `/uploads/${files['foto_sebelum'][0].filename}`
        : req.body.foto_sebelum;

      let fotoSesudah: string | undefined = files?.['foto_sesudah']?.[0]
        ? `/uploads/${files['foto_sesudah'][0].filename}`
        : req.body.foto_sesudah;

      // If user clicked quick demo preset
      if (req.body.use_preset === 'true' || req.body.use_preset === true) {
        fotoSebelum = fotoSebelum || SAMPLE_BEFORE_PHOTOS[0];
        fotoSesudah = fotoSesudah || SAMPLE_AFTER_PHOTOS[0];
      }

      // STRICT VALIDATION: BOTH PHOTOS ARE MANDATORY
      if (!fotoSebelum || !fotoSesudah) {
        return res.status(400).json({
          error: 'Verifikasi Gagal: Anda wajib melampirkan KEDUA foto (Foto Sebelum dan Foto Sesudah pengerjaan) sebagai bukti autentik.',
        });
      }

      const updatedTask = await db.completeTaskWithPhotos({
        taskId,
        userId: user.id,
        userRole: user.role,
        fotoSebelum,
        fotoSesudah,
      });

      // Broadcast real-time SSE notification
      broadcastSSE('task_completed', {
        task: updatedTask,
        staffName: user.nama_lengkap,
        message: `✅ ${user.nama_lengkap} telah menyelesaikan tugas: "${updatedTask.nama_pekerjaan}"!`,
        timestamp: new Date().toISOString(),
      });

      return res.json({
        message: 'Tugas berhasil diverifikasi dan diselesaikan dengan bukti 2 foto.',
        task: updatedTask,
      });
    } catch (error: any) {
      console.error('[API] Complete task error:', error);
      return res.status(400).json({ error: error.message || 'Gagal menyelesaikan tugas.' });
    }
  }
);

// Tasks: Delete task
app.delete('/api/tasks/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as Omit<UserRecord, 'password'>;
    const taskId = Number(req.params.id);

    const task = await db.getTaskById(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Tugas tidak ditemukan.' });
    }

    if (user.role !== 'supervisor' && task.user_id !== user.id) {
      return res.status(403).json({ error: 'Anda tidak memiliki hak untuk menghapus tugas ini.' });
    }

    await db.deleteTask(taskId);

    broadcastSSE('task_deleted', {
      taskId,
      message: `Tugas "${task.nama_pekerjaan}" dihapus oleh ${user.nama_lengkap}.`,
    });

    return res.json({ message: 'Tugas berhasil dihapus.' });
  } catch (error: any) {
    console.error('[API] Delete task error:', error);
    return res.status(500).json({ error: error.message || 'Gagal menghapus tugas.' });
  }
});

// Users/Staff: List all users
app.get('/api/users', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const users = await db.getAllUsers();
    res.json({ users });
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengambil data pengguna.' });
  }
});

// Users/Staff: Add new staff account (Supervisor only)
app.post('/api/users', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as Omit<UserRecord, 'password'>;
    if (user.role !== 'supervisor') {
      return res.status(403).json({ error: 'Hanya Supervisor yang dapat mendaftarkan akun baru.' });
    }

    const { username, password, role, nama_lengkap } = req.body;

    if (!username || !password || !nama_lengkap) {
      return res.status(400).json({ error: 'Username, password, dan nama lengkap wajib diisi.' });
    }

    if (password.length < 5) {
      return res.status(400).json({ error: 'Password minimal 5 karakter.' });
    }

    const newUser = await db.createUser({
      username,
      passwordPlain: password,
      role: role === 'supervisor' ? 'supervisor' : 'staff',
      nama_lengkap,
    });

    broadcastSSE('staff_added', {
      user: newUser,
      message: `Akun baru "${newUser.nama_lengkap}" (${newUser.role}) berhasil ditambahkan.`,
    });

    return res.status(201).json({
      message: 'Akun berhasil dibuat.',
      user: newUser,
    });
  } catch (error: any) {
    console.error('[API] Create user error:', error);
    return res.status(400).json({ error: error.message || 'Gagal membuat akun.' });
  }
});

// Stats: Aggregated metrics
app.get('/api/stats', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const allTasks = await db.getTasks();
    const todayTasks = allTasks.filter((t) => t.tanggal === today);
    const users = await db.getAllUsers();
    const staffOnly = users.filter((u) => u.role === 'staff');

    const total = todayTasks.length;
    const selesai = todayTasks.filter((t) => t.status === 'selesai').length;
    const belum = total - selesai;
    const progressPercent = total > 0 ? Math.round((selesai / total) * 100) : 0;

    res.json({
      today,
      todayStats: {
        total,
        selesai,
        belum,
        progressPercent,
      },
      allTimeStats: {
        total: allTasks.length,
        selesai: allTasks.filter((t) => t.status === 'selesai').length,
        belum: allTasks.filter((t) => t.status === 'belum_selesai').length,
      },
      totalStaff: staffOnly.length,
      totalUsers: users.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal mengambil data statistik.' });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  await db.init();

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] CleanDesk is running actively on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[SERVER] Fatal startup error:', err);
});
