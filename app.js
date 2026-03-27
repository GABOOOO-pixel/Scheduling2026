require('dotenv').config();
const express = require('express');
const path = require('path');
const morgan = require('morgan');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo').default || require('connect-mongo');
const engine = require('ejs-mate');
const flash = require('connect-flash');
const { checkOverlap } = require('./scheduleOverlapHelper');
// bcrypt fallback — tries bcryptjs first, then bcrypt, then plain compare (dev only)
let bcrypt;
try {
  bcrypt = require('bcryptjs');
} catch {
  try {
    bcrypt = require('bcrypt');
  } catch {
    console.warn('⚠️ No bcrypt installed! Using plain text passwords (DEV ONLY)');
    bcrypt = {
      async hash(password) { return password; },
      async compare(password, hash) { return password === hash; }
    };
  }
}
const helmet = require('helmet');
const cors = require('cors');                              
const apiRoutes = require('./apiRoutes');                  

// =============================================
// MODELS
// =============================================
const Schedule = require('./model/Schedule');
const Student = require('./model/Student');
const Subject = require('./model/Subject');
const Teacher = require('./model/Teacher');
const Section = require('./model/Section');
const Room = require('./model/Room');
const User = require('./model/User');

// =============================================
// MIDDLEWARE
// =============================================
const {
  isSchedule, isStudent, isSubject, isTeacher,
  isSection, isRoom, isUser, isFacultySchedule,
  isAuth, isSuperAdmin, isAdmin, isFaculty, isGuest,
  isStudentAuth, isStudentGuest
} = require('./middleware');

const app = express();
const PORT = process.env.PORT || 1000;
process.env.TZ = "Asia/Manila";

// =============================================
// DATABASE CONNECTION
// =============================================
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ Schedule26 DB Access Granted');
    await mongoose.connection.db.collection('sessions').deleteMany({});
    console.log('🗑️ Old sessions cleared');
  })
  .catch(err => console.error('❌ Schedule26 DB Access Denied:', err));

// =============================================
// SESSION STORE
// =============================================
const store = MongoStore.create({
  mongoUrl: process.env.MONGO_URI,
  collectionName: 'sessions',
  touchAfter: 24 * 3600 // only update session once per 24hrs — fixes "touch" warning
});

store.on('error', (err) => console.error('❌ Session store error:', err));

// =============================================
// APP CONFIG
// =============================================
app.engine('ejs', engine);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// =============================================
// GLOBAL MIDDLEWARE
// =============================================
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());                                           
app.use('/api', apiRoutes);
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '0', etag: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'gabo2026',
  resave: false,
  saveUninitialized: false,
  store: store,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

app.use(flash());

// Helmet CSP
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://kit.fontawesome.com", "https://ka-f.fontawesome.com", "https://cdn.sheetjs.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://ka-f.fontawesome.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://ka-f.fontawesome.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      connectSrc: ["'self'", "https://ka-f.fontawesome.com", "https://cdn.jsdelivr.net"],
      objectSrc: ["'none'"],
      frameSrc: ["'self'"],
    }
  })
);

// No-cache headers
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Global res.locals — flash messages, user, active nav
app.use((req, res, next) => {
  res.locals.back = '';
  res.locals.active = '';
  res.locals.pageTitle = '';
  res.locals.error = req.session.error || null;
  res.locals.message = req.session.message || null;
  res.locals.warning = req.session.warning || null;
  res.locals.success = req.session.success || null;
  res.locals.denied = req.session.denied || null;
  res.locals.user = req.session.user || null;
  res.locals.student = req.session.student || null;

  // Clear after reading (flash-style)
  req.session.error = null;
  req.session.message = null;
  req.session.warning = null;
  req.session.success = null;
  req.session.denied = null;

  next();
});

const {
  getForgotPassword,
  postForgotPassword,
} = require('./controllers/forgotPasswordController');


// =============================================================================
//  PUBLIC ROUTES (No auth required)
// =============================================================================

// ---------- LOGIN PAGE ----------
app.get('/', isGuest, (req, res) => {
  return res.render('index', { title: 'Login' });
});

app.get('/test-db', async (req, res) => {
  const dbName = mongoose.connection.db.databaseName;
  const students = await Student.find({}).select('email fname').lean();
  return res.send(JSON.stringify({ dbName, students }, null, 2));
});

