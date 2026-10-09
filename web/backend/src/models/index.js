const mongoose = require('mongoose');

const { Schema } = mongoose;

const formatDoc = (doc) => {
  if (!doc) return null;
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  if (obj._id !== undefined) {
    obj.id = obj._id.toString();
    delete obj._id;
  }
  delete obj.__v;
  return obj;
};

const formatDocs = (docs) => (docs || []).map(formatDoc);

// ── User ──
const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['STUDENT', 'ADMIN'], default: 'STUDENT' },
    isVerified: { type: Boolean, default: false },
    // Personal
    fullName: { type: String, required: true },
    phone: { type: String },
    cnic: { type: String },
    dob: { type: Date },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    address: { type: String },
    profilePhoto: { type: String, default: null },
    // Parent / Guardian
    fatherName: { type: String },
    parentCnic: { type: String },
    parentOccupation: { type: String },
    parentContact: { type: String },
    emergencyContact: { type: String },
    // Academic
    registrationNumber: { type: String, unique: true, sparse: true },
    program: { type: String },
    semester: { type: String },
    session: { type: String },
    previousQualification: { type: String },
    previousInstitute: { type: String },
    previousMarks: { type: String },
    // ExamSlot specific
    selectedBranch: { type: Schema.Types.ObjectId, ref: 'Branch', default: null },
    branchLocked: { type: Boolean, default: false },
    dateSheetSaved: { type: Boolean, default: false },
    passwordSent: { type: Boolean, default: false },
    pendingPassword: { type: String, default: null, select: false },
    // Password setup
    passwordSetupToken: { type: String, default: null },
    passwordSetupExpiry: { type: Date, default: null },
  },
  { timestamps: true }
);

// ── Branch ──
const branchSchema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    city: { type: String, required: true },
    address: { type: String },
    contactNumber: { type: String },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

// ── Course ──
const courseSchema = new Schema(
  {
    courseCode: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    creditHours: { type: Number, required: true },
    department: { type: String },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

// ── CourseAssignment ──
const courseAssignmentSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  },
  { timestamps: true }
);
courseAssignmentSchema.index({ student: 1, course: 1 }, { unique: true });

// ── ExamSlot ──
const examSlotSchema = new Schema(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String },
    capacity: { type: Number, default: 0 },
    booked: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ── DateSheetSelection ──
const dateSheetSelectionSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    examSlot: { type: Schema.Types.ObjectId, ref: 'ExamSlot', required: true },
  },
  { timestamps: true }
);
dateSheetSelectionSchema.index({ student: 1, course: 1 }, { unique: true });

// ── ChangeRequest ──
const changeRequestSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['CHANGE_BRANCH', 'CHANGE_DATESHEET'], required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    adminRemark: { type: String, default: null },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ── Register Models ──
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Branch = mongoose.models.Branch || mongoose.model('Branch', branchSchema);
const Course = mongoose.models.Course || mongoose.model('Course', courseSchema);
const CourseAssignment =
  mongoose.models.CourseAssignment || mongoose.model('CourseAssignment', courseAssignmentSchema);
const ExamSlot = mongoose.models.ExamSlot || mongoose.model('ExamSlot', examSlotSchema);
const DateSheetSelection =
  mongoose.models.DateSheetSelection ||
  mongoose.model('DateSheetSelection', dateSheetSelectionSchema);
const ChangeRequest =
  mongoose.models.ChangeRequest || mongoose.model('ChangeRequest', changeRequestSchema);

module.exports = {
  User,
  Branch,
  Course,
  CourseAssignment,
  ExamSlot,
  DateSheetSelection,
  ChangeRequest,
  formatDoc,
  formatDocs,
};
