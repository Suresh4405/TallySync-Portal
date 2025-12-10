const { body } = require('express-validator');

const registerValidation = [
  body('username')
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
  
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format'),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const loginValidation = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format'),
  
  body('password')
    .notEmpty().withMessage('Password is required')
];

const ledgerValidation = [
  body('ledger_name')
    .notEmpty().withMessage('Ledger name is required')
    .isLength({ max: 255 }).withMessage('Ledger name too long'),
  
  body('ledger_alias')
    .optional()
    .isLength({ max: 255 }).withMessage('Ledger alias too long'),
  
  body('parent_group')
    .optional()
    .isLength({ max: 100 }).withMessage('Parent group too long'),
  
  body('opening_balance')
    .optional()
    .isFloat({ min: -9999999999.99, max: 9999999999.99 })
    .withMessage('Opening balance must be a valid number'),
  
  body('address')
    .optional()
    .isLength({ max: 500 }).withMessage('Address too long'),
  
  body('state')
    .optional()
    .isLength({ max: 100 }).withMessage('State name too long'),
  
  body('pincode')
    .optional()
    .matches(/^[0-9]*$/).withMessage('Pincode must contain only numbers')
    .isLength({ max: 10 }).withMessage('Pincode too long'),
  
  body('mobile')
    .optional()
    .matches(/^[0-9]*$/).withMessage('Mobile must contain only numbers')
    .isLength({ min: 0, max: 15 }).withMessage('Mobile number too long'),
  
  body('email')
    .optional()
    .isEmail().withMessage('Invalid email format'),
  
  body('gst_number')
    .optional()
    .matches(/^[0-9A-Za-z]*$/).withMessage('GST number can only contain letters and numbers')
    .isLength({ max: 20 }).withMessage('GST number too long'),
  
  body('pan_number')
    .optional()
    .matches(/^[A-Z0-9]*$/).withMessage('PAN number can only contain uppercase letters and numbers')
    .isLength({ max: 20 }).withMessage('PAN number too long')
];

const invoiceValidation = [
  body('voucher_type')
    .notEmpty().withMessage('Voucher type is required')
    .isIn(['Sales', 'Purchase', 'Receipt', 'Payment', 'Contra']).withMessage('Invalid voucher type'),
  
  body('date')
    .notEmpty().withMessage('Date is required')
    .isISO8601().withMessage('Invalid date format'),
  
  body('party_ledger_name')
    .notEmpty().withMessage('Party ledger name is required'),
  
  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  
  body('tax_amount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Tax amount must be positive'),
  
  body('total_amount')
    .notEmpty().withMessage('Total amount is required')
    .isFloat({ min: 0.01 }).withMessage('Total amount must be greater than 0'),
  
  body('narration')
    .optional()
    .isLength({ max: 1000 }).withMessage('Narration too long')
];

module.exports = {
  registerValidation,
  loginValidation,
  ledgerValidation,
  invoiceValidation
};