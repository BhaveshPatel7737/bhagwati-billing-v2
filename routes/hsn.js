const express = require('express');
const router = express.Router();
const HsnController = require('../controllers/hsnController');

router.get('/', HsnController.getAll);
router.post('/', HsnController.create);
router.delete('/:id', HsnController.delete);

module.exports = router;
