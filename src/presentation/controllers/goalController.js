const FinancialGoal = require('../../infrastructure/models/FinancialGoal');
const FinancialRecord = require('../../infrastructure/models/FinancialRecord');

// @desc    Create New Goal
// @route   POST /api/goals/add
// @access  Private
const createGoal = async (req, res) => {
  try {
    const { goalName, targetAmount, targetDate, priority, category } = req.body;

    if (!goalName || !targetAmount) {
      return res.status(400).json({ message: 'Please provide goal name and target amount' });
    }

    const newGoal = await FinancialGoal.create({
      userId: req.user._id,
      goalName,
      targetAmount: parseFloat(targetAmount),
      targetDate: targetDate ? new Date(targetDate) : null,
      priority: priority.toLowerCase(),
      category: category || 'General',
      status: 'active'
    });

    res.status(201).json(newGoal);
  } catch (error) {
    console.error('Error creating goal:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get All Goals for User
// @route   GET /api/goals
// @access  Private
const getGoals = async (req, res) => {
  try {
    const goals = await FinancialGoal.find({ userId: req.user._id });
    
    // Add mock images for now since we don't store them yet
    const images = [
      'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=500&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=500&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=500&auto=format&fit=crop'
    ];

    const formattedGoals = goals.map((goal, index) => {
      const percentage = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
      const priority = goal.priority || 'medium';
      const priorityColor = priority === 'high' ? '#FF5A5F' : priority === 'medium' ? '#FFA500' : '#00D09E';
      
      return {
        ...goal._doc,
        id: goal._id,
        title: goal.goalName,
        current: goal.currentAmount,
        target: goal.targetAmount,
        percentage,
        tag: priority.charAt(0).toUpperCase() + priority.slice(1), // Show priority as Tag
        tagColor: priorityColor,
        category: goal.category || 'General',
        image: images[index % images.length],
        deadline: goal.targetDate ? `${Math.ceil((new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days left` : 'No deadline',
        achievedDate: goal.status === 'achieved' ? new Date(goal.updatedAt).toLocaleDateString() : null
      };
    });

    res.status(200).json(formattedGoals);
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get Goal by ID
// @route   GET /api/goals/:id
// @access  Private
const getGoalById = async (req, res) => {
  try {
    const goal = await FinancialGoal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    // Check if goal belongs to user
    if (goal.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Dynamic Monthly Breakdown Calculation
    let monthlySavingsNeeded = null;
    if (goal.targetDate) {
      const now = new Date();
      const target = new Date(goal.targetDate);
      
      // Calculate months difference
      let months = (target.getFullYear() - now.getFullYear()) * 12;
      months = months - now.getMonth() + target.getMonth();
      
      // Ensure at least 1 month to avoid division by zero or negative
      const divisor = months <= 0 ? 1 : months;
      monthlySavingsNeeded = goal.targetAmount / divisor;
    }

    const priority = goal.priority || 'medium';
    const priorityColor = priority === 'high' ? '#FF5A5F' : priority === 'medium' ? '#FFA500' : '#00D09E';

    res.status(200).json({
      ...goal._doc,
      priorityLabel: priority.charAt(0).toUpperCase() + priority.slice(1),
      priorityColor,
      monthlySavingsNeeded: monthlySavingsNeeded ? Math.max(0, monthlySavingsNeeded) : null
    });
  } catch (error) {
    console.error('Error fetching goal details:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Add Contribution to Goal
// @route   POST /api/goals/:id/contribute
// @access  Private
const addContribution = async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Please provide a valid contribution amount' });
    }

    const goal = await FinancialGoal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    // Check if goal belongs to user
    if (goal.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // 1. Update Goal Amount
    goal.currentAmount += parseFloat(amount);
    
    // Update status if reached
    if (goal.currentAmount >= goal.targetAmount) {
      goal.status = 'achieved';
    }

    await goal.save();

    // 2. Record this as a Financial Record (Contribution is like a specific type of 'expense' or 'saving')
    // We'll mark it as a 'saving' type if supported, or just use 'expense' from a wallet perspective.
    // Based on the user's diagram, FinancialRecord has 'type'.
    await FinancialRecord.create({
      userId: req.user._id,
      amount: amount,
      type: 'expense', // It's an expense from the main wallet, but credited to a goal
      description: `Contribution to ${goal.goalName}`,
      date: new Date(),
      categoryId: null // We could have a 'Savings' category ID here
    });

    res.status(200).json(goal);
  } catch (error) {
    console.error('Error adding contribution:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update Existing Goal
// @route   PUT /api/goals/:id
// @access  Private
const updateGoal = async (req, res) => {
  try {
    const { goalName, targetAmount, targetDate, priority, category, status } = req.body;
    const goal = await FinancialGoal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    if (goal.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Update fields
    if (goalName) goal.goalName = goalName;
    if (targetAmount) goal.targetAmount = parseFloat(targetAmount);
    if (targetDate !== undefined) goal.targetDate = targetDate === null ? null : new Date(targetDate);
    if (priority) goal.priority = priority.toLowerCase();
    if (category) goal.category = category;
    if (status) goal.status = status;

    const updatedGoal = await goal.save();
    res.status(200).json(updatedGoal);
  } catch (error) {
    console.error('Error updating goal:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete Goal
// @route   DELETE /api/goals/:id
// @access  Private
const deleteGoal = async (req, res) => {
  try {
    const goal = await FinancialGoal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    if (goal.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await goal.deleteOne();
    res.status(200).json({ message: 'Goal removed' });
  } catch (error) {
    console.error('Error deleting goal:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  getGoalById,
  addContribution,
  createGoal,
  getGoals,
  updateGoal,
  deleteGoal
};
