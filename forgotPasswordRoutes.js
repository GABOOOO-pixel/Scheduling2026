// =============================================
// Forgot / Reset Password Routes
// Add these to your main router file (e.g. routes/index.js or app.js)
// =============================================

const {
  getForgotPassword,
  postForgotPassword,
  getResetPassword,
  postResetPassword,
} = require("../controllers/forgotPasswordController");

const { isGuest } = require("../middleware/auth");

// Show forgot password form
router.get("/fg", isGuest, getForgotPassword);

// Handle forgot password form submission
router.post("/fg", isGuest, postForgotPassword);

// Show reset password form (via emailed link)
router.get("/reset-password/:token", getResetPassword);

// Handle reset password form submission
router.post("/reset-password/:token", postResetPassword);
