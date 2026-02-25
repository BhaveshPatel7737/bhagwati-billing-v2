const express = require('express');
const router = express.Router();
const InvoiceController = require('../controllers/invoiceController');
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// EXACT order - specific FIRST
router.get('/', asyncHandler(InvoiceController.getAll));
router.get('/next/:series', asyncHandler(InvoiceController.getNextNumber));
router.get('/edit/:id', asyncHandler(InvoiceController.getById));  // Matches frontend
router.get('/:id', asyncHandler(InvoiceController.getById));       // Generic fallback
router.post('/', asyncHandler(InvoiceController.create));
router.put('/:id', asyncHandler(InvoiceController.update));
router.delete('/:id', asyncHandler(InvoiceController.delete));

module.exports = router;
