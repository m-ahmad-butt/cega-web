const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const {
  User, Branch, Course, CourseAssignment, ExamSlot, DateSheetSelection, ChangeRequest,
  formatDoc, formatDocs,
} = require('../models');
const emailService = require('../services/email.service');
const { extractCnicFields } = require('../services/cnicOcr.service');
const importService = require('../services/import.service');

// ── Helpers ──

const paginate = async (Model, filter, { page = 1, pageSize = 10, sort = { createdAt: -1 }, populate = null }) => {
  page = Math.max(1, parseInt(page, 10) || 1);
  pageSize = Math.max(1, Math.min(100, parseInt(pageSize, 10) || 10));
  const total = await Model.countDocuments(filter);
  let query = Model.find(filter).sort(sort).skip((page - 1) * pageSize).limit(pageSize);
  if (populate) query = query.populate(populate);
  const docs = await query.lean();
  return {
    data: formatDocs(docs),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
};

// ═══════════════════════════════════════════
// BRANCH CRUD
// ═══════════════════════════════════════════

const listBranches = async (req, res) => {
  try {
    const { page, pageSize, search } = req.query;
    const filter = {};
    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [{ name: regex }, { code: regex }, { city: regex }];
    }
    const result = await paginate(Branch, filter, { page, pageSize });
    res.status(200).json(result);
  } catch (error) {
    console.error('listBranches error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createBranch = async (req, res) => {
  try {
    const { name, code, city, address, contactNumber, status } = req.body;
    if (!name || !code || !city) {
      return res.status(400).json({ message: 'name, code, and city are required' });
    }
    const branch = await Branch.create({ name, code, city, address, contactNumber, status });
    res.status(201).json({ message: 'Branch created', data: formatDoc(branch) });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'Branch code already exists' });
    console.error('createBranch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getBranch = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id).lean();
    if (!branch) return res.status(404).json({ message: 'Branch not found' });
    res.status(200).json({ data: formatDoc(branch) });
  } catch (error) {
    console.error('getBranch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateBranch = async (req, res) => {
  try {
    const branch = await Branch.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
    if (!branch) return res.status(404).json({ message: 'Branch not found' });
    res.status(200).json({ message: 'Branch updated', data: formatDoc(branch) });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'Branch code already exists' });
    console.error('updateBranch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteBranch = async (req, res) => {
  try {
    const studentsUsing = await User.countDocuments({ selectedBranch: req.params.id });
    if (studentsUsing > 0) {
      return res.status(400).json({ message: 'Cannot delete branch that is selected by students' });
    }
    const branch = await Branch.findByIdAndDelete(req.params.id);
    if (!branch) return res.status(404).json({ message: 'Branch not found' });
    res.status(200).json({ message: 'Branch deleted' });
  } catch (error) {
    console.error('deleteBranch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ═══════════════════════════════════════════
// COURSE CRUD
// ═══════════════════════════════════════════

const listCourses = async (req, res) => {
  try {
    const { page, pageSize, search, department } = req.query;
    const filter = {};
    if (department) filter.department = department;
    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [{ courseCode: regex }, { title: regex }, { department: regex }];
    }
    const result = await paginate(Course, filter, { page, pageSize });
    res.status(200).json(result);
  } catch (error) {
    console.error('listCourses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createCourse = async (req, res) => {
  try {
    const { courseCode, title, creditHours, department, difficulty, status } = req.body;
    if (!courseCode || !title || creditHours == null) {
      return res.status(400).json({ message: 'courseCode, title, and creditHours are required' });
    }
    const level = ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium';
    const courseStatus = String(status || 'active').toLowerCase() === 'inactive' ? 'inactive' : 'active';
    const course = await Course.create({
      courseCode, title, creditHours, department, difficulty: level, status: courseStatus,
    });
    res.status(201).json({ message: 'Course created', data: formatDoc(course) });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'Course code already exists' });
    console.error('createCourse error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).lean();
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.status(200).json({ data: formatDoc(course) });
  } catch (error) {
    console.error('getCourse error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.status(200).json({ message: 'Course updated', data: formatDoc(course) });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'Course code already exists' });
    console.error('updateCourse error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteCourse = async (req, res) => {
  try {
    const assignments = await CourseAssignment.countDocuments({ course: req.params.id });
    const slots = await ExamSlot.countDocuments({ course: req.params.id });
    if (assignments > 0 || slots > 0) {
      return res.status(400).json({ message: 'Cannot delete course that has assignments or exam slots' });
    }
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.status(200).json({ message: 'Course deleted' });
  } catch (error) {
    console.error('deleteCourse error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ═══════════════════════════════════════════
// STUDENT CRUD
// ═══════════════════════════════════════════

const listStudents = async (req, res) => {
  try {
    const { page, pageSize, search } = req.query;
    const filter = { role: 'STUDENT' };
    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [{ fullName: regex }, { email: regex }, { registrationNumber: regex }];
    }
    const result = await paginate(User, filter, { page, pageSize, populate: 'selectedBranch' });
    result.data = result.data.map(({ password, passwordSetupToken, passwordSetupExpiry, pendingPassword, selectedBranch, ...u }) => ({
      ...u,
      branch: selectedBranch
        ? { id: String(selectedBranch._id || selectedBranch.id), name: selectedBranch.name, code: selectedBranch.code }
        : null,
    }));
    res.status(200).json(result);
  } catch (error) {
    console.error('listStudents error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createStudent = async (req, res) => {
  try {
    const {
      email, fullName, phone, cnic, dob, gender, address,
      fatherName, parentCnic, parentOccupation, parentContact, emergencyContact,
      registrationNumber, program, semester, session,
      previousQualification, previousInstitute, previousMarks,
    } = req.body;

    if (!email || !fullName) {
      return res.status(400).json({ message: 'email and fullName are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already exists' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const tempPassword = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);

    const student = await User.create({
      email, fullName, phone, cnic, dob, gender, address,
      fatherName, parentCnic, parentOccupation, parentContact, emergencyContact,
      registrationNumber, program, semester, session,
      previousQualification, previousInstitute, previousMarks,
      password: tempPassword,
      role: 'STUDENT',
      isVerified: false,
      passwordSetupToken: token,
      passwordSetupExpiry: expiry,
    });

    const setupLink = `${process.env.FRONTEND_URL}/setup-password/${token}`;
    try {
      await emailService.sendPasswordSetup(email, fullName, setupLink);
    } catch (err) {
      console.error('[Email] Password setup email failed:', err.message);
    }

    const { password, passwordSetupToken, passwordSetupExpiry, ...safe } = formatDoc(student);
    res.status(201).json({ message: 'Student created', data: safe });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'Duplicate field value (email or registration number)' });
    console.error('createStudent error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getStudent = async (req, res) => {
  try {
    const student = await User.findById(req.params.id).populate('selectedBranch').lean();
    if (!student || student.role !== 'STUDENT') {
      return res.status(404).json({ message: 'Student not found' });
    }
    const assignments = await CourseAssignment.find({ student: req.params.id }).populate('course').lean();
    const { password, passwordSetupToken, passwordSetupExpiry, ...safe } = formatDoc(student);
    safe.assignments = formatDocs(assignments);
    res.status(200).json({ data: safe });
  } catch (error) {
    console.error('getStudent error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateStudent = async (req, res) => {
  try {
    const { password, passwordSetupToken, passwordSetupExpiry, role, ...updateData } = req.body;
    const student = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'STUDENT' },
      updateData,
      { new: true }
    ).lean();
    if (!student) return res.status(404).json({ message: 'Student not found' });
    const { password: pw, passwordSetupToken: pst, passwordSetupExpiry: pse, ...safe } = formatDoc(student);
    res.status(200).json({ message: 'Student updated', data: safe });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'Duplicate field value' });
    console.error('updateStudent error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteStudent = async (req, res) => {
  try {
    const student = await User.findOneAndDelete({ _id: req.params.id, role: 'STUDENT' });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    await CourseAssignment.deleteMany({ student: req.params.id });
    await DateSheetSelection.deleteMany({ student: req.params.id });
    await ChangeRequest.deleteMany({ student: req.params.id });
    res.status(200).json({ message: 'Student deleted' });
  } catch (error) {
    console.error('deleteStudent error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ═══════════════════════════════════════════
// COURSE ASSIGNMENT
// ═══════════════════════════════════════════

const getStudentAssignments = async (req, res) => {
  try {
    const assignments = await CourseAssignment.find({ student: req.params.id }).populate('course').lean();
    res.status(200).json({ data: formatDocs(assignments) });
  } catch (error) {
    console.error('getStudentAssignments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const assignCourse = async (req, res) => {
  try {
    const { studentId, courseId } = req.body;
    if (!studentId || !courseId) {
      return res.status(400).json({ message: 'studentId and courseId are required' });
    }

    const student = await User.findOne({ _id: studentId, role: 'STUDENT' });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const existing = await CourseAssignment.findOne({ student: studentId, course: courseId });
    if (existing) return res.status(400).json({ message: 'Course already assigned' });

    const currentCount = await CourseAssignment.countDocuments({ student: studentId });
    if (currentCount >= 6) return res.status(400).json({ message: 'Maximum 6 courses allowed' });

    if (student.dateSheetSaved) {
      return res.status(400).json({ message: 'Cannot assign courses after date sheet is saved' });
    }

    const assignment = await CourseAssignment.create({ student: studentId, course: courseId });
    res.status(201).json({ message: 'Course assigned', data: formatDoc(assignment) });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'Course already assigned' });
    console.error('assignCourse error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const removeAssignment = async (req, res) => {
  try {
    const assignment = await CourseAssignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    const student = await User.findById(assignment.student);
    if (student && student.dateSheetSaved) {
      return res.status(400).json({ message: 'Cannot remove assignment after date sheet is saved' });
    }

    const currentCount = await CourseAssignment.countDocuments({ student: assignment.student });
    if (currentCount > 1 && currentCount <= 4) {
      return res.status(400).json({ message: 'Minimum 4 courses required. Remove all or keep at least 4.' });
    }

    await CourseAssignment.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Assignment removed' });
  } catch (error) {
    console.error('removeAssignment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const bulkAssignCourses = async (req, res) => {
  try {
    const { studentId, courseIds } = req.body;
    if (!studentId || !courseIds || !Array.isArray(courseIds)) {
      return res.status(400).json({ message: 'studentId and courseIds[] are required' });
    }

    const student = await User.findOne({ _id: studentId, role: 'STUDENT' });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const existingCount = await CourseAssignment.countDocuments({ student: studentId });
    const totalAfter = existingCount + courseIds.length;
    if (totalAfter < 4 || totalAfter > 6) {
      return res.status(400).json({ message: `Total courses must be 4-6. Current: ${existingCount}, adding: ${courseIds.length}` });
    }

    const courses = await Course.find({ _id: { $in: courseIds } });
    if (courses.length !== courseIds.length) {
      return res.status(400).json({ message: 'One or more courses not found' });
    }

    const ops = courseIds.map(courseId => ({
      updateOne: {
        filter: { student: studentId, course: courseId },
        update: { student: studentId, course: courseId },
        upsert: true,
      },
    }));
    await CourseAssignment.bulkWrite(ops);

    const assignments = await CourseAssignment.find({ student: studentId }).populate('course').lean();
    res.status(201).json({ message: 'Courses assigned', data: formatDocs(assignments) });
  } catch (error) {
    console.error('bulkAssignCourses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ═══════════════════════════════════════════
// EXAM SLOT CRUD
// ═══════════════════════════════════════════

const listSlots = async (req, res) => {
  try {
    const { page, pageSize, courseId } = req.query;
    const filter = {};
    if (courseId) filter.course = courseId;
    const result = await paginate(ExamSlot, filter, { page, pageSize, populate: 'course' });
    res.status(200).json(result);
  } catch (error) {
    console.error('listSlots error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createSlot = async (req, res) => {
  try {
    const { courseId, date, startTime, endTime, capacity } = req.body;
    if (!courseId || !date || !startTime) {
      return res.status(400).json({ message: 'courseId, date, and startTime are required' });
    }

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    if (new Date(date) < new Date(new Date().toDateString())) {
      return res.status(400).json({ message: 'Date cannot be in the past' });
    }

    if (endTime && endTime <= startTime) {
      return res.status(400).json({ message: 'endTime must be after startTime' });
    }

    const duplicate = await ExamSlot.findOne({ course: courseId, date: new Date(date), startTime });
    if (duplicate) {
      return res.status(400).json({ message: 'Duplicate slot: same course, date, and start time' });
    }

    const slot = await ExamSlot.create({ course: courseId, date, startTime, endTime, capacity: capacity || 0 });
    res.status(201).json({ message: 'Exam slot created', data: formatDoc(slot) });
  } catch (error) {
    console.error('createSlot error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateSlot = async (req, res) => {
  try {
    const slot = await ExamSlot.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
    if (!slot) return res.status(404).json({ message: 'Exam slot not found' });
    res.status(200).json({ message: 'Exam slot updated', data: formatDoc(slot) });
  } catch (error) {
    console.error('updateSlot error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteSlot = async (req, res) => {
  try {
    const selections = await DateSheetSelection.countDocuments({ examSlot: req.params.id });
    if (selections > 0) {
      return res.status(400).json({ message: 'Cannot delete slot that has been chosen by students' });
    }
    const slot = await ExamSlot.findByIdAndDelete(req.params.id);
    if (!slot) return res.status(404).json({ message: 'Exam slot not found' });
    res.status(200).json({ message: 'Exam slot deleted' });
  } catch (error) {
    console.error('deleteSlot error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ═══════════════════════════════════════════
// CHANGE REQUESTS
// ═══════════════════════════════════════════

const listRequests = async (req, res) => {
  try {
    const { page, pageSize, status, type } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    const result = await paginate(ChangeRequest, filter, {
      page,
      pageSize,
      populate: { path: 'student', select: 'fullName email registrationNumber' },
    });
    res.status(200).json(result);
  } catch (error) {
    console.error('listRequests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const handleRequest = async (req, res) => {
  try {
    const { status, remark } = req.body;
    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'status must be APPROVED or REJECTED' });
    }

    const request = await ChangeRequest.findById(req.params.id).populate('student');
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status !== 'PENDING') {
      return res.status(400).json({ message: 'Request has already been processed' });
    }

    request.status = status;
    request.adminRemark = remark || null;

    if (status === 'APPROVED') {
      request.used = false;
      if (request.type === 'CHANGE_BRANCH') {
        await User.findByIdAndUpdate(request.student._id, { branchLocked: false, selectedBranch: null });
      } else if (request.type === 'CHANGE_DATESHEET') {
        await User.findByIdAndUpdate(request.student._id, { dateSheetSaved: false });
        await DateSheetSelection.deleteMany({ student: request.student._id });
      }
    }

    await request.save();

    try {
      await emailService.sendRequestStatus(
        request.student.email,
        request.student.fullName,
        request.type,
        status,
        remark
      );
    } catch (err) {
      console.error('[Email] Request status email failed:', err.message);
    }

    res.status(200).json({ message: `Request ${status.toLowerCase()}`, data: formatDoc(request.toObject()) });
  } catch (error) {
    console.error('handleRequest error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ═══════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════

const getDashboardStats = async (req, res) => {
  try {
    const monthsBack = 12;
    const trendStart = new Date();
    trendStart.setDate(1);
    trendStart.setHours(0, 0, 0, 0);
    trendStart.setMonth(trendStart.getMonth() - (monthsBack - 1));

    const [
      totalStudents,
      totalCourses,
      totalBranches,
      totalSlots,
      studentsWithDateSheet,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      studentMonths,
      requestMonths,
    ] = await Promise.all([
      User.countDocuments({ role: 'STUDENT' }),
      Course.countDocuments(),
      Branch.countDocuments(),
      ExamSlot.countDocuments(),
      User.countDocuments({ role: 'STUDENT', dateSheetSaved: true }),
      ChangeRequest.countDocuments({ status: 'PENDING' }),
      ChangeRequest.countDocuments({ status: 'APPROVED' }),
      ChangeRequest.countDocuments({ status: 'REJECTED' }),
      User.aggregate([
        { $match: { role: 'STUDENT', createdAt: { $gte: trendStart } } },
        { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, count: { $sum: 1 } } },
      ]),
      ChangeRequest.aggregate([
        { $match: { createdAt: { $gte: trendStart } } },
        { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, count: { $sum: 1 } } },
      ]),
    ]);

    const countFor = (rows, year, month) => {
      const hit = rows.find((row) => row._id.y === year && row._id.m === month);
      return hit ? hit.count : 0;
    };

    const trend = Array.from({ length: monthsBack }, (_, i) => {
      const point = new Date(trendStart);
      point.setMonth(trendStart.getMonth() + i);
      const year = point.getFullYear();
      const month = point.getMonth() + 1;
      return {
        label: point.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
        year,
        month,
        students: countFor(studentMonths, year, month),
        requests: countFor(requestMonths, year, month),
      };
    });

    res.status(200).json({
      data: {
        totalStudents,
        totalCourses,
        totalBranches,
        totalSlots,
        studentsWithDateSheet,
        studentsWithoutDateSheet: totalStudents - studentsWithDateSheet,
        pendingRequests,
        approvedRequests,
        rejectedRequests,
        trend,
      },
    });
  } catch (error) {
    console.error('getDashboardStats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const ocrCnic = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'CNIC image file is required (field: cnic)' });
    }
    const base64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype || 'image/jpeg';
    const fields = await extractCnicFields(base64, mimeType);
    res.status(200).json({ data: fields });
  } catch (error) {
    const detail = error.response?.data?.error?.message || error.message;
    console.error('ocrCnic error:', detail);
    res.status(502).json({ message: detail || 'CNIC OCR failed' });
  }
};

const resetStudentPassword = async (req, res) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: 'STUDENT' });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    const plain = importService.issueStudentPassword();
    student.password = await bcrypt.hash(plain, 10);
    student.isVerified = true;
    student.passwordSetupToken = null;
    student.passwordSetupExpiry = null;
    await student.save();
    let emailed = true;
    try {
      await emailService.sendAccountPassword(student.email, student.fullName, plain, true);
    } catch (err) {
      emailed = false;
      console.error('[Email] Reset password email failed:', err.message);
    }
    res.status(200).json({
      message: emailed ? 'Password reset and emailed' : 'Password reset. Email could not be sent',
      data: { password: plain, emailed },
    });
  } catch (error) {
    console.error('resetStudentPassword error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deliverStudentPasswords = async (req, res) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids.filter(Boolean) : [];
    const filter = { role: 'STUDENT' };
    if (ids.length) filter._id = { $in: ids };
    const students = await User.find(filter).select('+pendingPassword');
    let sent = 0;
    let reset = 0;
    const failed = [];

    for (const student of students) {
      const first = !student.passwordSent;
      const kept = first && student.pendingPassword;
      const plain = kept ? student.pendingPassword : importService.issueStudentPassword();
      if (!kept) student.password = await bcrypt.hash(plain, 10);
      student.pendingPassword = undefined;
      student.passwordSent = true;
      student.isVerified = true;
      student.passwordSetupToken = null;
      student.passwordSetupExpiry = null;
      await student.save();
      try {
        await emailService.sendAccountPassword(student.email, student.fullName, plain, !first);
        if (first) sent += 1;
        else reset += 1;
      } catch (err) {
        failed.push({ email: student.email, password: plain });
        console.error('[Email] Student password email failed:', err.message);
      }
    }

    const parts = [];
    if (sent) parts.push(`Sent ${sent} password${sent === 1 ? '' : 's'}`);
    if (reset) parts.push(`Reset ${reset} password${reset === 1 ? '' : 's'}`);
    if (failed.length) {
      const lines = failed.map((item) => `${item.email}: ${item.password}`).join('. ');
      parts.push(`Email failed for ${lines}`);
    }
    res.status(200).json({
      message: parts.join('. ') || 'No students to update',
      data: { sent, reset, failed: failed.length },
    });
  } catch (error) {
    console.error('deliverStudentPasswords error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const previewImport = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Upload a CSV or Excel file' });
    const data = await importService.previewImport(req.params.kind, req.file.buffer);
    res.status(200).json({ data });
  } catch (error) {
    console.error('previewImport error:', error);
    res.status(error.status || 400).json({ message: error.message || 'Could not read the file' });
  }
};

const commitImport = async (req, res) => {
  try {
    const data = await importService.commitImport(req.params.kind, req.body.rows);
    res.status(200).json({ message: `Saved ${data.created}`, data });
  } catch (error) {
    console.error('commitImport error:', error);
    res.status(error.status || 500).json({ message: error.message || 'Import failed' });
  }
};

module.exports = {
  listBranches, createBranch, getBranch, updateBranch, deleteBranch,
  listCourses, createCourse, getCourse, updateCourse, deleteCourse,
  listStudents, createStudent, getStudent, updateStudent, deleteStudent,
  getStudentAssignments, assignCourse, removeAssignment, bulkAssignCourses,
  listSlots, createSlot, updateSlot, deleteSlot,
  listRequests, handleRequest,
  getDashboardStats,
  ocrCnic,
  resetStudentPassword,
  deliverStudentPasswords,
  previewImport,
  commitImport,
};
