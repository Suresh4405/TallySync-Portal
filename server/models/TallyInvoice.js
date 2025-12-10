const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TallyInvoice = sequelize.define('TallyInvoice', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  voucher_type: {
    type: DataTypes.STRING(50),
    defaultValue: 'Sales'
  },
  voucher_number: {
    type: DataTypes.STRING(100),
    unique: true
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  party_ledger_name: {
    type: DataTypes.STRING(255)
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  tax_amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  },
  total_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  narration: {
    type: DataTypes.TEXT
  },
  tally_guid: {
    type: DataTypes.STRING(100)
  },
  sync_status: {
    type: DataTypes.ENUM('pending', 'success', 'failed'),
    defaultValue: 'pending'
  },
  error_message: {
    type: DataTypes.TEXT
  },
  synced_at: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'tally_invoices',
  timestamps: true,
  underscored: true
});

module.exports = TallyInvoice;