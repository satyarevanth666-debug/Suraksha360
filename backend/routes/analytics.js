const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// GET DASHBOARD STATISTICS
router.get('/stats', authMiddleware, adminOnly, (req, res) => {
  const stats = {};

  // Total SOS alerts
  db.get('SELECT COUNT(*) as total FROM sos_alerts', [], (err, result) => {
    stats.totalSOS = result ? result.total : 0;

    // Active SOS alerts
    db.get('SELECT COUNT(*) as active FROM sos_alerts WHERE status = "active"', [], (err, result) => {
      stats.activeSOS = result ? result.active : 0;

      // Total crime reports
      db.get('SELECT COUNT(*) as total FROM crime_reports', [], (err, result) => {
        stats.totalReports = result ? result.total : 0;

        // Total risk zones
        db.get('SELECT COUNT(*) as total FROM risk_zones WHERE active = 1', [], (err, result) => {
          stats.totalRiskZones = result ? result.total : 0;

          // Total evidence
          db.get('SELECT COUNT(*) as total FROM evidence', [], (err, result) => {
            stats.totalEvidence = result ? result.total : 0;

            res.json(stats);
          });
        });
      });
    });
  });
});

// CRIME TYPE DISTRIBUTION
router.get('/crime-types', authMiddleware, adminOnly, (req, res) => {
  const sql = `SELECT 
    crime_type, 
    COUNT(*) as count
    FROM crime_reports
    GROUP BY crime_type
    ORDER BY count DESC`;

  db.all(sql, [], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch crime types' });
    }
    res.json(results);
  });
});

// AREA-WISE CRIME DENSITY (by approximate location)
router.get('/area-density', authMiddleware, adminOnly, (req, res) => {
  const sql = `SELECT 
    ROUND(latitude, 2) as lat_area,
    ROUND(longitude, 2) as lon_area,
    COUNT(*) as crime_count,
    address
    FROM crime_reports
    GROUP BY lat_area, lon_area
    ORDER BY crime_count DESC
    LIMIT 20`;

  db.all(sql, [], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch area density' });
    }
    res.json(results);
  });
});

// TIME-BASED CRIME TRENDS (by hour)
router.get('/time-trends', authMiddleware, adminOnly, (req, res) => {
  const sql = `SELECT 
    strftime('%H', timestamp) as hour,
    COUNT(*) as count
    FROM crime_reports
    GROUP BY hour
    ORDER BY hour`;

  db.all(sql, [], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch time trends' });
    }
    res.json(results);
  });
});

// SOS RESPONSE TIME ANALYSIS
router.get('/sos-response', authMiddleware, adminOnly, (req, res) => {
  const sql = `SELECT 
    id,
    anonymous_id,
    triggered_at,
    resolved_at,
    ROUND((julianday(resolved_at) - julianday(triggered_at)) * 24 * 60) as response_minutes
    FROM sos_alerts
    WHERE status = 'resolved' AND resolved_at IS NOT NULL
    ORDER BY triggered_at DESC
    LIMIT 50`;

  db.all(sql, [], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch response times' });
    }

    // Calculate average response time
    const totalMinutes = results.reduce((sum, r) => sum + (r.response_minutes || 0), 0);
    const avgResponseTime = results.length > 0 ? totalMinutes / results.length : 0;

    res.json({
      responseData: results,
      averageResponseMinutes: Math.round(avgResponseTime)
    });
  });
});

// MONTHLY CRIME TRENDS
router.get('/monthly-trends', authMiddleware, adminOnly, (req, res) => {
  const sql = `SELECT 
    strftime('%Y-%m', timestamp) as month,
    COUNT(*) as count
    FROM crime_reports
    GROUP BY month
    ORDER BY month DESC
    LIMIT 12`;

  db.all(sql, [], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch monthly trends' });
    }
    res.json(results);
  });
});

// RISK ZONE EFFECTIVENESS (SOS alerts in risk zones)
router.get('/risk-zone-effectiveness', authMiddleware, adminOnly, (req, res) => {
  const sql = `SELECT 
    r.zone_name,
    COUNT(s.id) as sos_count
    FROM risk_zones r
    LEFT JOIN sos_alerts s ON s.risk_zone_id = r.id
    WHERE r.active = 1
    GROUP BY r.id, r.zone_name
    ORDER BY sos_count DESC`;

  db.all(sql, [], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch risk zone data' });
    }
    res.json(results);
  });
});

module.exports = router;