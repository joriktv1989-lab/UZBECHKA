import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isElectron = process.env.IS_ELECTRON === 'true';
const dbPath = isElectron 
  ? path.join(process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share"), 'uzbechka.db')
  : "uzbechka.db";

const db = new Database(dbPath);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

try {
  // Initialize database
  console.log("Initializing database at:", dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'client',
      carType TEXT,
      carPhoto TEXT,
      photo TEXT,
      lat REAL,
      lng REAL,
      lastSeen DATETIME
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      commissionPercent REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      discountPrice REAL,
      categoryId INTEGER,
      image TEXT,
      videoUrl TEXT,
      description TEXT,
      stock INTEGER DEFAULT 0,
      FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS banners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      imageUrl TEXT NOT NULL,
      videoUrl TEXT,
      link TEXT,
      isActive INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER NOT NULL,
      agentId INTEGER,
      courierId INTEGER,
      totalPrice REAL NOT NULL,
      paymentType TEXT NOT NULL,
      paymentStatus TEXT NOT NULL DEFAULT 'pending',
      collectionStatus TEXT NOT NULL DEFAULT 'pending',
      orderStatus TEXT NOT NULL DEFAULT 'new',
      location TEXT,
      latitude REAL,
      longitude REAL,
      deliveryPhoto TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clientId) REFERENCES users(id),
      FOREIGN KEY (agentId) REFERENCES users(id),
      FOREIGN KEY (courierId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orderId INTEGER NOT NULL,
      productId INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      commissionAmount REAL DEFAULT 0,
      FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS telegram_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT,
      status TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER NOT NULL,
      orderId INTEGER,
      amount REAL NOT NULL,
      dueDate DATETIME,
      status TEXT NOT NULL DEFAULT 'pending',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clientId) REFERENCES users(id),
      FOREIGN KEY (orderId) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS location_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS salaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL, -- 'fixed' or 'commission'
      period TEXT NOT NULL, -- '2024-03'
      status TEXT NOT NULL DEFAULT 'pending',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      date DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS income (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      date DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS ai_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent TEXT NOT NULL, -- 'jarvis' or 'uzbechka'
      type TEXT NOT NULL, -- 'performance', 'security', 'operations', 'optimization'
      content TEXT NOT NULL,
      status TEXT DEFAULT 'unread',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS system_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL, -- 'info', 'warn', 'error'
      module TEXT NOT NULL,
      message TEXT NOT NULL,
      details TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS employee_kpi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      role TEXT NOT NULL,
      score REAL DEFAULT 0,
      level TEXT DEFAULT 'bronze', -- 'bronze', 'silver', 'gold', 'platinum'
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS profit_forecast (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      expectedOrders INTEGER,
      expectedRevenue REAL,
      confidence REAL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS system_health_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service TEXT NOT NULL,
      issue TEXT,
      severity TEXT, -- 'low', 'medium', 'high', 'critical'
      autoFixApplied INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS security_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      type TEXT NOT NULL,
      riskScore REAL,
      details TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS agent_commissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agentId INTEGER NOT NULL UNIQUE,
      percent REAL DEFAULT 10,
      fixedSalary REAL DEFAULT 0,
      workingDays INTEGER DEFAULT 26,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agentId) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Ensure unique index for agent_commissions if not already present
  try {
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_commissions_agentId ON agent_commissions(agentId)");
  } catch (e) {
    console.warn("Could not create unique index on agent_commissions (might already exist or have duplicates):", e);
  }

  // Seed default settings
  const settingsCount = db.prepare("SELECT COUNT(*) as count FROM settings").get() as { count: number };
  if (settingsCount.count === 0) {
    const defaultSettings = [
      { key: 'app_name', value: 'Uzbechka' },
      { key: 'delivery_fee', value: '10000' },
      { key: 'min_order', value: '30000' },
      { key: 'contact_phone', value: '+998936584455' },
      { key: 'address', value: 'Bukhara, Uzbekistan' },
      { key: 'voice_enabled', value: 'true' },
      { key: 'click_card', value: '8600 0000 0000 0000' },
      { key: 'payme_card', value: '9860 0000 0000 0000' },
      { key: 'jarvis_name', value: 'Jarvis' },
      { key: 'warehouse_lat', value: '39.7747' },
      { key: 'warehouse_lng', value: '64.4286' }
    ];
    const insertSetting = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
    defaultSettings.forEach(s => insertSetting.run(s.key, s.value));
  }

  // Seed default banners
  const bannerCount = db.prepare("SELECT COUNT(*) as count FROM banners").get() as { count: number };
  if (bannerCount.count === 0) {
    const defaultBanners = [
      { 
        title: 'An\'anaviy O\'zbek Palovi', 
        imageUrl: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?q=80&w=1000&auto=format&fit=crop', 
        link: 'category/1' 
      },
      { 
        title: 'Mazzali Tandir Kabob', 
        imageUrl: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?q=80&w=1000&auto=format&fit=crop', 
        link: 'category/2' 
      },
      { 
        title: 'Issiq Non va Somsa', 
        imageUrl: 'https://images.unsplash.com/photo-1514326640560-7d063ef2aed5?q=80&w=1000&auto=format&fit=crop', 
        link: 'all' 
      }
    ];
    const insertBanner = db.prepare("INSERT INTO banners (title, imageUrl, link) VALUES (?, ?, ?)");
    defaultBanners.forEach(b => insertBanner.run(b.title, b.imageUrl, b.link));
  }

  // Migrations for existing tables
  try {
    db.prepare("ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT 0").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE products ADD COLUMN discountPrice REAL").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE products ADD COLUMN videoUrl TEXT").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE orders ADD COLUMN latitude REAL").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE orders ADD COLUMN longitude REAL").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE orders ADD COLUMN collectionStatus TEXT DEFAULT 'pending'").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE orders ADD COLUMN deliveryPhoto TEXT").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE categories ADD COLUMN commissionPercent REAL DEFAULT 0").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE order_items ADD COLUMN commissionAmount REAL DEFAULT 0").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE users ADD COLUMN carType TEXT").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE users ADD COLUMN carPhoto TEXT").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE users ADD COLUMN photo TEXT").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE users ADD COLUMN lat REAL").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE users ADD COLUMN lng REAL").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE users ADD COLUMN lastSeen DATETIME").run();
  } catch (e) {}

  // Seed initial admin if not exists
  const adminExists = db.prepare("SELECT * FROM users WHERE role = 'admin'").get();
  if (!adminExists) {
    db.prepare("INSERT INTO users (name, phone, password, role) VALUES (?, ?, ?, ?)").run(
      "Admin",
      "+998936584455",
      "1210999",
      "admin"
    );
  }

  // Seed some categories and products if empty
  const catCount = db.prepare("SELECT COUNT(*) as count FROM categories").get() as { count: number };
  if (catCount.count === 0) {
    // No automatic seeding as per user request for manual control
    console.log("Categories table is empty. Waiting for manual entry.");
  }
  console.log("Database initialized successfully");
  
  // Test write
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run('last_start', new Date().toISOString());
  console.log("Database write test successful");
} catch (error) {
  console.error("Database initialization failed CRITICAL:", error);
}

