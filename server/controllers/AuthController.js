const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validationResult } = require('express-validator');

class AuthController {
  async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const { username, email, password } = req.body;
      const existingUser = await User.findOne({ 
        where: { email } 
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User already exists with this email'
        });
      }
      const user = await User.create({
        username,
        email,
        password,
        role: 'analyst' 
      });

      const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
          },
          token
        }
      });

    } catch (error) {
      console.error('rigistration error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during registration'
      });
    }
  }

  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const { email, password } = req.body;

      const user = await User.findOne({ where: { email } });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      const isMatch = await user.comparePassword(password);

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated'
        });
      }
      const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
          },
          token
        }
      });

    } catch (error) {
      console.error('login error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during login'
      });
    }
  }

  async getProfile(req, res) {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: ['id', 'username', 'email', 'role', 'created_at']
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: { user }
      });

    } catch (error) {
      console.error('Profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error fetching profile'
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const { username } = req.body;
      const user = req.user;

      await user.update({ username });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
          }
        }
      });

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error updating profile'
      });
    }
  }
}

module.exports = new AuthController();