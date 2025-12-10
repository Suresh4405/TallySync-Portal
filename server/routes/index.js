const express = require('express');
const router = express.Router();

const AuthController = require('../controllers/AuthController');
const TallyController = require('../controllers/TallyController');
const AdminController = require('../controllers/AdminController');

const { auth, authorize } = require('../middleware/auth');
const validation = require('../middleware/validation');

router.post('/auth/register', validation.registerValidation, AuthController.register);
router.post('/auth/login', validation.loginValidation, AuthController.login);
router.get('/auth/profile', auth, AuthController.getProfile);
router.put('/auth/profile', auth, AuthController.updateProfile);

router.post('/tally/ledgers', 
  auth, 
  authorize('admin', 'accountant'), 
  validation.ledgerValidation, 
  TallyController.createLedger
);

router.delete('/tally/ledgers/:id', 
  auth, 
  authorize('admin'), 
  TallyController.deleteLedger
);

router.post('/tally/invoices', 
  auth, 
  authorize('admin', 'accountant'), 
  validation.invoiceValidation, 
  TallyController.pushInvoice
);
router.delete('/tally/invoices/:id', 
  auth, 
  authorize('admin', 'accountant'), 
  TallyController.deleteInvoice
);
router.post('/tally/sync/ledgers', 
  auth, 
  authorize('admin', 'accountant'), 
  TallyController.syncLedgers
);

router.get('/tally/ledgers', auth, TallyController.getLedgers);
router.get('/tally/invoices', auth, TallyController.getInvoices);
router.get('/tally/sync-logs', auth, TallyController.getSyncLogs);
router.get('/tally/dashboard-stats', auth, TallyController.getDashboardStats);

router.get('/admin/users', auth, authorize('admin'), AdminController.getUsers);
router.post('/admin/users', auth, authorize('admin'), AdminController.createUser);
router.put('/admin/users/:id', auth, authorize('admin'), AdminController.updateUser);
router.delete('/admin/users/:id', auth, authorize('admin'), AdminController.deleteUser);

router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Tally Dashboard API'
  });
});

module.exports = router;