import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/user.model.js';
import { City } from '../models/city.model.js';
import { Category } from '../models/category.model.js';
import { ENV } from '../config/env.js';

const moroccanCities = [
  { name_fr: 'Casablanca', name_ar: 'الدار البيضاء', region: 'Grand Casablanca', lat: 33.5731, lng: -7.5898 },
  { name_fr: 'Rabat', name_ar: 'الرباط', region: 'Rabat-Salé-Kénitra', lat: 34.0209, lng: -6.8416 },
  { name_fr: 'Marrakech', name_ar: 'مراكش', region: 'Marrakech-Safi', lat: 31.6295, lng: -7.9811 },
  { name_fr: 'Fès', name_ar: 'فاس', region: 'Fès-Meknès', lat: 34.0333, lng: -5.0000 },
  { name_fr: 'Tanger', name_ar: 'طنجة', region: 'Tanger-Tétouan-Al Hoceïma', lat: 35.7595, lng: -5.8340 },
  { name_fr: 'Agadir', name_ar: 'أكادير', region: 'Souss-Massa', lat: 30.4278, lng: -9.5981 },
];

const categories = [
  { name_fr: 'Technologie', name_ar: 'تكنولوجيا', icon: '💻', color: '#2196F3' },
  { name_fr: 'Sport', name_ar: 'رياضة', icon: '⚽', color: '#4CAF50' },
  { name_fr: 'Culture & Arts', name_ar: 'ثقافة وفنون', icon: '🎨', color: '#FF5722' },
  { name_fr: 'Business', name_ar: 'أعمال', icon: '💼', color: '#9C27B0' },
  { name_fr: 'Bien-être', name_ar: 'صحة', icon: '🧘', color: '#00BCD4' },
  { name_fr: 'Éducation', name_ar: 'تعليم', icon: '📚', color: '#FF9800' },
  { name_fr: 'Gastronomie', name_ar: 'طبخ', icon: '🍽️', color: '#F44336' },
  { name_fr: 'Musique', name_ar: 'موسيقى', icon: '🎵', color: '#673AB7' },
];

// Overridable so a publicly-reachable environment (e.g. Atlas + Render) never
// has to run with the well-known default password documented in this repo.
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD ?? 'Admin@123';
const MEMBER_PASSWORD = process.env.MEMBER_SEED_PASSWORD ?? 'Member@123';

const seed = async () => {
  await mongoose.connect(ENV.MONGODB_URI);
  console.log('Connected to MongoDB');

  if (!process.env.ADMIN_SEED_PASSWORD) {
    console.warn('ADMIN_SEED_PASSWORD not set — using the default password. Do not do this on a public database.');
  }

  const existingAdmin = await User.findOne({ email: 'admin@lokl.ma' });
  if (!existingAdmin) {
    const password_hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await User.create({
      email: 'admin@lokl.ma',
      full_name: 'Admin Lokl',
      role: 'admin',
      lang: 'fr',
      is_verified: true,
      password_hash,
    });
    console.log('Admin created: admin@lokl.ma / (password from ADMIN_SEED_PASSWORD)');
  } else {
    console.log('Admin already exists');
  }

  const existingMember = await User.findOne({ email: 'member@lokl.ma' });
  if (!existingMember) {
    const password_hash = await bcrypt.hash(MEMBER_PASSWORD, 12);
    await User.create({
      email: 'member@lokl.ma',
      full_name: 'Membre Démo',
      role: 'member',
      lang: 'fr',
      is_verified: true,
      password_hash,
    });
    console.log('Demo member created: member@lokl.ma / (password from MEMBER_SEED_PASSWORD)');
  } else {
    console.log('Demo member already exists');
  }

  const cityCount = await City.countDocuments();
  if (cityCount === 0) {
    await City.insertMany(moroccanCities);
    console.log(`${moroccanCities.length} cities inserted`);
  }

  const catCount = await Category.countDocuments();
  if (catCount === 0) {
    await Category.insertMany(categories);
    console.log(`${categories.length} categories inserted`);
  }

  await mongoose.disconnect();
  console.log('Seed complete');
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
