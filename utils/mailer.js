const nodemailer = require("nodemailer");

console.log('MAIL_USER:', process.env.MAIL_USER);
console.log('MAIL_PASS:', process.env.MAIL_PASS ? 'EXISTS' : 'MISSING');

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// @param toEmail     - recipient
// @param tempPass    - generated temporary password
// @param loginPath   - '/student-login' or '/'
const sendPasswordResetEmail = async (toEmail, tempPass, loginPath = '/') => {
  const mailOptions = {
    from: `"CIT Schedule" <${process.env.MAIL_USER}>`,
    to: toEmail,
    subject: "Your Temporary Password – CIT Schedule",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f1f5f9; margin: 0; padding: 0; }
          .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
          .header { background: #052e16; padding: 32px 40px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; }
          .header h1 span { color: #f59e0b; }
          .body { padding: 36px 40px; }
          .body p { color: #475569; font-size: 14px; line-height: 1.7; margin: 0 0 16px; }
          .body p strong { color: #1e293b; }
          .temp-pass-box { background: #f0fdf4; border: 2px dashed #16a34a; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
          .temp-pass-box p { margin: 0 0 8px; color: #475569; font-size: 13px; }
          .temp-pass { font-size: 28px; font-weight: 800; color: #052e16; letter-spacing: 4px; }
          .note { background: #fef9ee; border: 1px solid #fde68a; border-radius: 10px; padding: 14px 18px; margin-top: 20px; }
          .note p { color: #92400e; font-size: 12.5px; margin: 0; }
          .footer { background: #f8fafc; padding: 20px 40px; text-align: center; }
          .footer p { color: #94a3b8; font-size: 12px; margin: 0; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="header">
            <h1><span>CIT</span> Schedule</h1>
          </div>
          <div class="body">
            <p>Hello,</p>
            <p>We received a password reset request for your <strong>CIT Schedule</strong> account. Here is your temporary password:</p>
            <div class="temp-pass-box">
              <p>Your temporary password</p>
              <div class="temp-pass">${tempPass}</div>
            </div>
            <div class="note">
              <p>⚠️ <strong>Please log in and change your password immediately</strong> after signing in. This temporary password will work until you change it.</p>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} CIT Schedule · Scheduling Management System</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Temp password email sent to:', toEmail);
    console.log('🔑 Temp password:', tempPass);
  } catch (err) {
    console.error('❌ Mailer error:', err.message);
    throw err;
  }
};

module.exports = { sendPasswordResetEmail };