// ---------- /login redirect — in case any link/form points to /login ----------
app.get('/login', (req, res) => {
  return res.redirect('/');
});

// ---------- LOGIN POST ----------
app.post('/login', isGuest, async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, isArchive: false, status: 'active' });

    if (!user) {
      req.session.error = 'Invalid username or password!';
      return res.redirect('/');
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      req.session.error = 'Invalid username or password!';
      return res.redirect('/');
    }

    // Store user in session (exclude password, convert ObjectIds to strings)
    req.session.user = {
      _id: user._id.toString(),
      username: user.username,
      fname: user.fname,
      lname: user.lname,
      role: user.role,
      teacherId: user.teacherId ? user.teacherId.toString() : null
    };

    req.session.success = `Welcome back, ${user.fname}!`;
    return res.redirect('/dashboard');
  } catch (err) {
    console.error('❌ Login error:', err.message);
    req.session.error = 'Something went wrong. Try again.';
    return res.redirect('/');
  }
});

// ---------- LOGOUT ----------
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('❌ Logout error:', err);
    return res.redirect('/');
  });
});

app.get('/test-token-debug', async (req, res) => {
  const now = new Date();
  const nowWithOffset = new Date(Date.now() + 8 * 60 * 60 * 1000);
  
  const users = await User.find({ resetPasswordToken: { $ne: null } })
    .select('username resetPasswordToken resetPasswordExpires')
    .lean();
  const students = await Student.find({ resetPasswordToken: { $ne: null } })
    .select('fname resetPasswordToken resetPasswordExpires')
    .lean();

  return res.send(JSON.stringify({
    serverTimeNow: now,
    serverTimeWithOffset: nowWithOffset,
    users,
    students
  }, null, 2));
});

// ---------- FORGOT / RESET PASSWORD ----------
// ---------- FORGOT / RESET PASSWORD ----------
// ---------- FORGOT PASSWORD ----------
app.get('/fg', getForgotPassword);
app.post('/fg', postForgotPassword);

// ---------- STUDENT ONLINE FORM (Registration) ----------
app.get('/student-form', (req, res) => {
  return res.render('form', { title: 'Student Registration' });
});

app.post('/student-form', async (req, res) => {
  try {
    const { fname, mname, lname, suffix, email, contactNumber, address, studentNumber, yearLevel, studentType, semester, schoolYear, password, confirmPassword } = req.body;

    if (!password || password.length < 6) {
      req.session.error = 'Password must be at least 6 characters!';
      return res.redirect('/student-form');
    }

    if (password !== confirmPassword) {
      req.session.error = 'Passwords do not match!';
      return res.redirect('/student-form');
    }

    const exists = await Student.findOne({ studentNumber });
    if (exists) {
      req.session.error = 'Student number already exists!';
      return res.redirect('/student-form');
    }

    const emailExists = await Student.findOne({ email });
    if (emailExists) {
      req.session.error = 'Email already registered!';
      return res.redirect('/student-form');
    }

    const hashed = await bcrypt.hash(password, 10);

    await Student.create({
      fname, mname, lname, suffix, email, contactNumber, address,
      studentNumber, yearLevel: Number(yearLevel),
      studentType, semester: Number(semester), schoolYear,
      password: hashed
    });

    return res.render('success', { title: 'Registration Successful' });
  } catch (err) {
    console.error('❌ Student form error:', err.message);
    req.session.error = 'Failed to submit form. Please try again.';
    return res.redirect('/student-form');
  }
});


// =============================================================================
//  STUDENT PORTAL ROUTES
// =============================================================================

// ---------- STUDENT LOGIN PAGE ----------
app.get('/student-login', isStudentGuest, (req, res) => {
  return res.render('student-login', { title: 'Student Login' });
});

