const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Company = sequelize.define('Company', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    tallyUrl: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: 'http://localhost:9000'
    },
    companyName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: 'DevCompany'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'companies',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Company;