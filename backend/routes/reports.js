const express = require('express');
const router = express.Router();
const multer = require('multer');
const db = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

// SUBMIT ANONYMOUS CRIME REPORT
router.post('/submit', authMiddleware, upload.single('voiceRecording'), (req, res) => {
  const { description, latitude, longitude, address, crimeType } = req.body;
  const anonymousId = uuidv4();
  const voiceFile = req.file;

  const sql = `INSERT INTO crime_reports 
    (anonymous_id, description, voice_recording, voice_filename, 
     latitude, longitude, address, crime_type) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

  db.run(sql, [
    anonymousId,
    description || null,
    voiceFile ? voiceFile.buffer : null,
    voiceFile ? voiceFile.originalname : null,
    latitude,
    longitude,
    address || null,
    crimeType || 'other'
  ], function(err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to submit report' });
    }

    res.json({
      success: true,
      reportId: this.lastID,
      anonymousId: anonymousId,
      message: 'Crime report submitted anonymously'
    });
  });
});

// GET ALL CRIME REPORTS (Admin)
router.get('/all', authMiddleware, adminOnly, (req, res) => {
  const sql = `SELECT 
    id, anonymous_id, description, latitude, longitude, address, 
    crime_type, timestamp, voice_filename
    FROM crime_reports
    ORDER BY timestamp DESC`;

  db.all(sql, [], (err, reports) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch reports' });
    }
    res.json(reports);
  });
});

// GET SINGLE REPORT DETAILS (Admin)
router.get('/:reportId', authMiddleware, adminOnly, (req, res) => {
  const { reportId } = req.params;

  db.get(
    'SELECT * FROM crime_reports WHERE id = ?',
    [reportId],
    (err, report) => {
      if (err || !report) {
        return res.status(404).json({ error: 'Report not found' });
      }
      
      // Don't send binary data in JSON
      const reportData = { ...report };
      if (reportData.voice_recording) {
        reportData.hasVoiceRecording = true;
        delete reportData.voice_recording;
      }
      
      res.json(reportData);
    }
  );
});

// GET VOICE RECORDING (Admin)
router.get('/voice/:reportId', authMiddleware, adminOnly, (req, res) => {
  const { reportId } = req.params;

  db.get(
    'SELECT voice_recording, voice_filename FROM crime_reports WHERE id = ?',
    [reportId],
    (err, report) => {
      if (err || !report || !report.voice_recording) {
        return res.status(404).json({ error: 'Voice recording not found' });
      }

      res.setHeader('Content-Type', 'audio/webm');
      res.setHeader('Content-Disposition', `inline; filename="${report.voice_filename}"`);
      res.send(report.voice_recording);
    }
  );
});

// SYNC OFFLINE REPORTS
router.post('/sync', authMiddleware, (req, res) => {
  const { reports } = req.body;

  if (!Array.isArray(reports) || reports.length === 0) {
    return res.status(400).json({ error: 'No reports to sync' });
  }

  let syncedCount = 0;
  let errors = [];

  reports.forEach((report, index) => {
    const sql = `INSERT INTO crime_reports 
      (anonymous_id, description, latitude, longitude, address, crime_type, timestamp) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [
      report.anonymousId,
      report.description || null,
      report.latitude,
      report.longitude,
      report.address || null,
      report.crimeType || 'other',
      report.timestamp
    ], function(err) {
      if (err) {
        errors.push({ index, error: err.message });
      } else {
        syncedCount++;
      }

      // Send response after processing all reports
      if (index === reports.length - 1) {
        res.json({
          success: true,
          synced: syncedCount,
          failed: errors.length,
          errors: errors
        });
      }
    });
  });
});

module.exports = router;