// ---------- STUDENT LOGIN POST ----------
// ---------- STUDENT LOGIN POST ----------
app.post('/student-login', isStudentGuest, async (req, res) => {
  try {
    const { studentNumber, password } = req.body;
    const student = await Student.findOne({ studentNumber, isArchive: false, status: 'active' });

    if (!student) {
      req.session.error = 'Invalid student number or password!';
      return res.redirect('/student-login');
    }

    // ← ADD THIS
    if (!student.password) {
      req.session.error = 'Invalid student number or password!';
      return res.redirect('/student-login');
    }

    const match = await bcrypt.compare(password, student.password);
    if (!match) {
      req.session.error = 'Invalid student number or password!';
      return res.redirect('/student-login');
    }

    req.session.student = {
      _id: student._id.toString(),
      studentNumber: student.studentNumber,
      fname: student.fname,
      mname: student.mname,
      lname: student.lname,
      suffix: student.suffix,
      email: student.email,
      yearLevel: student.yearLevel,
      studentType: student.studentType,
      semester: student.semester,
      schoolYear: student.schoolYear,
      sectionId: student.sectionId ? student.sectionId.toString() : null
    };

    req.session.success = `Welcome, ${student.fname}!`;
    return res.redirect('/student-dashboard');
  } catch (err) {
    console.error('❌ Student login error:', err.message);
    req.session.error = 'Something went wrong. Try again.';
    return res.redirect('/student-login');
  }
});

// ---------- STUDENT LOGOUT ----------
app.get('/student-logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('❌ Student logout error:', err);
    return res.redirect('/student-login');
  });
});

// ---------- STUDENT DASHBOARD ----------
app.get('/student-dashboard', isStudentAuth, async (req, res) => {
  try {
    const student = await Student.findById(req.session.student._id)
      .populate('sectionId')
      .lean();

    if (!student) {
      req.session.error = 'Student not found.';
      return res.redirect('/student-login');
    }

    let studentSchedules = [];
    if (student.sectionId) {
      studentSchedules = await Schedule.find({
        sectionId: student.sectionId._id,
        yearLevel: student.yearLevel,
        semester: student.semester,
        schoolYear: student.schoolYear,
        isArchive: false,
        status: 'active'
      })
        .populate('subjectId')
        .populate('teacherId')
        .populate('sectionId')
        .populate('roomId')
        .lean();
//
      const dayOrder = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7 };
      studentSchedules.sort((a, b) => (dayOrder[a.day] || 8) - (dayOrder[b.day] || 8) || a.timeFrom.localeCompare(b.timeFrom));
    }

    return res.render('student-dashboard', {
      title: 'Student Dashboard',
      student,
      studentSchedules
    });
  } catch (err) {
    console.error('❌ Student dashboard error:', err.message);
    req.session.error = 'Failed to load dashboard.';
    return res.redirect('/student-login');
  }
});


// =============================================================================
//  DASHBOARD
// =============================================================================

app.get('/dashboard', isAuth, isSchedule, isStudent, isSubject, isTeacher, isSection, isRoom, isUser, isFacultySchedule, (req, res) => {
  res.locals.active = 'dashboard';
  return res.render('home', { title: 'Dashboard', pageTitle: 'Dashboard' });
});


// =============================================================================
//  SCHEDULE ROUTES (Admin & Super Admin)
// =============================================================================

app.get('/schedule', isAuth, isAdmin, isSchedule, isSubject, isTeacher, isSection, isRoom, (req, res) => {
  res.locals.active = 'schedule';
  return res.render('schedule', { title: 'Schedules', pageTitle: 'Schedule Management' });
});

app.post('/schedule/add', isAuth, isAdmin, async (req, res) => {
  try {
    const { subjectId, teacherId, sectionId, roomId, day, timeFrom, timeTo, yearLevel, semester, schoolYear } = req.body;

    const conflicts = await checkOverlap({ subjectId, teacherId, sectionId, roomId, day, timeFrom, timeTo, semester, schoolYear });
    if (conflicts.length > 0) {
      req.session.error = conflicts.join(' | ');
      return res.redirect('/schedule');
    }

    await Schedule.create({
      subjectId, teacherId, sectionId,
      roomId: roomId || null,
      day, timeFrom, timeTo,
      yearLevel: Number(yearLevel),
      semester: Number(semester),
      schoolYear
    });
    req.session.success = 'Schedule added successfully!';
  } catch (err) {
    console.error('❌ Add schedule error:', err.message);
    req.session.error = 'Failed to add schedule.';
  }
  return res.redirect('/schedule');
});

