const express = require('express');
const router = express.Router();
const multer = require('multer');
const db = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// TRIGGER SOS ALERT
router.post('/trigger', authMiddleware, (req, res) => {
  const { latitude, longitude, address, riskZoneId } = req.body;
  const userId = req.user.id;
  const anonymousId = uuidv4();

  const sql = `INSERT INTO sos_alerts 
    (user_id, anonymous_id, latitude, longitude, address, risk_zone_id) 
    VALUES (?, ?, ?, ?, ?, ?)`;

  db.run(sql, [userId, anonymousId, latitude, longitude, address, riskZoneId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to trigger SOS' });
    }

    const sosId = this.lastID;

    // Get user's emergency contacts
    db.get('SELECT emergency_contact_1, emergency_contact_2, emergency_contact_3 FROM users WHERE id = ?', 
      [userId], 
      (err, user) => {
        if (!err && user) {
          const contacts = [
            user.emergency_contact_1,
            user.emergency_contact_2,
            user.emergency_contact_3
          ].filter(Boolean);

          // Send SMS to emergency contacts (MOCK)
          contacts.forEach(contact => {
            const message = `⚠️ EMERGENCY ALERT: Your registered contact is in danger. Last known location: ${address || `${latitude}, ${longitude}`}. Time: ${new Date().toLocaleString()}. - Suraksha 360`;
            
            // In real deployment, this would use telecom SMS API
            // Requires government authorization
            db.run(
              'INSERT INTO sms_logs (sos_id, recipient, message) VALUES (?, ?, ?)',
              [sosId, contact, message]
            );

            console.log(`📱 SMS sent to ${contact}: ${message}`);
          });
        }
      }
    );

    res.json({
      success: true,
      sosId: sosId,
      anonymousId: anonymousId,
      message: 'SOS triggered successfully. Emergency contacts notified.'
    });
  });
});

// UPLOAD EVIDENCE (Audio/Video)
router.post('/evidence/:sosId', authMiddleware, upload.single('file'), (req, res) => {
  const { sosId } = req.params;
  const { evidenceType, latitude, longitude, duration } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const sql = `INSERT INTO evidence 
    (sos_id, evidence_type, file_data, filename, latitude, longitude, duration) 
    VALUES (?, ?, ?, ?, ?, ?, ?)`;

  db.run(sql, [
    sosId,
    evidenceType,
    file.buffer,
    file.originalname,
    latitude || null,
    longitude || null,
    duration || null
  ], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to upload evidence' });
    }

    res.json({
      success: true,
      evidenceId: this.lastID,
      message: 'Evidence uploaded successfully'
    });
  });
});

// GET ACTIVE SOS ALERTS (Admin)
router.get('/active', authMiddleware, adminOnly, (req, res) => {
  const sql = `SELECT 
    s.id, s.anonymous_id, s.latitude, s.longitude, s.address, 
    s.status, s.triggered_at, r.zone_name as risk_zone
    FROM sos_alerts s
    LEFT JOIN risk_zones r ON s.risk_zone_id = r.id
    WHERE s.status = 'active'
    ORDER BY s.triggered_at DESC`;

  db.all(sql, [], (err, alerts) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch alerts' });
    }
    res.json(alerts);
  });
});

// GET ALL SOS ALERTS (Admin)
router.get('/all', authMiddleware, adminOnly, (req, res) => {
  const sql = `SELECT 
    s.id, s.anonymous_id, s.latitude, s.longitude, s.address, 
    s.status, s.triggered_at, s.resolved_at, s.notes,
    r.zone_name as risk_zone,
    u.name as resolved_by_name
    FROM sos_alerts s
    LEFT JOIN risk_zones r ON s.risk_zone_id = r.id
    LEFT JOIN users u ON s.resolved_by = u.id
    ORDER BY s.triggered_at DESC`;

  db.all(sql, [], (err, alerts) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch alerts' });
    }
    res.json(alerts);
  });
});

// GET SOS DETAILS (Admin)
router.get('/:sosId', authMiddleware, adminOnly, (req, res) => {
  const { sosId } = req.params;

  db.get(
    `SELECT s.*, r.zone_name as risk_zone
     FROM sos_alerts s
     LEFT JOIN risk_zones r ON s.risk_zone_id = r.id
     WHERE s.id = ?`,
    [sosId],
    (err, alert) => {
      if (err || !alert) {
        return res.status(404).json({ error: 'SOS alert not found' });
      }

      // Get evidence
      db.all(
        'SELECT id, evidence_type, filename, timestamp, duration FROM evidence WHERE sos_id = ?',
        [sosId],
        (err, evidence) => {
          res.json({
            ...alert,
            evidence: evidence || []
          });
        }
      );
    }
  );
});

// RESOLVE SOS ALERT (Admin)
router.put('/:sosId/resolve', authMiddleware, adminOnly, (req, res) => {
  const { sosId } = req.params;
  const { notes } = req.body;
  const adminId = req.user.id;

  db.run(
    `UPDATE sos_alerts 
     SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP, resolved_by = ?, notes = ?
     WHERE id = ?`,
    [adminId, notes, sosId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to resolve SOS' });
      }
      res.json({ success: true, message: 'SOS marked as resolved' });
    }
  );
});

// GET EVIDENCE FILE (Admin)
router.get('/evidence/file/:evidenceId', authMiddleware, adminOnly, (req, res) => {
  const { evidenceId } = req.params;

  db.get(
    'SELECT file_data, filename, evidence_type FROM evidence WHERE id = ?',
    [evidenceId],
    (err, evidence) => {
      if (err || !evidence) {
        return res.status(404).json({ error: 'Evidence not found' });
      }

      const mimeType = evidence.evidence_type === 'audio' ? 'audio/webm' : 'video/webm';
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${evidence.filename}"`);
      res.send(evidence.file_data);
    }
  );
});

module.exports = router;