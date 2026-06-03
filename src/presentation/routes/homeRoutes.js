const express = require('express');
const router = express.Router();
const { getHomeData } = require('../controllers/homeController');
const { protect } = require('../middlewares/authMiddleware');

// GET /api/home
router.get('/', protect, getHomeData);

module.exports = router;