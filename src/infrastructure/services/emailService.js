const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.BREVO_SMTP_HOST,
    port: process.env.BREVO_SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASS
    }
});

const sendGroupInvitationEmail = async (toEmail, adminName, groupName) => {
    try {
        const mailOptions = {
            from: `"BudgetBuddy" <${process.env.EMAIL_FROM || 'no-reply@budgetbuddy.com'}>`,
            to: toEmail,
            subject: `${adminName} invited you to join '${groupName}'`,
            html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #F9FAFB; margin: 0; padding: 20px; color: #1F2937; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 24px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
        .logo-container { text-align: center; margin-bottom: 20px; }
        .logo-icon { background: #00E5FF; padding: 6px 10px; border-radius: 8px; display: inline-block; font-weight: bold; margin-right: 10px; }
        .logo-text { font-size: 18px; font-weight: bold; color: #1F2937; display: inline-block; vertical-align: middle; }
        .banner { width: 100%; height: 160px; object-fit: cover; border-radius: 12px; margin-bottom: 24px; }
        .title { font-size: 22px; font-weight: 900; text-align: center; margin-bottom: 15px; }
        .description { font-size: 14px; color: #4B5563; text-align: center; line-height: 1.5; margin-bottom: 25px; }
        .cyan-text { color: #00E5FF; font-weight: bold; }
        .cta-button { display: block; background: #00E5FF; color: #1F2937; text-align: center; padding: 16px; border-radius: 30px; text-decoration: none; font-weight: bold; margin-bottom: 30px; box-shadow: 0 4px 6px -1px rgba(0, 229, 255, 0.3); }
        .features-title { font-size: 16px; font-weight: bold; margin-bottom: 15px; }
        .feature-item { margin-bottom: 12px; font-size: 14px; color: #4B5563; }
        .check { background: #00E5FF; color: #1F2937; width: 20px; height: 20px; border-radius: 4px; display: inline-block; text-align: center; line-height: 20px; margin-right: 12px; font-size: 12px; font-weight: bold; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #F3F4F6; text-align: center; }
        .footer-text { font-size: 11px; color: #9CA3AF; margin-bottom: 10px; }
        .footer-links { margin-bottom: 15px; font-size: 11px; color: #D1D5DB; }
        .footer-links a { color: #00E5FF; text-decoration: none; font-weight: bold; }
        .copyright { font-size: 10px; color: #D1D5DB; font-weight: bold; letter-spacing: 1px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo-container">
            <span class="logo-icon">B</span>
            <span class="logo-text">BudgetBuddy</span>
        </div>
        <img class="banner" src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Group Banner" />
        <h1 class="title">Join ${adminName} in the '${groupName}' group</h1>
        <p class="description">
            You've been invited to join the <span class="cyan-text">${groupName}</span> group on BudgetBuddy. 
            Start tracking shared expenses and settling debts easily.
        </p>
        <a href="https://budgetbuddy.example.com" class="cta-button">Join Group & Download App</a>
        
        <h2 class="features-title">With BudgetBuddy, you can:</h2>
        <div class="feature-item"><span class="check">✓</span>Track shared expenses in real-time</div>
        <div class="feature-item"><span class="check">✓</span>Settle debts with one click</div>
        <div class="feature-item"><span class="check">✓</span>Stay on top of your group budget</div>
        
        <div class="footer">
            <p class="footer-text">You received this email because ${adminName} invited you to BudgetBuddy.</p>
            <div class="footer-links">
                <a href="#">Help Center</a> | <a href="#">Unsubscribe</a>
            </div>
            <p class="copyright">© 2024 BUDGETBUDDY INC.</p>
        </div>
    </div>
</body>
</html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent: " + info.response);
        return info;
    } catch (error) {
        console.error("Error sending email:", error);
    }
};

module.exports = {
    sendGroupInvitationEmail
};
