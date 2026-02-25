const express = require('express');
const router = express.Router();
const InvoiceController = require('../controllers/invoiceController');
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/', asyncHandler(InvoiceController.getAll));
router.get('/next/:series', asyncHandler(InvoiceController.getNextNumber));  
router.get('/:id', asyncHandler(InvoiceController.getById));  // For /2/edit
router.post('/', asyncHandler(InvoiceController.create));
router.put('/:id', asyncHandler(InvoiceController.update));   // Add
router.delete('/:id', asyncHandler(InvoiceController.delete)); // Add

module.exports = router;
