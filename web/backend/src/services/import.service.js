const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const { User, Branch, Course, ExamSlot } = require('../models');
const emailService = require('./email.service');

const KINDS = ['branches', 'courses', 'students', 'slots'];

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
      email: pick(raw, ['email', 'mail']).toLowerCase(),
      password: given || makePassword(),
      sendEmail: false,
    };
    const issues = [];
    if (!row.fullName) issues.push('Name is required');
    if (!row.email || !row.email.includes('@')) issues.push('A valid email is required');
    if (!row.registrationNumber) issues.push('Roll number is required');
    if (row.password.length < 4) issues.push('Password must be at least 4 characters');
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

const previewImport = (kind, buffer) => {
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
    if (existing) {
      results.push({ index: row.index, status: 'skipped', message: 'Email or roll number already exists' });
      continue;
    }
    try {
      await User.create({
        email: row.email,
        fullName: row.fullName,
        registrationNumber: row.registrationNumber,
        program: row.program,
        password: await bcrypt.hash(row.password, 10),
        role: 'STUDENT',
        isVerified: true,
      });
      let emailed = false;
      if (row.sendEmail) {
        try {
          await emailService.sendAccountPassword(row.email, row.fullName, row.password, false);
          emailed = true;
        } catch (err) {
          console.error('[Email] Import password email failed:', err.message);
        }
      }
      results.push({
        index: row.index,
        status: 'created',
        message: row.sendEmail ? (emailed ? 'Created and emailed' : 'Created. Email failed') : 'Created',
      });
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
