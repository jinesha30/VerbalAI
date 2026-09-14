const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/learning_assessment_db')
  .then(() => console.log('✓ MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Student Schema
const StudentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rollno: { type: String, required: true },
  school: { type: String, required: true },
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
  standard: { type: String, required: true },
  age: { type: Number, required: true },
  email: String,
  phone: String,
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  registeredAt: { type: Date, default: Date.now }
});

const Student = mongoose.model('Student', StudentSchema);

// School Schema (to get a school reference)
const SchoolSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  address: { type: String },
  city: { type: String },
  state: { type: String },
  hasAdmin: { type: Boolean, default: false },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  createdAt: { type: Date, default: Date.now }
});

const School = mongoose.model('School', SchoolSchema);

// Test students - one per standard (grade 1-7)
const testStudents = [
  {
    name: 'Test Student 1',
    rollno: '001',
    school: 'Test School',
    standard: '1',
    age: 6,
    email: 'student1@test.com',
    phone: '1234567890',
    username: 'student1',
    password: 'student1-123'
  },
  {
    name: 'Test Student 2',
    rollno: '002',
    school: 'Test School',
    standard: '2',
    age: 7,
    email: 'student2@test.com',
    phone: '1234567891',
    username: 'student2',
    password: 'student2-123'
  },
  {
    name: 'Test Student 3',
    rollno: '003',
    school: 'Test School',
    standard: '3',
    age: 8,
    email: 'student3@test.com',
    phone: '1234567892',
    username: 'student3',
    password: 'student3-123'
  },
  {
    name: 'Test Student 4',
    rollno: '004',
    school: 'Test School',
    standard: '4',
    age: 9,
    email: 'student4@test.com',
    phone: '1234567893',
    username: 'student4',
    password: 'student4-123'
  },
  {
    name: 'Test Student 5',
    rollno: '005',
    school: 'Test School',
    standard: '5',
    age: 10,
    email: 'student5@test.com',
    phone: '1234567894',
    username: 'student5',
    password: 'student5-123'
  },
  {
    name: 'Test Student 6',
    rollno: '006',
    school: 'Test School',
    standard: '6',
    age: 11,
    email: 'student6@test.com',
    phone: '1234567895',
    username: 'student6',
    password: 'student6-123'
  },
  {
    name: 'Test Student 7',
    rollno: '007',
    school: 'Test School',
    standard: '7',
    age: 12,
    email: 'student7@test.com',
    phone: '1234567896',
    username: 'student7',
    password: 'student7-123'
  }
];

async function seedStudents() {
  try {
    // Get or create Test School
    let school = await School.findOne({ name: 'Test School' });
    if (!school) {
      school = await School.create({
        name: 'Test School',
        address: '123 Test Street',
        city: 'Test City',
        state: 'Test State'
      });
      console.log('✓ Created Test School');
    }

    // Remove existing test students (students with usernames student1-student7)
    const deleteResult = await Student.deleteMany({ 
      username: { $in: ['student1', 'student2', 'student3', 'student4', 'student5', 'student6', 'student7'] }
    });
    console.log(`✓ Cleared ${deleteResult.deletedCount} existing test students`);

    // Add schoolId to each student
    const studentsWithSchoolId = testStudents.map(student => ({
      ...student,
      schoolId: school._id
    }));

    // Insert test students
    const result = await Student.insertMany(studentsWithSchoolId);
    console.log(`\n✓ Successfully seeded ${result.length} test students:\n`);
    
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║              TEST STUDENT CREDENTIALS                        ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    result.forEach(student => {
      console.log(`║ Standard ${student.standard} | Username: ${student.username.padEnd(10)} | Password: ${student.password.padEnd(13)} ║`);
    });
    console.log('╚══════════════════════════════════════════════════════════════╝');

    console.log('\n✓ Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error seeding database:', error);
    process.exit(1);
  }
}

seedStudents();