app.post('/schedule/update/:id', isAuth, isAdmin, async (req, res) => {
  try {
    const { subjectId, teacherId, sectionId, roomId, day, timeFrom, timeTo, yearLevel, semester, schoolYear, status } = req.body;

    const conflicts = await checkOverlap({ subjectId, teacherId, sectionId, roomId, day, timeFrom, timeTo, semester, schoolYear, excludeId: req.params.id });
    if (conflicts.length > 0) {
      req.session.error = conflicts.join(' | ');
      return res.redirect(`/schedule/edit/${req.params.id}`);
    }

    await Schedule.findByIdAndUpdate(req.params.id, {
      subjectId, teacherId, sectionId,
      roomId: roomId || null,
      day, timeFrom, timeTo,
      yearLevel: Number(yearLevel),
      semester: Number(semester),
      schoolYear, status
    });
    req.session.success = 'Schedule updated successfully!';
  } catch (err) {
    console.error('❌ Update schedule error:', err.message);
    req.session.error = 'Failed to update schedule.';
  }
  return res.redirect('/schedule');
});

app.post('/schedule/update/:id', isAuth, isAdmin, async (req, res) => {
  try {
    const { subjectId, teacherId, sectionId, roomId, day, timeFrom, timeTo, yearLevel, semester, schoolYear, status } = req.body;
    await Schedule.findByIdAndUpdate(req.params.id, {
      subjectId, teacherId, sectionId,
      roomId: roomId || null,
      day, timeFrom, timeTo,
      yearLevel: Number(yearLevel),
      semester: Number(semester),
      schoolYear, status
    });
    req.session.success = 'Schedule updated successfully!';
  } catch (err) {
    console.error('❌ Update schedule error:', err.message);
    req.session.error = 'Failed to update schedule.';
  }
  return res.redirect('/schedule');
});

app.post('/schedule/delete/:id', isAuth, isAdmin, async (req, res) => {
  try {
    await Schedule.findByIdAndUpdate(req.params.id, { isArchive: true });
    req.session.success = 'Schedule archived successfully!';
  } catch (err) {
    req.session.error = 'Failed to archive schedule.';
  }
  return res.redirect('/schedule');
});


// =============================================================================
//  STUDENTS ROUTES (Admin & Super Admin)
// =============================================================================

app.get('/students', isAuth, isAdmin, isStudent, isSection, (req, res) => {
  res.locals.active = 'students';
  return res.render('students', { title: 'Students', pageTitle: 'Student Management' });
});

app.post('/students/assign-section/:id', isAuth, isAdmin, async (req, res) => {
  try {
    await Student.findByIdAndUpdate(req.params.id, { sectionId: req.body.sectionId });
    req.session.success = 'Section assigned successfully!';
  } catch (err) {
    req.session.error = 'Failed to assign section.';
  }
  return res.redirect('/students');
});

app.post('/students/delete/:id', isAuth, isAdmin, async (req, res) => {
  try {
    await Student.findByIdAndUpdate(req.params.id, { isArchive: true });
    req.session.success = 'Student archived successfully!';
  } catch (err) {
    req.session.error = 'Failed to archive student.';
  }
  return res.redirect('/students');
});


// =============================================================================
//  SUBJECTS ROUTES (Admin & Super Admin)
// =============================================================================

app.get('/subjects', isAuth, isAdmin, isSubject, (req, res) => {
  res.locals.active = 'subjects';
  return res.render('subjects', { title: 'Subjects', pageTitle: 'Subject Management' });
});

app.post('/subjects/add', isAuth, isAdmin, async (req, res) => {
  try {
    const { subjectCode, subjectName, units } = req.body;
    await Subject.create({ subjectCode, subjectName, units: Number(units) });
    req.session.success = 'Subject added successfully!';
  } catch (err) {
    console.error('❌ Add subject error:', err.message);
    req.session.error = err.code === 11000 ? 'Subject code already exists!' : 'Failed to add subject.';
  }
  return res.redirect('/subjects');
});

app.post('/subjects/update/:id', isAuth, isAdmin, async (req, res) => {
  try {
    const { subjectCode, subjectName, units, status } = req.body;
    await Subject.findByIdAndUpdate(req.params.id, { subjectCode, subjectName, units: Number(units), status });
    req.session.success = 'Subject updated successfully!';
  } catch (err) {
    req.session.error = err.code === 11000 ? 'Subject code already exists!' : 'Failed to update subject.';
  }
  return res.redirect('/subjects');
});

