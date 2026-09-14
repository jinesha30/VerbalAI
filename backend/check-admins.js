const mongoose = require('mongoose');

// Define schemas directly  
const AdminSchema = new mongoose.Schema({
  name: String,
  email: String,
  username: String,
  password: String,
  role: String,
  schoolId: mongoose.Schema.Types.ObjectId,
  schoolName: String,
  createdAt: Date
});

const SchoolSchema = new mongoose.Schema({
  name: String,
  hasAdmin: Boolean,
  createdAt: Date
});

const Admin = mongoose.model('Admin', AdminSchema);
const School = mongoose.model('School', SchoolSchema);

mongoose.connect('mongodb://localhost:27017/learning_assessment_db')
  .then(async () => {
    console.log('✓ Connected to MongoDB\n');
    console.log('========================================');
    console.log('ADMINS COLLECTION');
    console.log('========================================');
    
    const admins = await Admin.find({});
    console.log(`Total Admins: ${admins.length}\n`);
    
    if (admins.length === 0) {
      console.log('⚠️  NO ADMIN ACCOUNTS FOUND!\n');
      console.log('Creating default system admin...');
      
      const defaultAdmin = new Admin({
        name: 'System Administrator',
        email: 'admin@system.com',
        username: 'admin',
        password: 'admin123',
        role: 'system_admin',
        createdAt: new Date()
      });
      
      await defaultAdmin.save();
      console.log('✓ Created admin account:');
      console.log('   Username: admin');
      console.log('   Password: admin123\n');
    } else {
      admins.forEach((admin, index) => {
        console.log(`--- Admin ${index + 1} ---`);
        console.log(`Name: ${admin.name}`);
        console.log(`Username: ${admin.username}`);
        console.log(`Password: ${admin.password}`);
        console.log(`Email: ${admin.email || 'N/A'}`);
        console.log(`School ID: ${admin.schoolId || 'N/A'}`);
        console.log(`School Name: ${admin.schoolName || 'N/A'}`);
        console.log(`Role: ${admin.role}`);
        console.log(`Created: ${admin.createdAt || 'N/A'}`);
        console.log('');
      });
    }

    console.log('========================================');
    console.log('SCHOOLS COLLECTION');
    console.log('========================================');
    
    const schools = await School.find({});
    console.log(`Total Schools: ${schools.length}\n`);
    
    schools.forEach((school, index) => {
      console.log(`--- School ${index + 1} ---`);
      console.log(`Name: ${school.name}`);
      console.log(`Has Admin: ${school.hasAdmin}`);
      console.log(`Created: ${school.createdAt || 'N/A'}`);
      console.log('');
    });

    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
