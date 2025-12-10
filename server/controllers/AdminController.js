const User = require('../models/User');
const { validationResult } = require('express-validator');

class AdminController {
  async getUsers(req, res) {
    try {
      const users = await User.findAll({
        attributes: ['id', 'username', 'email', 'role', 'is_active', 'created_at'],
        order: [['created_at', 'DESC']]
      });
      
      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error fetching users'
      });
    }
  }

  async createUser(req, res) {
    try {
      const { username, email, password, role } = req.body;
      
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
        role: role || 'analyst'
      });

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });

    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error creating user'
      });
    }
  }

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { username, email, role, is_active } = req.body;
      
      const user = await User.findByPk(id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      await user.update({
        username: username || user.username,
        email: email || user.email,
        role: role || user.role,
        is_active: is_active !== undefined ? is_active : user.is_active
      });

      res.json({
        success: true,
        message: 'User updated successfully',
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          is_active: user.is_active
        }
      });

    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error updating user'
      });
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      
      const user = await User.findByPk(id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      if (user.id === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete your own account'
        });
      }

      await user.destroy();

      res.json({
        success: true,
        message: 'User deleted successfully'
      });

    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error deleting user'
      });
    }
  }
}

module.exports = new AdminController();