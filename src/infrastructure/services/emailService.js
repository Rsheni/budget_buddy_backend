const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  console.log('Preparing to send email...');
  console.log('SMTP Config:', {
    host: process.env.BREVO_SMTP_HOST,
    port: process.env.BREVO_SMTP_PORT,
    user: process.env.BREVO_SMTP_USER,
    passLength: process.env.BREVO_SMTP_PASS ? process.env.BREVO_SMTP_PASS.length : 0
  });

  const transporter = nodemailer.createTransport({
    host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.BREVO_SMTP_PORT) || 587,
    secure: false, // true for 465, false for 587
    auth: {
      user: process.env.BREVO_SMTP_USER,
      pass: process.env.BREVO_SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false // Allow self-signed certs if necessary (dev mode)
    }
  });

  const mailOptions = {
    from: `BudgetBuddy <${process.env.EMAIL_FROM}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: %s', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Email sending failed');
  }
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
