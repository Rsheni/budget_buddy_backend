const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { 
    createGroup, 
    getGroups, 
    getGroupExpenses, 
    addGroupExpense, 
    updateGroup, 
    getGroupSettings, 
    addMembers, 
    removeMember, 
    removeGroupExpense,
    getGroupBalances,
    createSettlement,
    getGroupSettlements,
    getPendingInvitations,
    acceptInvitation,
    cancelInvitation,
    deleteGroup
} = require('../controllers/groupController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = 'uploads/groups';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'group-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

router.post('/create', protect, upload.single('coverPhoto'), createGroup);
router.get('/', protect, getGroups);
router.get('/invitations/pending', protect, getPendingInvitations);
router.post('/invitations/accept', protect, acceptInvitation);
router.get('/:groupId/expenses', protect, getGroupExpenses);
router.post('/:groupId/expenses', protect, upload.single('receipt'), addGroupExpense);
router.delete('/:groupId/expenses/:expenseId', protect, removeGroupExpense);

router.get('/:groupId/balances', protect, getGroupBalances);
router.post('/:groupId/settlements', protect, createSettlement);
router.get('/:groupId/settlements', protect, getGroupSettlements);

// New Settings Endpoints
router.get('/:groupId/settings', protect, getGroupSettings);
router.put('/:groupId', protect, upload.single('coverPhoto'), updateGroup);
router.post('/:groupId/members', protect, addMembers);
router.delete('/:groupId/members/:memberId', protect, removeMember);
router.delete('/:groupId/invitations/:invitationId', protect, cancelInvitation);
router.delete('/:groupId', protect, deleteGroup);

module.exports = router;
