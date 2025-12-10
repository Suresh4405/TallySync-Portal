const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SyncLog = sequelize.define('SyncLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  sync_type: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  user_id: {
    type: DataTypes.INTEGER,
    references: { model: 'users', key: 'id' }
  },
  start_time: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  end_time: {
    type: DataTypes.DATE
  },
  status: {
    type: DataTypes.ENUM('in_progress', 'success', 'failed'),
    defaultValue: 'in_progress'
  },
  records_processed: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  error_message: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'sync_logs',
  timestamps: false
});

module.exports = SyncLog;