async function startServer() {
  const app = express();
  
  // CORS must be first
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Request logging
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // Health check
  app.get("/api/health", (req, res) => {
    console.log("Health check requested");
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Test route
  app.get("/api/test", (req, res) => {
    res.json({ message: "API is working", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  const PORT = 3000;

  // Socket.io logic
  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("update_location", (data) => {
      const { userId, lat, lng, role } = data;
      // Update DB
      db.prepare("UPDATE users SET lat = ?, lng = ?, lastSeen = CURRENT_TIMESTAMP WHERE id = ?").run(lat, lng, userId);
      db.prepare("INSERT INTO location_history (userId, lat, lng) VALUES (?, ?, ?)").run(userId, lat, lng);
      
      // Broadcast to all (especially admins)
      io.emit("location_updated", { userId, lat, lng, role });
    });

    socket.on("new_order", (order) => {
      io.emit("order_created", order);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });

    // Serve firm photo
  app.get("/api/image/firm_photo", (req, res) => {
    // Using a high-quality thematic image that matches the brand style (Uzbek woman/culture)
    res.redirect("https://images.unsplash.com/photo-1514326640560-7d063ef2aed5?q=80&w=1000&auto=format&fit=crop");
  });

  // Auth Endpoints
  app.post("/api/auth/register", (req, res) => {
    const { name, phone, password, role, carType, carPhoto, photo } = req.body;
    try {
      const result = db.prepare("INSERT INTO users (name, phone, password, role, carType, carPhoto, photo) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
        name, phone, password, role || 'client', carType || null, carPhoto || null, photo || null
      );
      const user = db.prepare("SELECT id, name, phone, role, carType, carPhoto, photo FROM users WHERE id = ?").get(result.lastInsertRowid);
      res.json(user);
    } catch (e) {
      res.status(400).json({ error: "Phone number already registered" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { phone, password } = req.body;
    const user = db.prepare("SELECT id, name, phone, role, carType, carPhoto, photo, lat, lng, lastSeen FROM users WHERE phone = ? AND password = ?").get(phone, password);
    if (user) {
      res.json(user);
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // Users Management
  app.get("/api/users", (req, res) => {
    const users = db.prepare("SELECT id, name, phone, role, carType, carPhoto, photo, lat, lng, lastSeen FROM users").all();
    res.json(users);
  });

  app.patch("/api/users/location", (req, res) => {
    const { userId, lat, lng } = req.body;
    db.prepare("UPDATE users SET lat = ?, lng = ?, lastSeen = CURRENT_TIMESTAMP WHERE id = ?").run(lat, lng, userId);
    db.prepare("INSERT INTO location_history (userId, lat, lng) VALUES (?, ?, ?)").run(userId, lat, lng);
    res.json({ success: true });
  });

  app.get("/api/users/:id/history", (req, res) => {
    const history = db.prepare("SELECT lat, lng, timestamp FROM location_history WHERE userId = ? ORDER BY timestamp DESC LIMIT 100").all(req.params.id);
    res.json(history);
  });

  app.delete("/api/users/:id", (req, res) => {
    try {
      // First delete related records to avoid FK constraints
      db.prepare("DELETE FROM debts WHERE clientId = ?").run(req.params.id);
      db.prepare("DELETE FROM salaries WHERE userId = ?").run(req.params.id);
      db.prepare("DELETE FROM location_history WHERE userId = ?").run(req.params.id);
      db.prepare("DELETE FROM employee_kpi WHERE userId = ?").run(req.params.id);
      db.prepare("DELETE FROM agent_commissions WHERE agentId = ?").run(req.params.id);
      
      const orders = db.prepare("SELECT id FROM orders WHERE clientId = ? OR agentId = ? OR courierId = ?").all(req.params.id, req.params.id, req.params.id);
      for (const order of orders as any) {
        db.prepare("DELETE FROM order_items WHERE orderId = ?").run(order.id);
        db.prepare("DELETE FROM orders WHERE id = ?").run(order.id);
      }
      
      db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      console.error("Delete user error:", e);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  app.put("/api/users/:id", (req, res) => {
    const { name, phone, password, role, carType, carPhoto, photo, commissionPercent, fixedSalary } = req.body;
    db.prepare("UPDATE users SET name = ?, phone = ?, password = ?, role = ?, carType = ?, carPhoto = ?, photo = ? WHERE id = ?").run(
      name, phone, password, role, carType || null, carPhoto || null, photo || null, req.params.id
    );

    if (commissionPercent !== undefined || fixedSalary !== undefined) {
      db.prepare(`
        INSERT INTO agent_commissions (agentId, percent, fixedSalary)
        VALUES (?, ?, ?)
        ON CONFLICT(agentId) DO UPDATE SET
          percent = COALESCE(excluded.percent, percent),
          fixedSalary = COALESCE(excluded.fixedSalary, fixedSalary),
          updatedAt = CURRENT_TIMESTAMP
      `).run(req.params.id, commissionPercent || 10, fixedSalary || 0);
    }

    res.json({ success: true });
  });

  // Products & Categories
  app.get("/api/categories", (req, res) => {
    res.json(db.prepare("SELECT * FROM categories").all());
  });

  app.post("/api/categories", (req, res) => {
    const result = db.prepare("INSERT INTO categories (name) VALUES (?)").run(req.body.name);
    res.json({ id: result.lastInsertRowid, name: req.body.name });
  });

  app.delete("/api/categories/:id", (req, res) => {
    db.prepare("DELETE FROM categories WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Telegram Integration
  const sendTelegramMessage = async (message: string) => {
    try {
      const botToken = db.prepare("SELECT value FROM settings WHERE key = 'telegram_bot_token'").get() as any;
      const chatId = db.prepare("SELECT value FROM settings WHERE key = 'telegram_channel_id'").get() as any;

      if (botToken?.value && chatId?.value) {
        const url = `https://api.telegram.org/bot${botToken.value}/sendMessage`;
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId.value,
            text: message,
            parse_mode: 'HTML'
          })
        });
        db.prepare("INSERT INTO telegram_logs (message, status) VALUES (?, ?)").run(message, 'sent');
      }
    } catch (error) {
      console.error("Telegram Error:", error);
      db.prepare("INSERT INTO telegram_logs (message, status) VALUES (?, ?)").run(message, 'failed');
    }
  };
  app.get("/api/banners", (req, res) => {
    res.json(db.prepare("SELECT * FROM banners WHERE isActive = 1").all());
  });

  app.post("/api/banners", (req, res) => {
    const { title, imageUrl, videoUrl, link } = req.body;
    const result = db.prepare("INSERT INTO banners (title, imageUrl, videoUrl, link) VALUES (?, ?, ?, ?)").run(
      title, imageUrl, videoUrl, link
    );
    res.json({ id: result.lastInsertRowid, ...req.body });
  });

  app.delete("/api/banners/:id", (req, res) => {
    db.prepare("DELETE FROM banners WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/products", (req, res) => {
    console.log("GET /api/products hit");
    res.json(db.prepare(`
      SELECT p.*, c.name as categoryName 
      FROM products p 
      LEFT JOIN categories c ON p.categoryId = c.id
    `).all());
  });

  app.post("/api/products", (req, res) => {
    const { name, price, discountPrice, categoryId, description, image, videoUrl, stock } = req.body;
    const result = db.prepare("INSERT INTO products (name, price, discountPrice, categoryId, description, image, videoUrl, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
      name, price, discountPrice, categoryId, description, image, videoUrl, stock || 0
    );
    res.json({ id: result.lastInsertRowid, ...req.body });
  });

  app.put("/api/products/:id", (req, res) => {
    const { name, price, discountPrice, categoryId, description, image, videoUrl, stock } = req.body;
    db.prepare("UPDATE products SET name = ?, price = ?, discountPrice = ?, categoryId = ?, description = ?, image = ?, videoUrl = ?, stock = ? WHERE id = ?").run(
      name, price, discountPrice, categoryId, description, image, videoUrl, stock || 0, req.params.id
    );
    res.json({ success: true });
  });

  app.delete("/api/products/:id", (req, res) => {
    db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Orders
  app.get("/api/orders", (req, res) => {
    const orders = db.prepare(`
      SELECT o.*, u.name as clientName, u.phone as clientPhone, a.name as agentName, cr.name as courierName, cr.carType as courierCarType, cr.carPhoto as courierCarPhoto
      FROM orders o
      JOIN users u ON o.clientId = u.id
      LEFT JOIN users a ON o.agentId = a.id
      LEFT JOIN users cr ON o.courierId = cr.id
      ORDER BY o.createdAt DESC
    `).all();
    
    const ordersWithItems = orders.map((o: any) => {
      const items = db.prepare(`
        SELECT oi.*, p.name as productName
        FROM order_items oi
        JOIN products p ON oi.productId = p.id
        WHERE oi.orderId = ?
      `).all(o.id);
      return { ...o, items };
    });
    
    res.json(ordersWithItems);
  });

  app.post("/api/orders", (req, res) => {
    const { clientId, agentId, items, totalPrice, paymentType, location, latitude, longitude, orderStatus, paymentStatus, collectionStatus } = req.body;
    const info = db.prepare("INSERT INTO orders (clientId, agentId, totalPrice, paymentType, location, latitude, longitude, orderStatus, paymentStatus, collectionStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
      clientId, agentId || null, totalPrice, paymentType, location, latitude || null, longitude || null, orderStatus || 'new', paymentStatus || 'pending', collectionStatus || 'pending'
    );
    const orderId = info.lastInsertRowid;
    
    const insertItem = db.prepare("INSERT INTO order_items (orderId, productId, quantity, price) VALUES (?, ?, ?, ?)");
    for (const item of items) {
      const productId = item.id || item.productId;
      if (!productId) continue;
      insertItem.run(orderId, productId, item.quantity, item.price);
    }

    // Telegram Notification
    const client = db.prepare("SELECT name FROM users WHERE id = ?").get(clientId) as any;
    sendTelegramMessage(`🚀 <b>Новый заказ #${orderId}</b>\n👤 Клиент: ${client?.name}\n💰 Сумма: ${totalPrice.toLocaleString()} UZS\n📍 Локация: ${location}`);
    
    res.json({ id: orderId });
  });

  app.patch("/api/orders/:id", (req, res) => {
    const allowedFields = ['clientId', 'agentId', 'courierId', 'totalPrice', 'paymentType', 'paymentStatus', 'collectionStatus', 'orderStatus', 'location', 'latitude', 'longitude'];
    const updates = Object.entries(req.body).filter(([key]) => allowedFields.includes(key));
    
    if (updates.length === 0) {
      return res.json({ success: true, message: "No valid fields to update" });
    }

    const fields = updates.map(([key]) => `${key} = ?`).join(", ");
    const values = updates.map(([, value]) => value);
    
    db.prepare(`UPDATE orders SET ${fields} WHERE id = ?`).run(...values, req.params.id);

    // Telegram Notification for status changes
    if (req.body.orderStatus) {
      sendTelegramMessage(`📦 <b>Заказ #${req.params.id}</b>\n🔄 Статус изменен на: <b>${req.body.orderStatus}</b>`);
    }

    res.json({ success: true });
  });

  app.delete("/api/orders/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM order_items WHERE orderId = ?").run(req.params.id);
      db.prepare("DELETE FROM orders WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to delete order" });
    }
  });

  // Stats
  app.get("/api/stats", (req, res) => {
    const totalRevenue = db.prepare("SELECT SUM(totalPrice) as total FROM orders WHERE paymentStatus = 'paid'").get() as any;
    const totalOrders = db.prepare("SELECT COUNT(*) as count FROM orders").get() as any;
    const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
    const salesByCategory = db.prepare(`
      SELECT c.name, SUM(oi.quantity * oi.price) as value
      FROM order_items oi
      JOIN products p ON oi.productId = p.id
      JOIN categories c ON p.categoryId = c.id
      JOIN orders o ON oi.orderId = o.id
      WHERE o.paymentStatus = 'paid'
      GROUP BY c.id
    `).all();

    res.json({
      revenue: totalRevenue.total || 0,
      orders: totalOrders.count || 0,
      users: totalUsers.count || 0,
      salesByCategory
    });
  });

  // Settings Endpoints
  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    const settingsObj = (settings as any[]).reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(settingsObj);
  });

  app.post("/api/settings", (req, res) => {
    const updates = req.body;
    const upsert = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
    for (const [key, value] of Object.entries(updates)) {
      upsert.run(key, String(value));
    }
    res.json({ success: true });
  });

  // Debts Endpoints
  app.get("/api/debts", (req, res) => {
    const debts = db.prepare(`
      SELECT d.*, u.name as clientName, u.phone as clientPhone, u.photo as clientPhoto,
             a.name as agentName, cr.name as courierName
      FROM debts d
      JOIN users u ON d.clientId = u.id
      LEFT JOIN orders o ON d.orderId = o.id
      LEFT JOIN users a ON o.agentId = a.id
      LEFT JOIN users cr ON o.courierId = cr.id
      ORDER BY d.createdAt DESC
    `).all();
    res.json(debts);
  });

  app.post("/api/debts", (req, res) => {
    const { clientId, orderId, amount, dueDate } = req.body;
    const result = db.prepare("INSERT INTO debts (clientId, orderId, amount, dueDate) VALUES (?, ?, ?, ?)").run(
      clientId, orderId || null, amount, dueDate || null
    );
    res.json({ id: result.lastInsertRowid, ...req.body, status: 'pending' });
  });

  app.patch("/api/debts/:id", (req, res) => {
    const { status, amount } = req.body;
    if (status) {
      db.prepare("UPDATE debts SET status = ? WHERE id = ?").run(status, req.params.id);
    }
    if (amount !== undefined) {
      db.prepare("UPDATE debts SET amount = ? WHERE id = ?").run(amount, req.params.id);
    }
    res.json({ success: true });
  });

  // AI Jarvis Endpoint (System Architect)
  app.post("/api/ai/jarvis", async (req, res) => {
    const { prompt, context } = req.body;
    try {
      const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const model = "gemini-3.1-pro-preview";
      
      const systemInstruction = `You are Jarvis, the System Architect AI for "UZBECHKA AI SUPER DELIVERY". 
      Your role is to monitor system health, analyze logs, detect bugs, and suggest architecture improvements.
      You communicate with "Uzbechka AI" (Operations AI) to optimize the business.
      Current system context: ${JSON.stringify(context || {})}.
      Provide technical insights, performance optimizations, and security recommendations.`;

      const response = await genAI.models.generateContent({
        model,
        contents: prompt,
        config: { systemInstruction }
      });

      // Log AI action
      db.prepare("INSERT INTO system_logs (level, module, message) VALUES (?, ?, ?)").run('info', 'AI_JARVIS', `Jarvis processed prompt: ${prompt.substring(0, 50)}...`);

      res.json({ text: response.text });
    } catch (error) {
      console.error("Jarvis AI Error:", error);
      res.status(500).json({ error: "Jarvis is currently offline" });
    }
  });

  // AI Uzbechka Endpoint (Operations AI)
  app.post("/api/ai/uzbechka", async (req, res) => {
    const { prompt, context } = req.body;
    try {
      const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const model = "gemini-3.1-pro-preview";
      
      const systemInstruction = `You are Uzbechka AI, the Operations and Delivery AI for "UZBECHKA AI SUPER DELIVERY". 
      Your role is to optimize delivery routes, predict demand, assist couriers, and handle customer support.
      You speak Uzbek, Russian, and English.
      You communicate with "Jarvis AI" (System AI) to ensure the platform runs smoothly.
      Current operational context: ${JSON.stringify(context || {})}.
      Focus on delivery efficiency, courier satisfaction, and customer experience.`;

      const response = await genAI.models.generateContent({
        model,
        contents: prompt,
        config: { systemInstruction }
      });

      // Log AI action
      db.prepare("INSERT INTO system_logs (level, module, message) VALUES (?, ?, ?)").run('info', 'AI_UZBECHKA', `Uzbechka processed prompt: ${prompt.substring(0, 50)}...`);

      res.json({ text: response.text });
    } catch (error) {
      console.error("Uzbechka AI Error:", error);
      res.status(500).json({ error: "Uzbechka is currently offline" });
    }
  });

  // AI-to-AI Communication Simulation
  app.post("/api/ai/sync", async (req, res) => {
    try {
      const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const model = "gemini-3-flash-preview";

      // Jarvis analyzes system health
      const jarvisAnalysis = await genAI.models.generateContent({
        model,
        contents: "Analyze the current system state and provide a technical report for Uzbechka AI.",
        config: { systemInstruction: "You are Jarvis AI. Analyze technical logs and performance." }
      });

      // Uzbechka responds with operational context
      const uzbechkaResponse = await genAI.models.generateContent({
        model,
        contents: `Jarvis says: ${jarvisAnalysis.text}. How does this affect our delivery operations?`,
        config: { systemInstruction: "You are Uzbechka AI. Analyze operational impact of technical issues." }
      });

      // Save reports
      db.prepare("INSERT INTO ai_reports (agent, type, content) VALUES (?, ?, ?)").run('jarvis', 'performance', jarvisAnalysis.text);
      db.prepare("INSERT INTO ai_reports (agent, type, content) VALUES (?, ?, ?)").run('uzbechka', 'operations', uzbechkaResponse.text);

      res.json({ 
        jarvis: jarvisAnalysis.text,
        uzbechka: uzbechkaResponse.text
      });
    } catch (error) {
      console.error("AI Sync Error:", error);
      res.status(500).json({ error: "AI Communication failed" });
    }
  });

  app.get("/api/ai/reports", (req, res) => {
    const reports = db.prepare("SELECT * FROM ai_reports ORDER BY createdAt DESC LIMIT 50").all();
    res.json(reports);
  });

  app.get("/api/system/logs", (req, res) => {
    const logs = db.prepare("SELECT * FROM system_logs ORDER BY createdAt DESC LIMIT 100").all();
    res.json(logs);
  });

  // Financial Reporting
  app.get("/api/finance/report", (req, res) => {
    const { startDate, endDate } = req.query;
    const dateFilter = startDate && endDate ? `WHERE date BETWEEN '${startDate}' AND '${endDate}'` : "";
    
    const income = db.prepare(`SELECT SUM(amount) as total FROM income ${dateFilter}`).get() as any;
    const expenses = db.prepare(`SELECT SUM(amount) as total FROM expenses ${dateFilter}`).get() as any;
    const orderIncome = db.prepare(`SELECT SUM(totalPrice) as total FROM orders WHERE paymentStatus = 'paid' ${startDate && endDate ? `AND createdAt BETWEEN '${startDate}' AND '${endDate}'` : ""}`).get() as any;
    
    const categoryExpenses = db.prepare(`SELECT category, SUM(amount) as total FROM expenses ${dateFilter} GROUP BY category`).all();
    const categoryIncome = db.prepare(`SELECT category, SUM(amount) as total FROM income ${dateFilter} GROUP BY category`).all();

    res.json({
      totalIncome: (income.total || 0) + (orderIncome.total || 0),
      totalExpenses: expenses.total || 0,
      profit: ((income.total || 0) + (orderIncome.total || 0)) - (expenses.total || 0),
      categoryExpenses,
      categoryIncome
    });
  });

  app.post("/api/finance/expenses", (req, res) => {
    const { title, amount, category } = req.body;
    db.prepare("INSERT INTO expenses (title, amount, category) VALUES (?, ?, ?)").run(title, amount, category);
    res.json({ success: true });
  });

  app.post("/api/finance/income", (req, res) => {
    const { title, amount, category } = req.body;
    db.prepare("INSERT INTO income (title, amount, category) VALUES (?, ?, ?)").run(title, amount, category);
    res.json({ success: true });
  });

  // Salaries
  app.get("/api/salaries", (req, res) => {
    const salaries = db.prepare(`
      SELECT s.*, u.name as userName, u.role as userRole
      FROM salaries s
      JOIN users u ON s.userId = u.id
    `).all();
    res.json(salaries);
  });

  app.post("/api/salaries", (req, res) => {
    const { userId, amount, type, period } = req.body;
    db.prepare("INSERT INTO salaries (userId, amount, type, period) VALUES (?, ?, ?, ?)").run(userId, amount, type, period);
    res.json({ success: true });
  });

  app.get("/api/admin/kpi", (req, res) => {
    const kpis = db.prepare(`
      SELECT k.*, u.name as userName, u.photo as userPhoto
      FROM employee_kpi k
      JOIN users u ON k.userId = u.id
      ORDER BY k.score DESC
    `).all();
    res.json(kpis);
  });

  app.get("/api/admin/forecast", (req, res) => {
    const forecast = db.prepare("SELECT * FROM profit_forecast ORDER BY date ASC").all();
    res.json(forecast);
  });

  app.get("/api/admin/health", (req, res) => {
    const health = db.prepare("SELECT * FROM system_health_logs ORDER BY createdAt DESC LIMIT 50").all();
    res.json(health);
  });

  app.get("/api/admin/security", (req, res) => {
    const alerts = db.prepare(`
      SELECT s.*, u.name as userName
      FROM security_alerts s
      LEFT JOIN users u ON s.userId = u.id
      ORDER BY s.createdAt DESC LIMIT 50
    `).all();
    res.json(alerts);
  });

  app.get("/api/admin/commissions", (req, res) => {
    const commissions = db.prepare("SELECT * FROM agent_commissions").all();
    res.json(commissions);
  });

  app.post("/api/admin/commissions", (req, res) => {
    const { agentId, percent, fixedSalary, workingDays } = req.body;
    db.prepare(`
      INSERT INTO agent_commissions (agentId, percent, fixedSalary, workingDays)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(agentId) DO UPDATE SET
        percent = excluded.percent,
        fixedSalary = excluded.fixedSalary,
        workingDays = excluded.workingDays,
        updatedAt = CURRENT_TIMESTAMP
    `).run(agentId, percent, fixedSalary, workingDays);
    res.json({ success: true });
  });

  app.get("/api/admin/salaries/report", (req, res) => {
    const agents = db.prepare("SELECT id, name, role FROM users WHERE role IN ('agent', 'courier')").all();
    const report = agents.map((user: any) => {
      let totalSales = 0;
      if (user.role === 'agent') {
        const sales = db.prepare("SELECT SUM(totalPrice) as total FROM orders WHERE agentId = ? AND paymentStatus = 'paid'").get(user.id) as any;
        totalSales = sales.total || 0;
      } else if (user.role === 'courier') {
        const deliveries = db.prepare("SELECT SUM(totalPrice) as total FROM orders WHERE courierId = ? AND orderStatus = 'delivered'").get(user.id) as any;
        totalSales = deliveries.total || 0;
      }
      
      const commission = db.prepare("SELECT * FROM agent_commissions WHERE agentId = ?").get(user.id) as any;
      
      const percent = commission?.percent || 10;
      const fixed = commission?.fixedSalary || 0;
      const salary = fixed + (totalSales * percent / 100);
      
      return {
        userId: user.id,
        userName: user.name,
        role: user.role,
        totalSales,
        percent,
        fixedSalary: fixed,
        salary
      };
    });
    res.json(report);
  });

  app.post("/api/admin/ai/director", async (req, res) => {
    try {
      const stats = db.prepare("SELECT SUM(totalPrice) as revenue, COUNT(*) as orders FROM orders WHERE paymentStatus = 'paid'").get() as any;
      const topProducts = db.prepare(`
        SELECT p.name, SUM(oi.quantity) as count
        FROM order_items oi
        JOIN products p ON oi.productId = p.id
        GROUP BY p.id ORDER BY count DESC LIMIT 5
      `).all();

      const context = {
        revenue: stats.revenue,
        orders: stats.orders,
        topProducts
      };

      const prompt = `You are the AI Business Director for "UZBECHKA AI SUPER DELIVERY". 
      Analyze the business data and provide 3 strategic recommendations for growth.
      Data: ${JSON.stringify(context)}.
      Format: JSON array of objects { title, recommendation, risk_level }.
      risk_level must be one of: low, medium, high.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      res.json(JSON.parse(response.text || "[]"));
    } catch (error) {
      console.error("AI Director Error:", error);
      res.status(500).json({ error: "AI Director is busy" });
    }
  });

  // API 404 handler - catch unmatched /api routes before they hit Vite/static
  app.all("/api/*", (req, res) => {
    console.warn(`API Route Not Found: ${req.method} ${req.url}`);
    res.status(404).json({ 
      error: "API route not found", 
      method: req.method,
      path: req.url,
      availableRoutes: [
        "/api/health", "/api/test", "/api/products", "/api/categories", 
        "/api/orders", "/api/stats", "/api/users", "/api/banners", 
        "/api/settings", "/api/debts"
      ]
    });
  });

  // Vite middleware for development
  const isProd = process.env.NODE_ENV === "production";
  
  if (!isProd) {
    console.log("Starting in DEVELOPMENT mode with Vite middleware");
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false // Disable HMR as per platform guidelines
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in PRODUCTION mode");
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  // Global error handler - MUST be last
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled Error:", err);
    res.status(500).json({ error: "Internal Server Error", message: err.message });
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
