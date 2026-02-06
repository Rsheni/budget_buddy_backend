const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: `BudgetBuddy <${process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html,
    };

    await transporter.sendMail(mailOptions);
};

const sendVerificationCode = async (email, code) => {
    const message = `Your verification code for BudgetBuddy is: ${code}`;
    const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #00D09E;">Welcome to BudgetBuddy!</h2>
      <p>Thank you for signing up. Please use the following code to verify your email address:</p>
      <div style="font-size: 24px; font-weight: bold; color: #00D09E; padding: 10px; background: #f9f9f9; border-radius: 5px; display: inline-block;">
        ${code}
      </div>
      <p>This code will expire in 10 minutes.</p>
    </div>
  `;

    await sendEmail({
        email,
        subject: 'Email Verification Code',
        message,
        html,
    });
};

module.exports = { sendEmail, sendVerificationCode };
