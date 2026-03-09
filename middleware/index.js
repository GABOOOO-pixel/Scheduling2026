const isSchedule = require("./isSchedule");
const isStudent = require("./isStudent");
const isSubject = require("./isSubject");
const isTeacher = require("./isTeacher");
const isSection = require("./isSection");
const isRoom = require("./isRoom");
const isUser = require("./isUser");
const isFacultySchedule = require("./isFacultySchedule");
const { isAuth, isSuperAdmin, isAdmin, isFaculty, isGuest } = require("./isAuth");
const { isStudentAuth, isStudentGuest } = require("./isStudentAuth");

module.exports = {
  isSchedule,
  isStudent,
  isSubject,
  isTeacher,
  isSection,
  isRoom,
  isUser,
  isFacultySchedule,
  isAuth,
  isSuperAdmin,
  isAdmin,
  isFaculty,
  isGuest,
  isStudentAuth,
  isStudentGuest,
};
