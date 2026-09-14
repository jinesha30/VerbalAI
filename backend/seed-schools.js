const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/learning_assessment_db')
  .then(() => console.log('✓ MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// School Schema
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

// Sample schools to seed
const sampleSchools = [
  {
    name: 'Springfield Elementary School',
    address: '123 Main Street',
    city: 'Springfield',
    state: 'Illinois'
  },
  {
    name: 'Riverdale High School',
    address: '456 River Road',
    city: 'Riverdale',
    state: 'New York'
  },
  {
    name: 'Sunnydale Middle School',
    address: '789 Sunny Avenue',
    city: 'Sunnydale',
    state: 'California'
  },
  {
    name: 'Greenwood Academy',
    address: '321 Green Lane',
    city: 'Greenwood',
    state: 'Texas'
  },
  {
    name: 'Lakeside International School',
    address: '555 Lake Drive',
    city: 'Lakeside',
    state: 'Florida'
  }
];

async function seedSchools() {
  try {
    // Clear existing schools (optional - comment out if you want to keep existing data)
    await School.deleteMany({});
    console.log('✓ Cleared existing schools');

    // Insert sample schools
    const result = await School.insertMany(sampleSchools);
    console.log(`✓ Successfully seeded ${result.length} schools:`);
    result.forEach(school => {
      console.log(`  - ${school.name} (${school.city}, ${school.state})`);
    });

    console.log('\n✓ Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error seeding database:', error);
    process.exit(1);
  }
}

seedSchools();
