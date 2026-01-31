const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

// MOCK AADHAAR OTP VERIFICATION
// In real deployment, this would integrate with UIDAI API
// Requires government authorization
router.post('/send-otp', (req, res) => {
  const { aadhaar } = req.body;

  if (!aadhaar || aadhaar.length !== 12) {
    return res.status(400).json({ error: 'Invalid Aadhaar number' });
  }

  // MOCK: In real system, this would call UIDAI API to send OTP
  const mockOTP = '123456';
  console.log(`📱 MOCK OTP for Aadhaar ${aadhaar}: ${mockOTP}`);

  res.json({ 
    success: true, 
    message: 'OTP sent successfully',
    // In production, never send OTP in response
    mockOTP: mockOTP // Only for testing
  });
});

// MOCK AADHAAR LOGIN WITH OTP
router.post('/verify-otp', (req, res) => {
  const { aadhaar, otp } = req.body;

  // MOCK: Accept any OTP for demo (use 123456)
  if (otp !== '123456') {
    return res.status(400).json({ error: 'Invalid OTP' });
  }

  // Check if user exists
  db.get('SELECT * FROM users WHERE aadhaar_number = ?', [aadhaar], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (user) {
      // Existing user - login
      const token = jwt.sign(
        { id: user.id, aadhaar: user.aadhaar_number, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          emergencyContacts: [
            user.emergency_contact_1,
            user.emergency_contact_2,
            user.emergency_contact_3
          ].filter(Boolean)
        }
      });
    } else {
      // New user - needs registration
      res.json({
        success: true,
        newUser: true,
        aadhaar: aadhaar
      });
    }
  });
});

// REGISTER NEW USER
router.post('/register', (req, res) => {
  const { 
    aadhaar, 
    name, 
    phone, 
    email, 
    password,
    emergencyContacts 
  } = req.body;

  if (!aadhaar || !name || !phone || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  const sql = `INSERT INTO users 
    (aadhaar_number, name, phone, email, password_hash, 
     emergency_contact_1, emergency_contact_2, emergency_contact_3) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

  db.run(sql, [
    aadhaar,
    name,
    phone,
    email || null,
    passwordHash,
    emergencyContacts?.[0] || null,
    emergencyContacts?.[1] || null,
    emergencyContacts?.[2] || null
  ], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Registration failed' });
    }

    const token = jwt.sign(
      { id: this.lastID, aadhaar: aadhaar, role: 'citizen' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: this.lastID,
        name,
        phone,
        role: 'citizen'
      }
    });
  });
});

// ADMIN LOGIN (Password-based)
router.post('/admin-login', (req, res) => {
  const { aadhaar, password } = req.body;

  db.get(
    'SELECT * FROM users WHERE aadhaar_number = ? AND role = ?',
    [aadhaar, 'admin'],
    (err, user) => {
      if (err || !user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (!bcrypt.compareSync(password, user.password_hash)) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user.id, aadhaar: user.aadhaar_number, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          role: user.role
        }
      });
    }
  );
});

module.exports = router;