app.post('/subjects/delete/:id', isAuth, isAdmin, async (req, res) => {
  try {
    await Subject.findByIdAndUpdate(req.params.id, { isArchive: true });
    req.session.success = 'Subject archived successfully!';
  } catch (err) {
    req.session.error = 'Failed to archive subject.';
  }
  return res.redirect('/subjects');
});


// =============================================================================
//  TEACHERS ROUTES (Admin & Super Admin)
// =============================================================================

app.get('/teachers', isAuth, isAdmin, isTeacher, (req, res) => {
  res.locals.active = 'teachers';
  return res.render('teachers', { title: 'Teachers', pageTitle: 'Teacher Management' });
});

app.post('/teachers/add', isAuth, isAdmin, async (req, res) => {
  try {
    const { fname, mname, lname, department, email, contact } = req.body;
    await Teacher.create({ fname, mname, lname, department, email: email || undefined, contact });
    req.session.success = 'Teacher added successfully!';
  } catch (err) {
    console.error('❌ Add teacher error:', err.message);
    req.session.error = err.code === 11000 ? 'Email already exists!' : 'Failed to add teacher.';
  }
  return res.redirect('/teachers');
});

app.post('/teachers/update/:id', isAuth, isAdmin, async (req, res) => {
  try {
    const { fname, mname, lname, department, email, contact, status } = req.body;
    await Teacher.findByIdAndUpdate(req.params.id, { fname, mname, lname, department, email: email || undefined, contact, status });
    req.session.success = 'Teacher updated successfully!';
  } catch (err) {
    req.session.error = err.code === 11000 ? 'Email already exists!' : 'Failed to update teacher.';
  }
  return res.redirect('/teachers');
});

app.post('/teachers/delete/:id', isAuth, isAdmin, async (req, res) => {
  try {
    await Teacher.findByIdAndUpdate(req.params.id, { isArchive: true });
    req.session.success = 'Teacher archived successfully!';
  } catch (err) {
    req.session.error = 'Failed to archive teacher.';
  }
  return res.redirect('/teachers');
});


// =============================================================================
//  SECTIONS ROUTES (Admin & Super Admin)
// =============================================================================

app.get('/sections', isAuth, isAdmin, isSection, (req, res) => {
  res.locals.active = 'sections';
  return res.render('sections', { title: 'Sections', pageTitle: 'Section Management' });
});

app.post('/sections/add', isAuth, isAdmin, async (req, res) => {
  try {
    const { sectionName, yearLevel, program } = req.body;
    await Section.create({ sectionName, yearLevel: Number(yearLevel), program });
    req.session.success = 'Section added successfully!';
  } catch (err) {
    req.session.error = err.code === 11000 ? 'Section name already exists!' : 'Failed to add section.';
  }
  return res.redirect('/sections');
});

app.post('/sections/update/:id', isAuth, isAdmin, async (req, res) => {
  try {
    const { sectionName, yearLevel, program, status } = req.body;
    await Section.findByIdAndUpdate(req.params.id, { sectionName, yearLevel: Number(yearLevel), program, status });
    req.session.success = 'Section updated successfully!';
  } catch (err) {
    req.session.error = err.code === 11000 ? 'Section name already exists!' : 'Failed to update section.';
  }
  return res.redirect('/sections');
});

app.post('/sections/delete/:id', isAuth, isAdmin, async (req, res) => {
  try {
    await Section.findByIdAndUpdate(req.params.id, { isArchive: true });
    req.session.success = 'Section archived successfully!';
  } catch (err) {
    req.session.error = 'Failed to archive section.';
  }
  return res.redirect('/sections');
});


// =============================================================================
//  ROOMS ROUTES (Admin & Super Admin)
// =============================================================================

app.get('/rooms', isAuth, isAdmin, isRoom, (req, res) => {
  res.locals.active = 'rooms';
  return res.render('rooms', { title: 'Rooms', pageTitle: 'Room Management' });
});

app.post('/rooms/add', isAuth, isAdmin, async (req, res) => {
  try {
    const { roomNumber, building, capacity } = req.body;
    await Room.create({ roomNumber, building, capacity: capacity ? Number(capacity) : undefined });
    req.session.success = 'Room added successfully!';
  } catch (err) {
    req.session.error = err.code === 11000 ? 'Room number already exists!' : 'Failed to add room.';
  }
  return res.redirect('/rooms');
});

