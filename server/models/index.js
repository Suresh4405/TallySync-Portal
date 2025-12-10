const { sequelize } = require('../config/database');

const User = require('./User');
const TallyLedger = require('./TallyLedger');
const TallyInvoice = require('./TallyInvoice');
const SyncLog = require('./SyncLog');

const db = {
  sequelize,
  User,
  TallyLedger,
  TallyInvoice,
  SyncLog
};

User.hasMany(SyncLog, { foreignKey: 'user_id', as: 'SyncLogs' });
SyncLog.belongsTo(User, { foreignKey: 'user_id', as: 'User' });

module.exports = db;