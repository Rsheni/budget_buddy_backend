const FinancialRecord = require('../../infrastructure/models/FinancialRecord');
const SharedExpense = require('../../infrastructure/models/SharedExpense');
const GroupMember = require('../../infrastructure/models/GroupMember');
const mongoose = require('mongoose');

// @desc    Get income/expense summary for bar chart
// @route   GET /api/analytics/summary?period=daily|weekly|monthly&month=X&year=X
// @access  Private
const getAnalyticsSummary = async (req, res) => {
    try {
        const userId = req.user._id;
        const { period = 'monthly', year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;
        const yr = parseInt(year);
        const mo = parseInt(month);

        let groupBy = {};
        let matchStage = { userId: userId };

        if (period === 'daily') {
            // Show each day of the given month
            const startDate = new Date(yr, mo - 1, 1);
            const endDate = new Date(yr, mo, 0, 23, 59, 59);
            matchStage.date = { $gte: startDate, $lte: endDate };
            groupBy = { day: { $dayOfMonth: '$date' } };
        } else if (period === 'weekly') {
            // Show last 7 weeks
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 49);
            matchStage.date = { $gte: startDate };
            groupBy = { week: { $week: '$date' }, year: { $year: '$date' } };
        } else {
            // Monthly: Show all months of the year
            matchStage.date = {
                $gte: new Date(yr, 0, 1),
                $lte: new Date(yr, 11, 31, 23, 59, 59)
            };
            groupBy = { month: { $month: '$date' } };
        }

        const records = await FinancialRecord.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: { period: groupBy, type: '$type' },
                    total: { $sum: '$amount' }
                }
            },
            { $sort: { '_id.period': 1 } }
        ]);

        // Build structured result
        const result = {};
        records.forEach(r => {
            const key = JSON.stringify(r._id.period);
            if (!result[key]) result[key] = { label: '', income: 0, expense: 0 };
            if (period === 'daily') {
                result[key].label = `${r._id.period.day}`;
            } else if (period === 'weekly') {
                result[key].label = `Wk${r._id.period.week}`;
            } else {
                const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                result[key].label = monthNames[(r._id.period.month || 1) - 1];
            }
            result[key][r._id.type] = r.total;
        });

        const chartData = Object.values(result);

        // Overall totals for the period
        const allRecords = await FinancialRecord.aggregate([
            { $match: matchStage },
            { $group: { _id: '$type', total: { $sum: '$amount' } } }
        ]);
        const totalIncome = allRecords.find(r => r._id === 'income')?.total || 0;
        const totalExpense = allRecords.find(r => r._id === 'expense')?.total || 0;
        const savingsRate = totalIncome > 0 ? Math.max(0, Math.min(100, Math.round(((totalIncome - totalExpense) / totalIncome) * 100))) : 0;

        res.status(200).json({
            chartData,
            totalIncome,
            totalExpense,
            savingsRate,
            netBalance: totalIncome - totalExpense
        });
    } catch (error) {
        console.error('Analytics summary error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get spending by category for pie chart
// @route   GET /api/analytics/categories?month=X&year=X
// @access  Private
const getCategoryBreakdown = async (req, res) => {
    try {
        const userId = req.user._id;
        const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.query;
        const yr = parseInt(year);
        const mo = parseInt(month);

        const startDate = new Date(yr, mo - 1, 1);
        const endDate = new Date(yr, mo, 0, 23, 59, 59);

        const breakdown = await FinancialRecord.aggregate([
            {
                $match: {
                    userId: userId,
                    type: 'expense',
                    date: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: '$categoryId',
                    total: { $sum: '$amount' }
                }
            },
            { $sort: { total: -1 } },
            { $limit: 6 },
            {
                $lookup: {
                    from: 'categories',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } }
        ]);

        const totalExpense = breakdown.reduce((sum, b) => sum + b.total, 0);

        const colors = ['#00C896', '#4F8EF7', '#FF6B6B', '#FFD93D', '#A78BFA', '#FB923C'];

        const result = breakdown.map((b, i) => ({
            name: b.category?.categoryName || 'Uncategorized',
            amount: b.total,
            color: b.category?.color || colors[i % colors.length],
            percentage: totalExpense > 0 ? Math.round((b.total / totalExpense) * 100) : 0
        }));

        res.status(200).json({ categories: result, totalExpense });
    } catch (error) {
        console.error('Category breakdown error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get daily spending totals for calendar heatmap
// @route   GET /api/analytics/calendar?month=X&year=X
// @access  Private
const getCalendarData = async (req, res) => {
    try {
        const userId = req.user._id;
        const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.query;
        const yr = parseInt(year);
        const mo = parseInt(month);

        const startDate = new Date(yr, mo - 1, 1);
        const endDate = new Date(yr, mo, 0, 23, 59, 59);

        const records = await FinancialRecord.aggregate([
            {
                $match: {
                    userId: userId,
                    date: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: { day: { $dayOfMonth: '$date' }, type: '$type' },
                    total: { $sum: '$amount' }
                }
            }
        ]);

        // Build a map of day → { income, expense }
        const dayMap = {};
        records.forEach(r => {
            const d = r._id.day;
            if (!dayMap[d]) dayMap[d] = { income: 0, expense: 0 };
            dayMap[d][r._id.type] = r.total;
        });

        const daysInMonth = new Date(yr, mo, 0).getDate();
        const firstDayOfWeek = new Date(yr, mo - 1, 1).getDay(); // 0=Sun

        res.status(200).json({
            daysInMonth,
            firstDayOfWeek,
            month: mo,
            year: yr,
            dayData: dayMap
        });
    } catch (error) {
        console.error('Calendar data error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get group stats summary
// @route   GET /api/analytics/group-stats
// @access  Private
const getGroupStats = async (req, res) => {
    try {
        const userId = req.user._id;

        const memberships = await GroupMember.find({ userId: userId, isActive: true }).select('groupId');
        const groupIds = memberships.map(m => m.groupId);

        let youOweTotal = 0;
        let owedToYouTotal = 0;
        let totalGroupSpend = 0;

        for (const groupId of groupIds) {
            const expenses = await SharedExpense.find({ groupId }).lean();
            const totalSpend = expenses.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
            totalGroupSpend += totalSpend;

            const activeMembers = await GroupMember.find({ groupId, isActive: true }).lean();
            const memberCount = activeMembers.length;
            const userShare = memberCount > 0 ? totalSpend / memberCount : 0;
            const userPaid = expenses
                .filter(e => e.addedBy.toString() === userId.toString())
                .reduce((sum, e) => sum + (e.totalAmount || 0), 0);

            const balance = userPaid - userShare;
            if (balance < 0) youOweTotal += Math.abs(balance);
            else owedToYouTotal += balance;
        }

        res.status(200).json({
            totalGroups: groupIds.length,
            totalGroupSpend: Math.round(totalGroupSpend),
            youOwe: Math.round(youOweTotal),
            owedToYou: Math.round(owedToYouTotal)
        });
    } catch (error) {
        console.error('Group stats error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getAnalyticsSummary,
    getCategoryBreakdown,
    getCalendarData,
    getGroupStats
};
