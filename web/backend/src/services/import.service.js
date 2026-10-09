const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const { User, Branch, Course, ExamSlot, CourseAssignment } = require('../models');

const KINDS = ['branches', 'courses', 'students', 'slots', 'registrations'];

const keyOf = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const pick = (row, names) => {
  const wanted = new Set(names.map(keyOf));
  for (const [key, value] of Object.entries(row)) {
    if (wanted.has(keyOf(key))) return String(value ?? '').trim();
  }
  return '';
};

const makePassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let out = 'Vu';
  for (let i = 0; i < 6; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
};

const parseSheet = (buffer) => {
  const book = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheet = book.Sheets[book.SheetNames[0]];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
};

const difficultyOf = (value) => {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'easy' || v === 'medium' || v === 'hard') return v;
  return 'medium';
};

const statusOf = (value, fallback = 'active') => {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'inactive' || v === 'disabled') return 'inactive';
  if (v === 'active' || v === 'enabled') return 'active';
  return fallback;
};

const previewRow = (kind, raw) => {
  if (kind === 'branches') {
    const row = {
      name: pick(raw, ['name', 'branch', 'branchname']),
      code: pick(raw, ['code', 'branchcode']).toUpperCase(),
      city: pick(raw, ['city']),
      address: pick(raw, ['address']),
      contactNumber: pick(raw, ['contact', 'contactnumber', 'phone']),
      status: statusOf(pick(raw, ['status'])),
    };
    const issues = [];
    if (!row.name) issues.push('Name is required');
    if (!row.code) issues.push('Code is required');
    return { ...row, ok: issues.length === 0, message: issues.join('. ') };
  }

  if (kind === 'courses') {
    const credits = pick(raw, ['credithours', 'credits', 'credit']);
    const row = {
      courseCode: pick(raw, ['coursecode', 'code']).toUpperCase(),
      title: pick(raw, ['title', 'name', 'course']),
      creditHours: credits || '3',
      department: pick(raw, ['department', 'discipline']),
      difficulty: difficultyOf(pick(raw, ['difficulty', 'level'])),
      status: statusOf(pick(raw, ['status'])),
    };
    const issues = [];
    if (!row.courseCode) issues.push('Course code is required');
    if (!row.title) issues.push('Title is required');
    if (!Number(row.creditHours)) issues.push('Credit hours must be a number');
    return { ...row, ok: issues.length === 0, message: issues.join('. ') };
  }

  if (kind === 'students') {
    const given = pick(raw, ['password', 'pass']);
    const row = {
      fullName: pick(raw, ['name', 'fullname', 'student']),
      registrationNumber: pick(raw, ['roll', 'rollno', 'registrationnumber', 'regno']),
      program: pick(raw, ['discipline', 'program', 'degree']),
      semester: pick(raw, ['semester', 'sem']),
      branch: pick(raw, ['branch', 'branchcode', 'centre', 'center']),
      email: pick(raw, ['email', 'mail']).toLowerCase(),
      password: given || makePassword(),
    };
    const issues = [];
    if (!row.fullName) issues.push('Name is required');
    if (!row.email || !row.email.includes('@')) issues.push('A valid email is required');
    if (!row.registrationNumber) issues.push('Roll number is required');
    if (row.password.length < 4) issues.push('Password must be at least 4 characters');
    return { ...row, ok: issues.length === 0, message: issues.join('. ') };
  }

  if (kind === 'registrations') {
    const row = {
      studentName: pick(raw, ['student', 'name', 'fullname']),
      email: pick(raw, ['email', 'mail']).toLowerCase(),
      registrationNumber: pick(raw, ['roll', 'rollno', 'registrationnumber', 'regno']),
      courseCode: pick(raw, ['coursecode', 'code']).toUpperCase(),
      title: pick(raw, ['title', 'course']),
    };
    const issues = [];
    if (!row.email && !row.registrationNumber) issues.push('Email or roll is required');
    if (!row.courseCode) issues.push('Course code is required');
    return { ...row, ok: issues.length === 0, message: issues.join('. ') };
  }

  const row = {
    courseCode: pick(raw, ['coursecode', 'course', 'code']).toUpperCase(),
    date: pick(raw, ['date']),
    startTime: pick(raw, ['starttime', 'start', 'time']),
    endTime: pick(raw, ['endtime', 'end']),
    capacity: pick(raw, ['capacity', 'seats']) || '30',
  };
  const issues = [];
  if (!row.courseCode) issues.push('Course code is required');
  if (!row.date || Number.isNaN(new Date(row.date).getTime())) issues.push('A valid date is required');
  if (!row.startTime) issues.push('Start time is required');
  if (row.endTime && row.endTime <= row.startTime) issues.push('End time must be after start time');
  if (!Number(row.capacity) || Number(row.capacity) < 1) issues.push('Capacity must be at least 1');
  return { ...row, ok: issues.length === 0, message: issues.join('. ') };
};

