// =============================================
// isAuth - Check if user is logged in
// =============================================
const isAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  req.session.error = "Please login first!";
  return res.redirect("/");
};

// =============================================
// isSuperAdmin - Only super_admin access
// =============================================
const isSuperAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === "super_admin") {
    return next();
  }
  req.session.denied = "Access denied! Super Admin only.";
  return res.redirect("/");
};

// =============================================
// isAdmin - super_admin & admin access
// =============================================
const isAdmin = (req, res, next) => {
  if (
    req.session &&
    req.session.user &&
    (req.session.user.role === "super_admin" || req.session.user.role === "admin")
  ) {
    return next();
  }
  req.session.denied = "Access denied! Admin only.";
  return res.redirect("/");
};

// =============================================
// isFaculty - super_admin, admin & faculty access
// =============================================
const isFaculty = (req, res, next) => {
  if (
    req.session &&
    req.session.user &&
    ["super_admin", "admin", "faculty"].includes(req.session.user.role)
  ) {
    return next();
  }
  req.session.denied = "Access denied! Faculty only.";
  return res.redirect("/");
};

// =============================================
// isGuest - Only non-logged-in users (for login page)
// =============================================
const isGuest = (req, res, next) => {
  if (req.session && req.session.user) {
    return res.redirect("/");
  }
  return next();
};

module.exports = { isAuth, isSuperAdmin, isAdmin, isFaculty, isGuest };
