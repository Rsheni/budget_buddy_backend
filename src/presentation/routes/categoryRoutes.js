const express = require('express');
const router = express.Router();
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');

router.get('/', getCategories);
router.post('/add', createCategory);
router.put('/:id', updateCategory);    // <--- New
router.delete('/:id', deleteCategory); // <--- New

module.exports = router;