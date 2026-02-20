const express = require('express');
const router = express.Router();
const InvoiceController = require('../controllers/invoiceController');

router.get('/', InvoiceController.getAll);
router.get('/next/:series', InvoiceController.getNextNumber);
router.get('/:id', InvoiceController.getById);
router.post('/', InvoiceController.create);

module.exports = router;
