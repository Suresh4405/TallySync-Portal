const router = require('express').Router();
const tallyController = require('../controllers/TallyController');

router.post('/create-ledger', tallyController.createLedger);
router.post('/create-invoice', tallyController.createInvoice);

module.exports = router;
