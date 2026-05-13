const express = require('express');
const router = express.Router();
const { 
  getGoals, 
  createGoal, 
  getGoalById, 
  addContribution,
  updateGoal,
  deleteGoal
} = require('../controllers/goalController');
const { protect } = require('../middlewares/authMiddleware');

// All routes are protected
router.use(protect);

router.get('/', getGoals);
router.get('/:id', getGoalById);
router.post('/add', createGoal); 
router.post('/:id/contribute', addContribution);
router.put('/:id', updateGoal);
router.delete('/:id', deleteGoal);

module.exports = router;
