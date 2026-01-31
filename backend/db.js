const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'suraksha360.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
db.serialize(() => {
  // Users table (Citizens and Admin)
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aadhaar_number TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'citizen',
    password_hash TEXT NOT NULL,
    emergency_contact_1 TEXT,
    emergency_contact_2 TEXT,
    emergency_contact_3 TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Anonymous Crime Reports
  db.run(`CREATE TABLE IF NOT EXISTS crime_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    anonymous_id TEXT NOT NULL,
    description TEXT,
    voice_recording BLOB,
    voice_filename TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    address TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    synced INTEGER DEFAULT 0,
    crime_type TEXT
  )`);

  // Risk Zones
  db.run(`CREATE TABLE IF NOT EXISTS risk_zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    zone_name TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    radius_km REAL NOT NULL,
    risk_level TEXT DEFAULT 'high',
    description TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    active INTEGER DEFAULT 1,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`);

  // SOS Alerts
  db.run(`CREATE TABLE IF NOT EXISTS sos_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    anonymous_id TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    address TEXT,
    status TEXT DEFAULT 'active',
    risk_zone_id INTEGER,
    triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    resolved_by INTEGER,
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (risk_zone_id) REFERENCES risk_zones(id),
    FOREIGN KEY (resolved_by) REFERENCES users(id)
  )`);

  // Evidence (Audio/Video recordings from SOS)
  db.run(`CREATE TABLE IF NOT EXISTS evidence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sos_id INTEGER NOT NULL,
    evidence_type TEXT NOT NULL,
    file_data BLOB,
    filename TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    duration INTEGER,
    FOREIGN KEY (sos_id) REFERENCES sos_alerts(id)
  )`);

  // SMS Logs
  db.run(`CREATE TABLE IF NOT EXISTS sms_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sos_id INTEGER NOT NULL,
    recipient TEXT NOT NULL,
    message TEXT NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'sent',
    FOREIGN KEY (sos_id) REFERENCES sos_alerts(id)
  )`);

  // Sync Queue for offline operations
  db.run(`CREATE TABLE IF NOT EXISTS sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operation_type TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    synced INTEGER DEFAULT 0
  )`);

  // Create default admin user (Aadhaar: 999999999999, Password: admin123)
  const bcrypt = require('bcryptjs');
  const adminHash = bcrypt.hashSync('admin123', 10);
  
  db.run(`INSERT OR IGNORE INTO users 
    (aadhaar_number, name, phone, email, role, password_hash) 
    VALUES 
    ('999999999999', 'Admin User', '9999999999', 'admin@suraksha360.gov.in', 'admin', ?)`,
    [adminHash]
  );

  console.log('✅ Database initialized successfully');
});

module.exports = db;