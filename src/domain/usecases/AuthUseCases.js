const User = require('../../infrastructure/models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

const emailService = require('../../infrastructure/services/emailService');

const generatePin = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const register = async (userData) => {
    const { name, email, password, phoneNumber } = userData;

    const userExists = await User.findOne({ email });
    if (userExists) {
        throw new Error('User already exists');
    }

    const pin = generatePin();
    const pinExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const user = await User.create({
        name,
        email,
        password,
        phoneNumber,
        isVerified: false,
        verificationPin: pin,
        pinExpiresAt
    });

    if (user) {
        await emailService.sendVerificationCode(user.email, pin);

        return {
            _id: user._id,
            name: user.name,
            email: user.email,
            isVerified: false,
            message: "Verification PIN sent to email"
        };
    } else {
        throw new Error('Invalid user data');
    }
};

const verifyPin = async (email, pin) => {
    const user = await User.findOne({ email });

    if (!user) {
        throw new Error('User not found');
    }

    if (user.isVerified) {
        return {
            _id: user._id,
            name: user.name,
            email: user.email,
            isVerified: true,
            token: generateToken(user._id),
        };
    }

    if (user.verificationPin !== pin) {
        throw new Error('Invalid PIN');
    }

    if (user.pinExpiresAt < Date.now()) {
        throw new Error('PIN expired');
    }

    user.isVerified = true;
    user.verificationPin = undefined;
    user.pinExpiresAt = undefined;
    await user.save();

    return {
        _id: user._id,
        name: user.name,
        email: user.email,
        isVerified: true,
        token: generateToken(user._id),
    };
};

const login = async (email, password) => {
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
        if (!user.isVerified) {
            // Optional: Resend PIN here if needed, or just throw error
            throw new Error('Account not verified. Please verify your email.');
        }

        return {
            _id: user._id,
            name: user.name,
            email: user.email,
            isVerified: true,
            token: generateToken(user._id),
        };
    } else {
        throw new Error('Invalid email or password');
    }
};

const forgotPassword = async (email) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new Error('User not found');
    }

    const pin = generatePin();
    const pinExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.resetPasswordPin = pin;
    user.resetPinExpiresAt = pinExpiresAt;
    await user.save();

    await emailService.sendVerificationCode(user.email, pin);

    return {
        success: true,
        message: "Reset code sent to email"
    };
};

const verifyResetPin = async (email, pin) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new Error('User not found');
    }

    if (!user.resetPasswordPin || user.resetPasswordPin !== pin) {
        throw new Error('Invalid PIN');
    }

    if (user.resetPinExpiresAt < Date.now()) {
        throw new Error('PIN expired');
    }

    return {
        success: true,
        message: "PIN verified successfully"
    };
};

const resetPassword = async (email, pin, newPassword) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new Error('User not found');
    }

    if (!user.resetPasswordPin || user.resetPasswordPin !== pin) {
        throw new Error('Invalid PIN');
    }

    if (user.resetPinExpiresAt < Date.now()) {
        throw new Error('PIN expired');
    }

    user.password = newPassword;
    user.resetPasswordPin = undefined;
    user.resetPinExpiresAt = undefined;
    await user.save();

    return {
        success: true,
        message: "Password reset successfully"
    };
};

module.exports = {
    register,
    login,
    verifyPin,
    forgotPassword,
    verifyResetPin,
    resetPassword
};
