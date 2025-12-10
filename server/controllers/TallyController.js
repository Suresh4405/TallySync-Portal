const TallyService = require('../services/TallyService');
const TallyLedger = require('../models/TallyLedger');
const TallyInvoice = require('../models/TallyInvoice');
const SyncLog = require('../models/SyncLog');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

class TallyController {
  async createLedger(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const ledgerData = req.body;
      const userId = req.user.id;

      const ledger = await TallyLedger.create({
        ...ledgerData,
        synced_at: null,
        tally_guid: null
      });

      const tallyResult = await TallyService.createLedgerInTally(ledgerData, userId);

      if (tallyResult.success) {
        await ledger.update({
          tally_guid: tallyResult.tallyGuid,
          synced_at: new Date()
        });
      } else {
        await ledger.update({
          error_message: tallyResult.message
        });
      }

      res.json({
        success: true,
        message: 'Ledger created successfully',
        data: {
          ledger,
          tallySync: tallyResult
        }
      });

    } catch (error) {
      console.error('Create ledger error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error creating ledger'
      });
    }
  }
async deleteLedger(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const ledger = await TallyLedger.findByPk(id);
        
        if (!ledger) {
            return res.status(404).json({
                success: false,
                message: 'Ledger not found in database'
            });
        }

        let tallyResult = { success: true, message: '' };
        
        if (ledger.synced_at && ledger.tally_guid) {
            try {
                tallyResult = await TallyService.deleteLedgerFromTally(ledger.ledger_name);
            } catch (tallyError) {
                console.warn(`Tally error: ${tallyError.message}`);
                tallyResult = { 
                    success: true,  
                    message: `Tally failed: ${tallyError.message}`
                };
            }
        } else {
            tallyResult.message = 'Ledger was never synced to Tally';
        }

        await ledger.destroy();

        res.json({
            success: true,
            message: ledger.synced_at 
                ? `Ledger deleted successfully. ${tallyResult.message}`
                : 'Ledger deleted from database (was not in Tally)',
            details: tallyResult
        });

    } catch (error) {
        console.error('Delete ledger error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Server error deleting ledger'
        });
    }
}

  async pushInvoice(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const invoiceData = req.body;
      const userId = req.user.id;

      if (!invoiceData.voucher_number) {
        const date = new Date().toISOString().slice(0,10).replace(/-/g, '');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        invoiceData.voucher_number = `INV-${date}-${random}`;
      }

      const invoice = await TallyInvoice.create({
        ...invoiceData,
        sync_status: 'pending',
        synced_at: null,
        tally_guid: null
      });

      const tallyResult = await TallyService.pushInvoiceToTally(invoiceData, userId);

      if (tallyResult.success) {
        await invoice.update({
          tally_guid: tallyResult.tallyGuid,
          sync_status: 'success',
          synced_at: new Date()
        });
      } else {
        await invoice.update({
          sync_status: 'failed',
          error_message: tallyResult.message
        });
      }

      res.json({
        success: true,
        message: 'Invoice processed successfully',
        data: {
          invoice,
          tallySync: tallyResult
        }
      });

    } catch (error) {
      console.error('Push invoice error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error processing invoice'
      });
    }
  }
