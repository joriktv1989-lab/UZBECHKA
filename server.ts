import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isElectron = process.env.IS_ELECTRON === 'true';
const dbPath = isElectron 
  ? path.join(process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share"), 'uzbechka.db')
  : "uzbechka.db";

const db = new Database(dbPath);

try {
  // Initialize database
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
      name TEXT NOT NULL
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
      FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
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
  `);

  // Seed default settings
  const settingsCount = db.prepare("SELECT COUNT(*) as count FROM settings").get() as { count: number };
  if (settingsCount.count === 0) {
    const defaultSettings = [
      { key: 'app_name', value: 'Uzbechka' },
      { key: 'delivery_fee', value: '10000' },
      { key: 'min_order', value: '30000' },
      { key: 'contact_phone', value: '+998936584455' },
      { key: 'address', value: 'Tashkent, Uzbekistan' },
      { key: 'voice_enabled', value: 'true' },
      { key: 'click_card', value: '8600 0000 0000 0000' },
      { key: 'payme_card', value: '9860 0000 0000 0000' }
    ];
    const insertSetting = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
    defaultSettings.forEach(s => insertSetting.run(s.key, s.value));
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
} catch (error) {
  console.error("Database initialization failed:", error);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Serve firm photo
  app.get("/api/image/firm_photo", (req, res) => {
    // In a real app we'd serve a file, but here we can redirect or serve a base64
    // Since I don't have the file on disk, I'll use a placeholder or the one from the prompt if I can.
    // For now, I'll use a high-quality placeholder that matches the theme.
    res.redirect("https://picsum.photos/seed/uzbechka/800/1200");
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
    res.json({ success: true });
  });

  app.delete("/api/users/:id", (req, res) => {
    try {
      // First delete related order items and orders to avoid FK constraints
      // In a real app we might want to keep history, but user asked for "delete"
      const orders = db.prepare("SELECT id FROM orders WHERE clientId = ? OR agentId = ? OR courierId = ?").all(req.params.id, req.params.id, req.params.id);
      for (const order of orders as any) {
        db.prepare("DELETE FROM order_items WHERE orderId = ?").run(order.id);
        db.prepare("DELETE FROM orders WHERE id = ?").run(order.id);
      }
      db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  app.put("/api/users/:id", (req, res) => {
    const { name, phone, password, role, carType, carPhoto, photo } = req.body;
    db.prepare("UPDATE users SET name = ?, phone = ?, password = ?, role = ?, carType = ?, carPhoto = ?, photo = ? WHERE id = ?").run(
      name, phone, password, role, carType || null, carPhoto || null, photo || null, req.params.id
    );
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

  // Banners
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
      if (!productId) {
        console.error("Missing productId for item:", item);
        continue;
      }
      insertItem.run(orderId, productId, item.quantity, item.price);
    }
    
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
    const { status } = req.body;
    db.prepare("UPDATE debts SET status = ? WHERE id = ?").run(status, req.params.id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