const findBranch = (value) => {
  const text = String(value || '').trim();
  if (!text) return null;
  const safe = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return Branch.findOne({
    $or: [{ code: text.toUpperCase() }, { name: new RegExp(`^${safe}$`, 'i') }],
  });
};

const previewImport = async (kind, buffer) => {
  if (!KINDS.includes(kind)) {
    const error = new Error('Unknown import type');
    error.status = 400;
    throw error;
  }
  const rawRows = parseSheet(buffer);
  if (!rawRows.length) {
    const error = new Error('The file has no data rows');
    error.status = 400;
    throw error;
  }
  const rows = rawRows.map((raw, index) => ({ index: index + 2, ...previewRow(kind, raw) }));
  if (kind === 'students') {
    for (const row of rows) {
      if (!row.ok || !row.branch) continue;
      const branch = await findBranch(row.branch);
      if (!branch) {
        row.ok = false;
        row.message = [row.message, `Branch ${row.branch} was not found`].filter(Boolean).join('. ');
      } else {
        row.branchName = branch.name;
        row.branchId = branch._id.toString();
      }
    }
  }
  if (kind === 'registrations') {
    const extra = new Map();
    const current = new Map();
    for (const row of rows) {
      if (!row.ok) continue;
      const ors = [];
      if (row.email) ors.push({ email: row.email });
      if (row.registrationNumber) ors.push({ registrationNumber: row.registrationNumber });
      const student = await User.findOne({ role: 'STUDENT', $or: ors });
      if (!student) {
        row.ok = false;
        row.message = 'Student was not found. Upload students first.';
        continue;
      }
      const course = await Course.findOne({ courseCode: row.courseCode });
      if (!course) {
        row.ok = false;
        row.message = `Course ${row.courseCode} was not found. Upload courses first.`;
        continue;
      }
      row.studentId = student._id.toString();
      row.studentName = student.fullName;
      row.email = student.email;
      row.registrationNumber = student.registrationNumber || row.registrationNumber;
      row.courseId = course._id.toString();
      row.title = course.title;
      if (student.dateSheetSaved) {
        row.ok = false;
        row.message = 'Date sheet is already saved';
        continue;
      }
      const already = await CourseAssignment.findOne({ student: student._id, course: course._id });
      if (already) {
        row.message = 'Already registered';
        continue;
      }
      const key = row.studentId;
      if (!current.has(key)) current.set(key, await CourseAssignment.countDocuments({ student: student._id }));
      const next = (extra.get(key) || 0) + 1;
      if (current.get(key) + next > 6) {
        row.ok = false;
        row.message = 'Maximum 6 courses';
        continue;
      }
      extra.set(key, next);
    }
  }
  return { kind, rows, ready: rows.filter((row) => row.ok).length, blocked: rows.filter((row) => !row.ok).length };
};

const commitStudents = async (rows) => {
  const results = [];
  for (const row of rows) {
    if (!row.ok) {
      results.push({ index: row.index, status: 'skipped', message: row.message });
      continue;
    }
    const existing = await User.findOne({
      $or: [{ email: row.email }, { registrationNumber: row.registrationNumber }],
    });
    const branch = row.branchId
      ? await Branch.findById(row.branchId)
      : await findBranch(row.branch);
    if (row.branch && !branch) {
      results.push({ index: row.index, status: 'skipped', message: `Branch ${row.branch} was not found` });
      continue;
    }
    const fields = {
      fullName: row.fullName,
      email: row.email,
      registrationNumber: row.registrationNumber,
      program: row.program,
      semester: row.semester,
      selectedBranch: branch ? branch._id : null,
      password: await bcrypt.hash(row.password, 10),
      pendingPassword: row.password,
      passwordSent: false,
      role: 'STUDENT',
      isVerified: true,
    };
    try {
      if (existing) {
        if (existing.role === 'ADMIN') {
          results.push({ index: row.index, status: 'skipped', message: 'That email belongs to an admin' });
          continue;
        }
        Object.assign(existing, fields);
        await existing.save();
        results.push({ index: row.index, status: 'created', message: 'Updated' });
        continue;
      }
      await User.create(fields);
      results.push({ index: row.index, status: 'created', message: 'Created' });
    } catch (err) {
      results.push({ index: row.index, status: 'skipped', message: err.code === 11000 ? 'Duplicate value' : 'Could not create student' });
    }
  }
  return results;
};

