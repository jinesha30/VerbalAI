/**
 * Password Migration Script
 * This script hashes all plain text passwords in the database using bcrypt
 * Run this once after implementing bcrypt authentication
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Import schemas
const studentSchema = new mongoose.Schema({
  username: String,
  password: String,
  studentName: String,
  rollno: String,
  class: String,
  section: String,
  schoolId: String
});

const adminSchema = new mongoose.Schema({
  username: String,
  password: String,
  name: String,
  email: String,
  role: String,
  schoolId: String
});

const Student = mongoose.model('Student', studentSchema);
const Admin = mongoose.model('Admin', adminSchema);

async function migratePasswords() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/learning_assessment_db');
    console.log('✓ Connected to MongoDB\n');

    // Migrate student passwords
    console.log('🔄 Migrating student passwords...');
    const students = await Student.find({});
    let studentCount = 0;

    for (const student of students) {
      // Check if password is already hashed (bcrypt hashes start with $2b$)
      if (student.password && !student.password.startsWith('$2b$')) {
        const hashedPassword = await bcrypt.hash(student.password, 10);
        student.password = hashedPassword;
        await student.save();
        studentCount++;
        console.log(`  ✓ Migrated password for student: ${student.username}`);
      }
    }
    console.log(`✓ Migrated ${studentCount} student passwords\n`);

    // Migrate admin passwords
    console.log('🔄 Migrating admin passwords...');
    const admins = await Admin.find({});
    let adminCount = 0;

    for (const admin of admins) {
      // Check if password is already hashed (bcrypt hashes start with $2b$)
      if (admin.password && !admin.password.startsWith('$2b$')) {
        const hashedPassword = await bcrypt.hash(admin.password, 10);
        admin.password = hashedPassword;
        await admin.save();
        adminCount++;
        console.log(`  ✓ Migrated password for admin: ${admin.username}`);
      }
    }
    console.log(`✓ Migrated ${adminCount} admin passwords\n`);

    console.log(`✅ Password migration completed!`);
    console.log(`   - ${studentCount} student passwords hashed`);
    console.log(`   - ${adminCount} admin passwords hashed`);
    console.log(`\nYou can now log in with your existing credentials.`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
  }
}

// Run the migration
migratePasswords();
