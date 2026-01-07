import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
};

console.log('Connecting to project:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createTestEquipment() {
  const docRef = await addDoc(collection(db, 'equipment'), {
    name: 'Test Sony A7S III',
    title: 'Test Sony A7S III',
    brand: 'Sony',
    category: 'camera',
    description: 'Test equipment from admin',
    dailyRate: 2500,
    imageUrls: [],
    photos: [],
    location: 'Mumbai',
    city: 'Mumbai',
    isAvailable: true,
    isActive: true,
    ownerId: 'admin',
    ownerName: 'FilmGrid',
    ownerPhone: '',
    accessories: [],
    isVerified: true,
    verificationStatus: 'verified',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  console.log('Created equipment with ID:', docRef.id);
  process.exit(0);
}

createTestEquipment().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