async deleteInvoice(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const invoice = await TallyInvoice.findByPk(id);
        
        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found in database'
            });
        }

        let tallyResult = { success: true, message: '' };
        
        if (invoice.synced_at && invoice.tally_guid) {
            try {
                tallyResult = await TallyService.deleteInvoiceFromTally(invoice.voucher_number);
                
                if (!tallyResult.success) {
                    console.warn(`Tally deletion warning: ${tallyResult.message}`);
                }
            } catch (tallyError) {
                console.warn(`Tally deletion error: ${tallyError.message}`);
                tallyResult = { 
                    success: true,  
                    message: `Tally deletion failed: ${tallyError.message}`
                };
            }
        } else {
            console.log(`Invoice "${invoice.voucher_number}" was never synced to Tally`);
            tallyResult.message = 'Invoice was never synced to Tally';
        }

        await invoice.destroy();

        res.json({
            success: true,
            message: invoice.synced_at 
                ? `Invoice deleted successfully. ${tallyResult.message}`
                : 'Invoice deleted from database (was not in Tally)',
            details: tallyResult
        });

    } catch (error) {
        console.error('Delete invoice error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Server error deleting invoice'
        });
    }
}
  async syncLedgers(req, res) {
    try {
      const userId = req.user.id;
      const result = await TallyService.syncLedgersToDatabase(userId);

      res.json(result);

    } catch (error) {
      console.error('Sync ledgers error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error syncing ledgers'
      });
    }
  }

  async getLedgers(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '',
        sortBy = 'created_at',
        sortOrder = 'DESC' 
      } = req.query;

      const offset = (page - 1) * limit;

      const whereClause = {};
      if (search) {
        whereClause[Op.or] = [
          { ledger_name: { [Op.like]: `%${search}%` } },
          { ledger_alias: { [Op.like]: `%${search}%` } },
          { gst_number: { [Op.like]: `%${search}%` } }
        ];
      }

      const { count, rows: ledgers } = await TallyLedger.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [[sortBy, sortOrder.toUpperCase()]]
      });

      res.json({
        success: true,
        data: {
          ledgers: ledgers.map(ledger => ({
            id: ledger.id,
            ledger_name: ledger.ledger_name,
            ledger_alias: ledger.ledger_alias,
            parent_group: ledger.parent_group,
            opening_balance: parseFloat(ledger.opening_balance || 0),
            closing_balance: parseFloat(ledger.closing_balance || 0),
            address: ledger.address,
            state: ledger.state,
            pincode: ledger.pincode,
            mobile: ledger.mobile,
            email: ledger.email,
            gst_number: ledger.gst_number,
            pan_number: ledger.pan_number,
            is_active: ledger.is_active,
            tally_guid: ledger.tally_guid,
            synced_at: ledger.synced_at,
            created_at: ledger.created_at,
            updated_at: ledger.updated_at
          })),
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(count / limit)
          }
        }
      });

    } catch (error) {
      console.error('Get ledgers error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error fetching ledgers'
      });
    }
  }

  async getInvoices(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        startDate, 
        endDate,
        sync_status,
        sortBy = 'date',
        sortOrder = 'DESC' 
      } = req.query;

      const offset = (page - 1) * limit;

      const whereClause = {};
      
      if (startDate && endDate) {
        whereClause.date = {
          [Op.between]: [startDate, endDate]
        };
      } else if (startDate) {
        whereClause.date = {
          [Op.gte]: startDate
        };
      } else if (endDate) {
        whereClause.date = {
          [Op.lte]: endDate
        };
      }

      if (sync_status) {
        whereClause.sync_status = sync_status;
      }

      const { count, rows: invoices } = await TallyInvoice.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [[sortBy, sortOrder.toUpperCase()]]
      });

      const totals = await TallyInvoice.findOne({
        where: whereClause,
        attributes: [
          [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount'],
          [sequelize.fn('SUM', sequelize.col('tax_amount')), 'total_tax'],
          [sequelize.fn('SUM', sequelize.col('total_amount')), 'grand_total'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'total_invoices']
        ],
        raw: true
      });

      res.json({
        success: true,
        data: {
          invoices: invoices.map(invoice => ({
            id: invoice.id,
            voucher_type: invoice.voucher_type,
            voucher_number: invoice.voucher_number,
            date: invoice.date,
            party_ledger_name: invoice.party_ledger_name,
            amount: parseFloat(invoice.amount),
            tax_amount: parseFloat(invoice.tax_amount || 0),
            total_amount: parseFloat(invoice.total_amount),
            narration: invoice.narration,
            tally_guid: invoice.tally_guid,
            sync_status: invoice.sync_status,
            error_message: invoice.error_message,
            synced_at: invoice.synced_at,
            created_at: invoice.created_at,
            updated_at: invoice.updated_at
          })),
          totals: {
            total_amount: parseFloat(totals?.total_amount || 0),
            total_tax: parseFloat(totals?.total_tax || 0),
            grand_total: parseFloat(totals?.grand_total || 0),
            total_invoices: parseInt(totals?.total_invoices || 0)
          },
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(count / limit)
          }
        }
      });

    } catch (error) {
      console.error('Get invoices error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error fetching invoices'
      });
    }
  }

  async getSyncLogs(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20,
        sync_type,
        status,
        startDate,
        endDate 
      } = req.query;

      const offset = (page - 1) * limit;

      const whereClause = {};
      
      if (sync_type) {
        whereClause.sync_type = sync_type;
      }

      if (status) {
        whereClause.status = status;
      }

      if (startDate && endDate) {
        whereClause.start_time = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }

      const { count, rows: logs } = await SyncLog.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['start_time', 'DESC']],
        raw: true
      });

      const userIds = [...new Set(logs.map(log => log.user_id).filter(id => id))];
      let users = [];
      
      if (userIds.length > 0) {
        users = await User.findAll({
          where: { id: userIds },
          attributes: ['id', 'username', 'email'],
          raw: true
        });
      }

      const userMap = {};
      users.forEach(user => {
        userMap[user.id] = {
          username: user.username,
          email: user.email
        };
      });

      const formattedLogs = logs.map(log => ({
        id: log.id,
        sync_type: log.sync_type,
        user_id: log.user_id,
        start_time: log.start_time,
        end_time: log.end_time,
        status: log.status,
        records_processed: log.records_processed,
        error_message: log.error_message,
        User: log.user_id ? userMap[log.user_id] || { 
          username: `User ${log.user_id}`, 
          email: null 
        } : { 
          username: 'System', 
          email: null 
        }
      }));

      res.json({
        success: true,
        data: {
          logs: formattedLogs,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(count / limit)
          }
        }
      });

    } catch (error) {
      console.error('Get sync logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error fetching sync logs'
      });
    }
  }

  async getDashboardStats(req, res) {
    try {
      const [
        totalLedgers,
        activeLedgers,
        totalInvoices,
        totalInvoiceAmount,
        pendingInvoices,
        failedInvoices,
        syncLogs
      ] = await Promise.all([
        TallyLedger.count(),
        TallyLedger.count({ where: { is_active: true } }),
        TallyInvoice.count(),
        TallyInvoice.sum('total_amount'),
        TallyInvoice.count({ where: { sync_status: 'pending' } }),
        TallyInvoice.count({ where: { sync_status: 'failed' } }),
        SyncLog.findAll({
          limit: 5,
          order: [['start_time', 'DESC']],
          raw: true
        })
      ]);

      const recentSyncs = syncLogs.map(log => ({
        id: log.id,
        sync_type: log.sync_type,
        status: log.status,
        records_processed: log.records_processed,
        start_time: log.start_time,
        end_time: log.end_time,
        error_message: log.error_message,
        User: log.user_id ? { username: `User ${log.user_id}` } : { username: 'System' }
      }));

      const responseData = {
        stats: {
          totalLedgers: totalLedgers || 0,
          activeLedgers: activeLedgers || 0,
          totalInvoices: totalInvoices || 0,
          totalInvoiceAmount: parseFloat(totalInvoiceAmount || 0),
          pendingInvoices: pendingInvoices || 0,
          failedInvoices: failedInvoices || 0,
          successRate: totalInvoices > 0 
            ? ((totalInvoices - pendingInvoices - failedInvoices) / totalInvoices * 100).toFixed(2)
            : "0.00"
        },
        recentSyncs
      };

      res.json({
        success: true,
        data: responseData
      });

    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error fetching dashboard stats'
      });
    }
  }
}

module.exports = new TallyController();