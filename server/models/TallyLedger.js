const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TallyLedger = sequelize.define('TallyLedger', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ledger_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  ledger_alias: {
    type: DataTypes.STRING(255)
  },
  parent_group: {
    type: DataTypes.STRING(100),
    defaultValue: 'Sundry Debtors'
  },
  opening_balance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  },
  closing_balance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  },
  address: {
    type: DataTypes.STRING(500)
  },
  state: {
    type: DataTypes.STRING(100)
  },
  pincode: {
    type: DataTypes.STRING(20)
  },
  mobile: {
    type: DataTypes.STRING(20)
  },
  email: {
    type: DataTypes.STRING(100)
  },
  gst_number: {
    type: DataTypes.STRING(50)
  },
  pan_number: {
    type: DataTypes.STRING(20)
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  tally_guid: {
    type: DataTypes.STRING(100)
  },
  synced_at: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'tally_ledgers',
  timestamps: true,
  underscored: true
});

module.exports = TallyLedger;