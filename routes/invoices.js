const express = require('express');
const router = express.Router();
const InvoiceController = require('../controllers/invoiceController');
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Specific routes FIRST
router.get('/next/:series', asyncHandler(InvoiceController.getNextNumber));
router.get('/edit/:id', asyncHandler(InvoiceController.getById));  // Edit FIRST
router.get('/:id', asyncHandler(InvoiceController.getById));       // Generic last
router.get('/', asyncHandler(InvoiceController.getAll));
router.post('/', asyncHandler(InvoiceController.create));
router.put('/:id', asyncHandler(InvoiceController.update));
router.delete('/:id', asyncHandler(InvoiceController.delete));

module.exports = router;
