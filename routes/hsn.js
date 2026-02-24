const express = require('express');
const router = express.Router();
const HsnController = require('../controllers/hsnController');

// Async middleware wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.get('/', asyncHandler(HsnController.getAll));
router.post('/', asyncHandler(HsnController.create));
router.delete('/:id', asyncHandler(HsnController.delete));

module.exports = router;