app.post('/rooms/update/:id', isAuth, isAdmin, async (req, res) => {
  try {
    const { roomNumber, building, capacity, status } = req.body;
    await Room.findByIdAndUpdate(req.params.id, { roomNumber, building, capacity: capacity ? Number(capacity) : undefined, status });
    req.session.success = 'Room updated successfully!';
  } catch (err) {
    req.session.error = err.code === 11000 ? 'Room number already exists!' : 'Failed to update room.';
  }
  return res.redirect('/rooms');
});

app.post('/rooms/delete/:id', isAuth, isAdmin, async (req, res) => {
  try {
    await Room.findByIdAndUpdate(req.params.id, { isArchive: true });
    req.session.success = 'Room archived successfully!';
  } catch (err) {
    req.session.error = 'Failed to archive room.';
  }
  return res.redirect('/rooms');
});


// =============================================================================
//  FACULTY ROUTES (Faculty view their schedule)
// =============================================================================

app.get('/my-schedule', isAuth, isFaculty, isFacultySchedule, (req, res) => {
  res.locals.active = 'my-schedule';
  return res.render('faculty-schedule', { title: 'My Schedule', pageTitle: 'My Teaching Schedule' });
});


// =============================================================================
//  USER ACCOUNTS ROUTES (Super Admin only)
// =============================================================================

app.get('/users', isAuth, isSuperAdmin, isUser, isTeacher, (req, res) => {
  res.locals.active = 'users';
  return res.render('users', { title: 'Users', pageTitle: 'User Accounts' });
});

app.post('/users/add', isAuth, isSuperAdmin, async (req, res) => {
  try {
    const { username, password, fname, lname, role, teacherId } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    await User.create({
      username, password: hashed, fname, lname, role,
      teacherId: teacherId || null
    });
    req.session.success = 'User account created successfully!';
  } catch (err) {
    console.error('❌ Add user error:', err.message);
    req.session.error = err.code === 11000 ? 'Username already exists!' : 'Failed to create user.';
  }
  return res.redirect('/users');
});

app.post('/users/update/:id', isAuth, isSuperAdmin, async (req, res) => {
  try {
    const { username, password, fname, lname, role, teacherId, status } = req.body;
    const updateData = {
      username, fname, lname, role, status,
      teacherId: teacherId || null
    };

    // Only update password if provided
    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10);
    }

    await User.findByIdAndUpdate(req.params.id, updateData);
    req.session.success = 'User updated successfully!';
  } catch (err) {
    req.session.error = err.code === 11000 ? 'Username already exists!' : 'Failed to update user.';
  }
  return res.redirect('/users');
});

app.post('/users/delete/:id', isAuth, isSuperAdmin, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isArchive: true });
    req.session.success = 'User archived successfully!';
  } catch (err) {
    req.session.error = 'Failed to archive user.';
  }
  return res.redirect('/users');
});


// =============================================================================
//  ARCHIVE ROUTES (Super Admin only)
// =============================================================================

app.get('/archive', isAuth, isSuperAdmin, async (req, res) => {
  try {
    const [archivedSchedules, archivedStudents, archivedSubjects, archivedTeachers, archivedSections, archivedRooms] = await Promise.all([
      Schedule.find({ isArchive: true }).populate('subjectId').populate('teacherId').populate('sectionId').populate('roomId').lean(),
      Student.find({ isArchive: true }).lean(),
      Subject.find({ isArchive: true }).lean(),
      Teacher.find({ isArchive: true }).lean(),
      Section.find({ isArchive: true }).lean(),
      Room.find({ isArchive: true }).lean(),
    ]);

    res.locals.active = 'archive';
    return res.render('archive', {
      title: 'Archives', pageTitle: 'Archived Records',
      archivedSchedules, archivedStudents, archivedSubjects,
      archivedTeachers, archivedSections, archivedRooms
    });
  } catch (err) {
    console.error('❌ Archive error:', err.message);
    req.session.error = 'Failed to load archives.';
    return res.redirect('/dashboard');
  }
});

app.post('/archive/restore/:model/:id', isAuth, isSuperAdmin, async (req, res) => {
  try {
    const models = {
      schedule: Schedule,
      student: Student,
      subject: Subject,
      teacher: Teacher,
      section: Section,
      room: Room,
    };
    const Model = models[req.params.model];
    if (!Model) throw new Error('Invalid model');

    await Model.findByIdAndUpdate(req.params.id, { isArchive: false });
    req.session.success = `${req.params.model.charAt(0).toUpperCase() + req.params.model.slice(1)} restored successfully!`;
  } catch (err) {
    req.session.error = 'Failed to restore record.';
  }
  return res.redirect('/archive');
});