const commitBranches = async (rows) => {
  const results = [];
  for (const row of rows) {
    if (!row.ok) {
      results.push({ index: row.index, status: 'skipped', message: row.message });
      continue;
    }
    try {
      await Branch.findOneAndUpdate(
        { code: row.code },
        {
          name: row.name,
          code: row.code,
          city: row.city || '—',
          address: row.address,
          contactNumber: row.contactNumber,
          status: row.status,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      results.push({ index: row.index, status: 'created', message: 'Saved' });
    } catch (err) {
      results.push({ index: row.index, status: 'skipped', message: 'Could not save branch' });
    }
  }
  return results;
};

const commitCourses = async (rows) => {
  const results = [];
  for (const row of rows) {
    if (!row.ok) {
      results.push({ index: row.index, status: 'skipped', message: row.message });
      continue;
    }
    try {
      await Course.findOneAndUpdate(
        { courseCode: row.courseCode },
        {
          courseCode: row.courseCode,
          title: row.title,
          creditHours: Number(row.creditHours),
          department: row.department,
          difficulty: row.difficulty || 'medium',
          status: row.status,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      results.push({ index: row.index, status: 'created', message: 'Saved' });
    } catch (err) {
      results.push({ index: row.index, status: 'skipped', message: 'Could not save course' });
    }
  }
  return results;
};

const commitSlots = async (rows) => {
  const results = [];
  for (const row of rows) {
    if (!row.ok) {
      results.push({ index: row.index, status: 'skipped', message: row.message });
      continue;
    }
    const course = await Course.findOne({ courseCode: row.courseCode });
    if (!course) {
      results.push({ index: row.index, status: 'skipped', message: `Course ${row.courseCode} was not found` });
      continue;
    }
    const date = new Date(row.date);
    try {
      await ExamSlot.findOneAndUpdate(
        { course: course._id, date, startTime: row.startTime },
        {
          $set: {
            endTime: row.endTime || undefined,
            capacity: Number(row.capacity),
          },
          $setOnInsert: {
            course: course._id,
            date,
            startTime: row.startTime,
            booked: 0,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      results.push({ index: row.index, status: 'created', message: 'Saved' });
    } catch (err) {
      results.push({ index: row.index, status: 'skipped', message: 'Could not save slot' });
    }
  }
  return results;
};

const commitRegistrations = async (rows) => {
  const results = [];
  for (const row of rows) {
    if (!row.ok) {
      results.push({ index: row.index, status: 'skipped', message: row.message });
      continue;
    }
    if (!row.studentId || !row.courseId) {
      results.push({ index: row.index, status: 'skipped', message: 'Student or course was not found' });
      continue;
    }
    try {
      const count = await CourseAssignment.countDocuments({ student: row.studentId });
      const existing = await CourseAssignment.findOne({ student: row.studentId, course: row.courseId });
      if (!existing && count >= 6) {
        results.push({ index: row.index, status: 'skipped', message: 'Maximum 6 courses' });
        continue;
      }
      await CourseAssignment.findOneAndUpdate(
        { student: row.studentId, course: row.courseId },
        { student: row.studentId, course: row.courseId },
        { upsert: true, setDefaultsOnInsert: true }
      );
      results.push({ index: row.index, status: 'created', message: existing ? 'Already registered' : 'Registered' });
    } catch (err) {
      results.push({ index: row.index, status: 'skipped', message: err.code === 11000 ? 'Already registered' : 'Could not register course' });
    }
  }
  return results;
};

const commitImport = async (kind, rows) => {
  if (!KINDS.includes(kind)) {
    const error = new Error('Unknown import type');
    error.status = 400;
    throw error;
  }
  if (!Array.isArray(rows) || !rows.length) {
    const error = new Error('Nothing to import');
    error.status = 400;
    throw error;
  }
  const runners = {
    branches: commitBranches,
    courses: commitCourses,
    students: commitStudents,
    slots: commitSlots,
    registrations: commitRegistrations,
  };
  const results = await runners[kind](rows);
  return {
    created: results.filter((item) => item.status === 'created').length,
    skipped: results.filter((item) => item.status !== 'created').length,
    results,
  };
};

const issueStudentPassword = () => makePassword();

module.exports = { previewImport, commitImport, issueStudentPassword, KINDS };
