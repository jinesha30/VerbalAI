const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/learning_assessment_db')
  .then(async () => {
    console.log('✓ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    
    // Get students
    const students = await db.collection('students').find().toArray();
    console.log('========================================');
    console.log('STUDENTS COLLECTION');
    console.log('========================================');
    console.log(`Total Students: ${students.length}\n`);
    
    students.forEach((student, index) => {
      console.log(`\n--- Student ${index + 1} ---`);
      console.log(`Name: ${student.name}`);
      console.log(`Roll No: ${student.rollno}`);
      console.log(`School: ${student.school}`);
      console.log(`Standard: ${student.standard}`);
      console.log(`Age: ${student.age}`);
      console.log(`Username: ${student.username}`);
      console.log(`Registered: ${student.registeredAt}`);
    });
    
    // Get assessments
    const assessments = await db.collection('assessments').find().toArray();
    console.log('\n\n========================================');
    console.log('ASSESSMENTS COLLECTION');
    console.log('========================================');
    console.log(`Total Assessments: ${assessments.length}\n`);
    
    assessments.forEach((assessment, index) => {
      console.log(`\n--- Assessment ${index + 1} ---`);
      console.log(`Student: ${assessment.studentName}`);
      console.log(`Standard: ${assessment.standard}`);
      console.log(`Score: ${assessment.score}%`);
      console.log(`Correct: ${assessment.correctCount}/${assessment.totalCount}`);
      console.log(`Transcribed: ${assessment.transcribedText}`);
      console.log(`Date: ${assessment.date}`);
      console.log(`Details:`);
      assessment.details.forEach(detail => {
        console.log(`  - Expected: ${detail.expected}, Recognized: ${detail.recognized}, Correct: ${detail.correct ? '✓' : '✗'}`);
      });
    });
    
    console.log('\n========================================\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
  });