// =============================================================================
//  PROFILE & CHANGE PASSWORD
// =============================================================================

// app.get('/profile', isAuth, (req, res) => {
//   res.locals.active = 'profile';
//   return res.render('profile', { title: 'Profile', pageTitle: 'My Profile' });
// });

app.get('/profile', isAuth, async (req, res) => {
  try {
    const fullUser = await User.findById(req.session.user._id)
      .populate('teacherId')
      .lean();

    console.log('🔍 fullUser:', JSON.stringify(fullUser, null, 2)); // ADD THIS

    res.locals.active = 'profile';
    return res.render('profile', { title: 'Profile', pageTitle: 'My Profile', fullUser });
  } catch (err) {
    console.error('❌ Profile error:', err.message);
    req.session.error = 'Failed to load profile.';
    return res.redirect('/dashboard');
  }
});

app.get('/fix-superadmin-email', async (req, res) => {
  const result = await User.updateOne(
    { _id: '69944d8a8ab52ae98bfa7f23' },
    { $set: { email: 'rgabrielayroso1@gmail.com' } }
  );
  return res.send('✅ Done: ' + JSON.stringify(result));
});

app.post('/profile/change-password', isAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
      req.session.error = 'New passwords do not match!';
      return res.redirect('/profile');
    }

    if (newPassword.length < 6) {
      req.session.error = 'Password must be at least 6 characters!';
      return res.redirect('/profile');
    }

    const user = await User.findById(req.session.user._id);
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      req.session.error = 'Current password is incorrect!';
      return res.redirect('/profile');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    req.session.success = 'Password changed successfully!';
    return res.redirect('/profile');
  } catch (err) {
    console.error('❌ Change password error:', err.message);
    req.session.error = 'Failed to change password.';
    return res.redirect('/profile');
  }
});

// ---------- STUDENT CHANGE PASSWORD ----------
app.post('/student/change-password', isStudentAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
      req.session.error = 'New passwords do not match!';
      return res.redirect('/student-dashboard');
    }
    if (newPassword.length < 6) {
      req.session.error = 'Password must be at least 6 characters!';
      return res.redirect('/student-dashboard');
    }

    const student = await Student.findById(req.session.student._id);
    const match = await bcrypt.compare(currentPassword, student.password);
    if (!match) {
      req.session.error = 'Current password is incorrect!';
      return res.redirect('/student-dashboard');
    }

    student.password = await bcrypt.hash(newPassword, 10);
    await student.save();

    req.session.success = 'Password changed successfully!';
    return res.redirect('/student-dashboard');
  } catch (err) {
    console.error('❌ Student change password error:', err.message);
    req.session.error = 'Failed to change password.';
    return res.redirect('/student-dashboard');
  }
});


// =============================================================================
//  SEED DEFAULT SUPER ADMIN (run once: visit /seed)
// =============================================================================

app.get('/seed', async (req, res) => {
  try {
    const exists = await User.findOne({ username: 'superadmin' });
    if (exists) {
      return res.send('Super admin already exists. Login: superadmin / Admin@123');
    }

    const hashed = await bcrypt.hash('Admin@123', 10);
    await User.create({
      username: 'superadmin',
      password: hashed,
      fname: 'Super',
      lname: 'Admin',
      role: 'super_admin'
    });

    return res.send('✅ Super admin created! Username: superadmin | Password: Admin@123');
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    return res.send('Failed to seed: ' + err.message);
  }
});


// =============================================================================
//  404 & ERROR HANDLERS
// =============================================================================

app.use((req, res) => {
  return res.status(404).render('404', { title: '404 - Not Found', error: 'Oops! Page cannot be found!' });
});

app.use((err, req, res, next) => {
  console.error('⚠️ Error:', err.message);
  return res.status(500).render('index', {
    title: 'Error',
    error: 'Something went wrong! ' + err.message
  });
});


// =============================================================================
//  START SERVER
// =============================================================================

app.listen(PORT,'0.0.0.0', () => {
  console.log(`🚀 Schedule26 running at http://localhost:${PORT}`);
});