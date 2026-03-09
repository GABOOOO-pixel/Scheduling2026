const isStudentAuth = (req, res, next) => {
  if (req.session && req.session.student) {
    return next();
  }
  req.session.error = "Please login first!";
  return res.redirect("/student-login");
};

const isStudentGuest = (req, res, next) => {
  if (req.session && req.session.student) {
    return res.redirect("/student-dashboard");
  }
  return next();
};

module.exports = { isStudentAuth, isStudentGuest };
