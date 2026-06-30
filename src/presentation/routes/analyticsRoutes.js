const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
    getAnalyticsSummary,
    getCategoryBreakdown,
    getCalendarData,
    getGroupStats
} = require('../controllers/analyticsController');

// GET /api/analytics/summary?period=daily|weekly|monthly&month=X&year=X
router.get('/summary', protect, getAnalyticsSummary);

// GET /api/analytics/categories?month=X&year=X
router.get('/categories', protect, getCategoryBreakdown);

// GET /api/analytics/calendar?month=X&year=X
router.get('/calendar', protect, getCalendarData);

// GET /api/analytics/group-stats
router.get('/group-stats', protect, getGroupStats);

module.exports = router;
