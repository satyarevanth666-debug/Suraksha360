const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// Initialize database
const db = require('./db');

// Import routes
const authRoutes = require('./routes/auth');
const sosRoutes = require('./routes/sos');
const reportsRoutes = require('./routes/reports');
const riskZonesRoutes = require('./routes/riskzones');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use('/citizen', express.static(path.join(__dirname, '../frontend/citizen')));
app.use('/admin', express.static(path.join(__dirname, '../frontend/admin')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/riskzones', riskZonesRoutes);
app.use('/api/analytics', analyticsRoutes);

// Root redirect
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Suraksha 360 - Government Safety Application</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        .container {
          text-align: center;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          padding: 3rem;
          border-radius: 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        h1 {
          font-size: 3rem;
          margin-bottom: 1rem;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }
        .subtitle {
          font-size: 1.2rem;
          margin-bottom: 2rem;
          opacity: 0.9;
        }
        .warning {
          background: rgba(255, 193, 7, 0.2);
          border-left: 4px solid #ffc107;
          padding: 1rem;
          margin: 2rem 0;
          border-radius: 5px;
          text-align: left;
        }
        .buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
          margin-top: 2rem;
        }
        .btn {
          padding: 1rem 2rem;
          font-size: 1.1rem;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          transition: all 0.3s ease;
          font-weight: 600;
        }
        .btn-citizen {
          background: #4CAF50;
          color: white;
        }
        .btn-admin {
          background: #f44336;
          color: white;
        }
        .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        }
        .features {
          margin-top: 2rem;
          text-align: left;
        }
        .features ul {
          list-style: none;
        }
        .features li {
          padding: 0.5rem 0;
          padding-left: 1.5rem;
          position: relative;
        }
        .features li:before {
          content: "✓";
          position: absolute;
          left: 0;
          color: #4CAF50;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🛡️ Suraksha 360</h1>
        <p class="subtitle">Government Safety Application - Offline-First Prototype</p>
        
        <div class="warning">
          <strong>⚠️ GOVERNMENT AUTHORIZATION NOTICE</strong><br>
          This is a technical prototype demonstrating feasibility. Real deployment requires:<br>
          • UIDAI Aadhaar API integration<br>
          • Telecom SMS gateway access<br>
          • System-level app installation permissions<br>
          • Government security clearance
        </div>

        <div class="features">
          <strong>Citizen Features:</strong>
          <ul>
            <li>Anonymous Crime Reporting</li>
            <li>Smart SOS Emergency System</li>
            <li>Risk Zone Detection & Alerts</li>
            <li>Automatic Evidence Capture</li>
            <li>Offline-First Architecture</li>
          </ul>
          <br>
          <strong>Admin Features:</strong>
          <ul>
            <li>Real-time SOS Monitoring</li>
            <li>Crime Reports Dashboard</li>
            <li>Risk Zone Management</li>
            <li>Analytics & Insights</li>
            <li>Evidence Management</li>
          </ul>
        </div>

        <div class="buttons">
          <a href="/citizen/login.html" class="btn btn-citizen">👤 Citizen Login</a>
          <a href="/admin/login.html" class="btn btn-admin">👮 Admin Login</a>
        </div>

        <div style="margin-top: 2rem; font-size: 0.9rem; opacity: 0.8;">
          <strong>Test Credentials:</strong><br>
          Admin: Aadhaar: 999999999999, Password: admin123<br>
          Citizen: Register with any 12-digit Aadhaar (OTP: 123456)
        </div>
      </div>
    </body>
    </html>
  `);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Suraksha 360 API is running' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║            🛡️  SURAKSHA 360 - SERVER STARTED             ║
║                                                           ║
║     Government Safety Application (Prototype)            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

🌐 Server running on: http://localhost:${PORT}
📱 Citizen App: http://localhost:${PORT}/citizen/login.html
👮 Admin Dashboard: http://localhost:${PORT}/admin/login.html

⚠️  IMPORTANT: This requires government authorization for:
   - Aadhaar API integration
   - Telecom SMS access
   - System-level installation

✅ Database initialized
✅ All routes loaded
✅ Ready for testing
  `);
});

module.exports = app;