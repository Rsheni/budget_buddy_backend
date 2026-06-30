const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    verifyEmailPin,
    forgotPassword,
    verifyResetPin,
    resetPassword
} = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verify-pin', verifyEmailPin);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-pin', verifyResetPin);
router.post('/reset-password', resetPassword);

module.exports = router;
