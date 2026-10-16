const connectDatabase = require('../src/config/db');
const Job = require('../src/models/Job');
const User = require('../src/models/User');
const { parseJobDescription } = require('../src/services/jobParserService');
const logger = require('../src/utils/logger');

async function seed() {
  try {
    await connectDatabase();
    if (!process.env.SEED_USER_EMAIL || !process.env.SEED_JOB_TEXT) {
      logger.info('No seed records created. Set SEED_USER_EMAIL and SEED_JOB_TEXT to seed a real, user-provided job description.');
      return;
    }
    const user = await User.findOne({ email: process.env.SEED_USER_EMAIL.toLowerCase() });
    if (!user) throw new Error('SEED_USER_EMAIL must belong to an existing user');
    const description = process.env.SEED_JOB_TEXT;
    const parsed = parseJobDescription(description);
    await Job.create({
      user: user._id,
      title: process.env.SEED_JOB_TITLE || parsed.title,
      company: process.env.SEED_JOB_COMPANY || parsed.company,
      sourceUrl: process.env.SEED_JOB_URL || '',
      rawDescription: description,
      requiredSkills: parsed.requiredSkills,
      preferredSkills: parsed.preferredSkills,
      analysisStatus: 'ready'
    });
    logger.info('Created a job from the supplied job description');
  } finally {
    const mongoose = require('mongoose');
    await mongoose.disconnect();
  }
}

seed().catch(error => {
  logger.error('Seeding failed', { message: error.message });
  process.exitCode = 1;
});
