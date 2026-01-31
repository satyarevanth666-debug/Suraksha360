const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// CREATE RISK ZONE (Admin)
router.post('/create', authMiddleware, adminOnly, (req, res) => {
  const { zoneName, latitude, longitude, radiusKm, riskLevel, description } = req.body;
  const adminId = req.user.id;

  if (!zoneName || !latitude || !longitude || !radiusKm) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const sql = `INSERT INTO risk_zones 
    (zone_name, latitude, longitude, radius_km, risk_level, description, created_by) 
    VALUES (?, ?, ?, ?, ?, ?, ?)`;

  db.run(sql, [
    zoneName,
    latitude,
    longitude,
    radiusKm,
    riskLevel || 'high',
    description || null,
    adminId
  ], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to create risk zone' });
    }

    res.json({
      success: true,
      zoneId: this.lastID,
      message: 'Risk zone created successfully'
    });
  });
});

// GET ALL ACTIVE RISK ZONES
router.get('/all', (req, res) => {
  const sql = `SELECT 
    id, zone_name, latitude, longitude, radius_km, 
    risk_level, description, created_at
    FROM risk_zones
    WHERE active = 1
    ORDER BY created_at DESC`;

  db.all(sql, [], (err, zones) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch risk zones' });
    }
    res.json(zones);
  });
});

// UPDATE RISK ZONE (Admin)
router.put('/:zoneId', authMiddleware, adminOnly, (req, res) => {
  const { zoneId } = req.params;
  const { zoneName, latitude, longitude, radiusKm, riskLevel, description } = req.body;

  const sql = `UPDATE risk_zones 
    SET zone_name = ?, latitude = ?, longitude = ?, radius_km = ?, 
        risk_level = ?, description = ?
    WHERE id = ?`;

  db.run(sql, [
    zoneName,
    latitude,
    longitude,
    radiusKm,
    riskLevel,
    description,
    zoneId
  ], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to update risk zone' });
    }
    res.json({ success: true, message: 'Risk zone updated' });
  });
});

// DELETE RISK ZONE (Admin - soft delete)
router.delete('/:zoneId', authMiddleware, adminOnly, (req, res) => {
  const { zoneId } = req.params;

  db.run(
    'UPDATE risk_zones SET active = 0 WHERE id = ?',
    [zoneId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete risk zone' });
      }
      res.json({ success: true, message: 'Risk zone deleted' });
    }
  );
});

// CHECK IF LOCATION IS IN RISK ZONE
router.post('/check', (req, res) => {
  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Location required' });
  }

  db.all(
    'SELECT * FROM risk_zones WHERE active = 1',
    [],
    (err, zones) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to check risk zones' });
      }

      // Calculate distance using Haversine formula
      const isInRiskZone = zones.find(zone => {
        const distance = calculateDistance(
          latitude,
          longitude,
          zone.latitude,
          zone.longitude
        );
        return distance <= zone.radius_km;
      });

      res.json({
        inRiskZone: !!isInRiskZone,
        zone: isInRiskZone || null
      });
    }
  );
});

// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

module.exports = router;