const bcrypt = require('bcryptjs');

const User = require("../model/User");
const Teacher = require("../model/Teacher");
const Student = require("../model/Student");
const { sendPasswordResetEmail } = require("../utils/mailer");

// Generate random temp password
const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pass = '';
  for (let i = 0; i < 10; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
};

// =============================================
// GET /fg  →  Show Forgot Password page
// =============================================
const getForgotPassword = (req, res) => {
  res.render("forgot-password", { title: "Forgot Password" });
};

// =============================================
// POST /fg  →  Handle Forgot Password form
// =============================================
const postForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    console.log('📧 Submitted email:', email);

    if (!email) {
      req.session.error = "Please enter your email address.";
      return res.redirect("/fg");
    }

    const successMsg = "If that email is registered, a temporary password has been sent. Please check your inbox.";
    const normalizedEmail = email.toLowerCase().trim();

    // ── Strategy 1: email directly on User (super_admin/admin) ────
    let user = await User.findOne({ email: normalizedEmail, isArchive: false });
    console.log('🔍 User by direct email:', user ? user.username : 'NOT FOUND');

    if (user) {
      const tempPass = generateTempPassword();
      console.log('🔑 Temp password (user):', tempPass);
      user.password = await bcrypt.hash(tempPass, 10);
      await user.save({ validateBeforeSave: false });
      await sendTempPasswordEmail(normalizedEmail, tempPass);
      console.log('✅ Temp password sent to user:', normalizedEmail);
      console.log('✅ Password hash saved:', user.password);
      req.session.success = successMsg;
      return res.redirect("/fg");
    }

    // ── Strategy 2: email on linked Teacher (faculty) ─────────────
    const teacher = await Teacher.findOne({ email: normalizedEmail, isArchive: false });
    console.log('🔍 Teacher found:', teacher ? teacher.fname : 'NOT FOUND');

    if (teacher) {
      const linkedUser = await User.findOne({ teacherId: teacher._id, isArchive: false });
      console.log('🔍 User via teacher:', linkedUser ? linkedUser.username : 'NOT FOUND');

      if (linkedUser) {
        const tempPass = generateTempPassword();
        console.log('🔑 Temp password (faculty):', tempPass);
        linkedUser.password = await bcrypt.hash(tempPass, 10);
        await linkedUser.save({ validateBeforeSave: false });
        await sendTempPasswordEmail(normalizedEmail, tempPass);
        console.log('✅ Temp password sent to faculty:', normalizedEmail);
        req.session.success = successMsg;
        return res.redirect("/fg");
      }
    }

    // ── Strategy 3: email on Student ──────────────────────────────
    const student = await Student.findOne({ email: normalizedEmail, isArchive: false });
    console.log('🔍 Student found:', student ? student.fname : 'NOT FOUND');

    if (student) {
      const tempPass = generateTempPassword();
      console.log('🔑 Temp password (student):', tempPass);
      student.password = await bcrypt.hash(tempPass, 10);
      await student.save({ validateBeforeSave: false });
      await sendTempPasswordEmail(normalizedEmail, tempPass, true);
      console.log('✅ Temp password sent to student:', normalizedEmail);
      req.session.success = successMsg;
      return res.redirect("/fg");
    }

    // ── Not found ──────────────────────────────────────────────────
    console.log('❌ No match found for:', normalizedEmail);
    req.session.success = successMsg;
    return res.redirect("/fg");

  } catch (err) {
    console.error("❌ Forgot password error:", err.message);
    req.session.error = "Something went wrong. Please try again.";
    return res.redirect("/fg");
  }
};

// ── Helper: send temp password email ──────────────────────────────
const sendTempPasswordEmail = async (toEmail, tempPass, isStudent = false) => {
  const loginUrl = isStudent ? '/student-login' : '/';
  await sendPasswordResetEmail(toEmail, tempPass, loginUrl);
};

module.exports = {
  getForgotPassword,
  postForgotPassword,
};