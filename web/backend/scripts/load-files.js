const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { connectMongo } = require('../src/config/mongoose');
const {
  User, Branch, Course, CourseAssignment, ExamSlot, DateSheetSelection, ChangeRequest,
} = require('../src/models');

const dir = String(process.argv[2] || '').replace(/\r/g, '').trim();
if (!dir) {
  console.error('Usage: node scripts/load-files.js <csv-dir>');
  process.exit(1);
}

const parseCsv = (name) => {
  const text = fs.readFileSync(path.join(dir, name), 'utf8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const headers = lines[0].split(',').map((cell) => cell.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''));
    const row = {};
    headers.forEach((header, index) => { row[header] = cells[index] || ''; });
    return row;
  });
};

const noon = (iso) => {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
};

const run = async () => {
  await connectMongo();
  const password = await bcrypt.hash('demo', 10);

  let admin = await User.findOne({ role: 'ADMIN' });
  if (!admin) {
    admin = new User({ fullName: 'VU Admin', role: 'ADMIN' });
  }
  admin.email = 'admin@vu.edu.pk';
  admin.fullName = admin.fullName || 'VU Admin';
  admin.password = password;
  admin.role = 'ADMIN';
  admin.isVerified = true;
  await admin.save();

  const students = await User.find({ role: 'STUDENT' }).select('_id');
  const ids = students.map((student) => student._id);
  if (ids.length) {
    await CourseAssignment.deleteMany({ student: { $in: ids } });
    await DateSheetSelection.deleteMany({ student: { $in: ids } });
    await ChangeRequest.deleteMany({ student: { $in: ids } });
    await User.deleteMany({ role: 'STUDENT' });
  }

  let branches = 0;
  for (const row of parseCsv('branches.csv')) {
    if (!row.name || !row.code) continue;
    await Branch.findOneAndUpdate(
      { code: row.code.toUpperCase() },
      {
        name: row.name,
        code: row.code.toUpperCase(),
        city: row.city || 'Not set',
        address: row.address,
        contactNumber: row.contact,
        status: String(row.status || 'active').toLowerCase() === 'inactive' ? 'inactive' : 'active',
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
    branches += 1;
  }

  let courses = 0;
  for (const row of parseCsv('courses.csv')) {
    const code = (row.code || row['course code'] || '').toUpperCase();
    if (!code || !row.title) continue;
    const update = {
      courseCode: code,
      title: row.title,
      creditHours: Number(row['credit hours'] || row.credits || 3),
      department: row.department,
      status: String(row.status || 'active').toLowerCase() === 'inactive' ? 'inactive' : 'active',
    };
    if (Course.schema.path('difficulty')) {
      const level = String(row.difficulty || row.level || 'medium').toLowerCase();
      update.difficulty = ['easy', 'medium', 'hard'].includes(level) ? level : 'medium';
    }
    await Course.findOneAndUpdate({ courseCode: code }, update, { upsert: true, setDefaultsOnInsert: true });
    courses += 1;
  }

  let createdStudents = 0;
  for (const row of parseCsv('students.csv')) {
    const email = (row.email || '').toLowerCase();
    if (!row.name || !email.includes('@') || email.endsWith('@') || !row.roll) continue;
    await User.create({
      email,
      fullName: row.name,
      registrationNumber: row.roll,
      program: row.discipline,
      password,
      role: 'STUDENT',
      isVerified: true,
    });
    createdStudents += 1;
  }

  const slotRows = parseCsv('slots.csv');
  const slotCodes = [...new Set(slotRows.map((row) => (row['course code'] || row.code || '').toUpperCase()).filter(Boolean))];
  for (const code of slotCodes) {
    const course = await Course.findOne({ courseCode: code });
    if (course) await ExamSlot.deleteMany({ course: course._id });
  }
  let slots = 0;
  for (const row of slotRows) {
    const code = (row['course code'] || row.code || '').toUpperCase();
    const course = await Course.findOne({ courseCode: code });
    if (!course || !row.date || !row['start time']) continue;
    const date = noon(row.date);
    await ExamSlot.findOneAndUpdate(
      { course: course._id, date, startTime: row['start time'] },
      {
        $set: {
          endTime: row['end time'] || '12:00',
          capacity: Number(row.capacity || 40),
        },
        $setOnInsert: {
          course: course._id,
          date,
          startTime: row['start time'],
          booked: 0,
        },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
    slots += 1;
  }

  let assignments = 0;
  for (const row of parseCsv('registered-courses.csv')) {
    const student = await User.findOne({ email: (row.email || '').toLowerCase(), role: 'STUDENT' });
    const course = await Course.findOne({ courseCode: (row['course code'] || '').toUpperCase() });
    if (!student || !course) continue;
    await CourseAssignment.findOneAndUpdate(
      { student: student._id, course: course._id },
      { student: student._id, course: course._id },
      { upsert: true, setDefaultsOnInsert: true }
    );
    assignments += 1;
  }

  console.log(JSON.stringify({
    admin: 'admin@vu.edu.pk',
    branches,
    courses,
    students: createdStudents,
    slots,
    assignments,
  }));
  process.exit(0);
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
