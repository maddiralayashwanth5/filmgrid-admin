import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  getCountFromServer,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  User,
  Equipment,
  Booking,
  OpenOrder,
  DashboardStats,
  VerificationStatus,
  BookingStatus,
  OpenOrderStatus,
} from './types';

// Helper to convert Firestore timestamp
const toDate = (timestamp: Timestamp | null | undefined): Date => {
  return timestamp?.toDate() || new Date();
};

// Helper to normalize user data from Firestore
const normalizeUserData = (docId: string, data: Record<string, unknown>): User => {
  // Get displayName - check multiple fields and handle empty strings
  const displayName = 
    ((data.displayName as string)?.trim()) || 
    ((data.name as string)?.trim()) || 
    '';
  
  // Get phoneNumber - check multiple fields and handle empty strings
  const phoneNumber = 
    ((data.phoneNumber as string)?.trim()) || 
    ((data.phone as string)?.trim()) || 
    '';

  return {
    uid: docId,
    filmgridId: ((data.filmgridId as string)?.trim()) || ((data.fgId as string)?.trim()) || '',
    displayName,
    phoneNumber,
    email: data.email as string | undefined,
    role: (data.role as string) || 'renter',
    rating: (data.rating as number) || 0,
    totalRatings: (data.totalRatings as number) || 0,
    avatarUrl: data.avatarUrl as string | undefined,
    createdAt: toDate(data.createdAt as Timestamp),
    verificationStatus: (data.verificationStatus as string) || 'notVerified',
    idProofUrl: (data.idProofUrl || data.idDocumentUrl) as string | undefined,
    idProofType: data.idProofType as string | undefined,
    verificationNotes: data.verificationNotes as string | undefined,
    verifiedAt: data.verifiedAt ? toDate(data.verifiedAt as Timestamp) : undefined,
    verifiedBy: data.verifiedBy as string | undefined,
    isBanned: (data.isBanned as boolean) || false,
    requestedRole: data.requestedRole as string | undefined,
  } as User;
};

// ==================== USERS ====================

export const getUsers = (callback: (users: User[]) => void) => {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map((doc) => normalizeUserData(doc.id, doc.data()));
    callback(users);
  }, (error) => {
    console.error('Error fetching users:', error);
    callback([]);
  });
};

export const getUsersByVerificationStatus = (
  status: VerificationStatus,
  callback: (users: User[]) => void
) => {
  // Query without orderBy to avoid composite index requirement
  const q = query(
    collection(db, 'users'),
    where('verificationStatus', '==', status)
  );
  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map((doc) => normalizeUserData(doc.id, doc.data()));
    // Sort client-side by createdAt descending
    users.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
    callback(users);
  }, (error) => {
    console.error('Error fetching users by verification status:', error);
    callback([]);
  });
};

export const updateUserRole = async (userId: string, role: string) => {
  await updateDoc(doc(db, 'users', userId), {
    role,
    updatedAt: Timestamp.now(),
  });
};

export const verifyUserProfile = async (
  userId: string,
  adminId: string,
  approved: boolean,
  notes?: string
) => {
  // Get user details first
  const userDoc = await getDoc(doc(db, 'users', userId));
  const userData = userDoc.data();
  
  // Update user verification status
  await updateDoc(doc(db, 'users', userId), {
    verificationStatus: approved ? 'verified' : 'rejected',
    verifiedAt: Timestamp.now(),
    verifiedBy: adminId,
    ...(notes && { verificationNotes: notes }),
    updatedAt: Timestamp.now(),
  });
  
  // Create notification for the user
  const notificationType = approved ? 'lenderVerified' : 'lenderRejected';
  const title = approved ? 'Verification Approved! 🎉' : 'Verification Not Approved';
  const body = approved 
    ? `Congratulations ${userData?.name || ''}! Your lender verification has been approved. You can now list equipment on FilmGrid!`
    : `Your lender verification was not approved.${notes ? ` Reason: ${notes}` : ' Please contact support for more details.'}`;
  
  await addDoc(collection(db, 'notifications'), {
    userId,
    type: notificationType,
    title,
    body,
    data: { verificationType: 'lender' },
    isRead: false,
    createdAt: Timestamp.now(),
  });
};

// ==================== ROLE-SPECIFIC VERIFICATIONS ====================

export type RoleVerificationType = 'filmmaker' | 'lender' | 'worker' | 'influencer';

export interface RoleVerificationRequest {
  id: string;
  userId: string;
  displayName: string;
  phone: string;
  role: RoleVerificationType;
  documentUrl: string;
  status: 'pending' | 'verified' | 'rejected';
  submittedAt: Date;
  // Lender specific
  cameraBrand?: string;
  cameraModel?: string;
  cameraSerialNumber?: string;
  cameraPhotoUrl?: string;
  // Worker specific
  category?: string;
  experienceYears?: number;
  isUnionMember?: boolean;
  unionName?: string;
  unionId?: string;
  unionCardUrl?: string;
  bio?: string;
}

export const getRoleVerifications = (
  role: RoleVerificationType,
  status: 'pending' | 'verified' | 'rejected',
  callback: (requests: RoleVerificationRequest[]) => void
) => {
  let collectionName = 'role_verifications';
  if (role === 'lender') collectionName = 'lender_verifications';
  if (role === 'worker') collectionName = 'crew_verifications';

  const q = query(
    collection(db, collectionName),
    where('status', '==', status)
  );

  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        userId: data.userId,
        displayName: data.displayName || '',
        phone: data.phone || '',
        role: role,
        documentUrl: data.documentUrl || data.idDocumentUrl || '',
        status: data.status,
        submittedAt: toDate(data.submittedAt as Timestamp),
        // Lender specific
        cameraBrand: data.cameraBrand,
        cameraModel: data.cameraModel,
        cameraSerialNumber: data.cameraSerialNumber,
        cameraPhotoUrl: data.cameraPhotoUrl,
        // Worker specific
        category: data.category,
        experienceYears: data.experienceYears,
        isUnionMember: data.isUnionMember,
        unionName: data.unionName,
        unionId: data.unionId,
        unionCardUrl: data.unionCardUrl,
        bio: data.bio,
      } as RoleVerificationRequest;
    });
    requests.sort((a, b) => (b.submittedAt?.getTime() || 0) - (a.submittedAt?.getTime() || 0));
    callback(requests);
  }, (error) => {
    console.error(`Error fetching ${role} verifications:`, error);
    callback([]);
  });
};

export const approveRoleVerification = async (
  request: RoleVerificationRequest,
  adminId: string
) => {
  let collectionName = 'role_verifications';
  if (request.role === 'lender') collectionName = 'lender_verifications';
  if (request.role === 'worker') collectionName = 'crew_verifications';

  // Update verification request status
  await updateDoc(doc(db, collectionName, request.id), {
    status: 'verified',
    verifiedAt: Timestamp.now(),
    verifiedBy: adminId,
  });

  // Update user's role-specific verification field
  const verificationField = `${request.role === 'worker' ? 'worker' : request.role}Verification`;
  await updateDoc(doc(db, 'users', request.userId), {
    [verificationField]: {
      status: 'verified',
      documentUrl: request.documentUrl,
      verifiedAt: Timestamp.now(),
    },
    updatedAt: Timestamp.now(),
  });

  // Send notification
  const roleNames: Record<string, string> = {
    filmmaker: 'Filmmaker',
    lender: 'Lender',
    worker: 'Crew',
    influencer: 'Influencer',
  };

  await addDoc(collection(db, 'notifications'), {
    userId: request.userId,
    type: 'roleVerified',
    title: `${roleNames[request.role]} Verification Approved! 🎉`,
    body: `Your ${roleNames[request.role]} verification has been approved.`,
    data: { verificationType: request.role },
    isRead: false,
    createdAt: Timestamp.now(),
  });
};

export const rejectRoleVerification = async (
  request: RoleVerificationRequest,
  adminId: string,
  notes: string
) => {
  let collectionName = 'role_verifications';
  if (request.role === 'lender') collectionName = 'lender_verifications';
  if (request.role === 'worker') collectionName = 'crew_verifications';

  // Update verification request status
  await updateDoc(doc(db, collectionName, request.id), {
    status: 'rejected',
    rejectedAt: Timestamp.now(),
    rejectedBy: adminId,
    rejectionNotes: notes,
  });

  // Update user's role-specific verification field
  const verificationField = `${request.role === 'worker' ? 'worker' : request.role}Verification`;
  await updateDoc(doc(db, 'users', request.userId), {
    [verificationField]: {
      status: 'notVerified',
      rejectionNotes: notes,
    },
    updatedAt: Timestamp.now(),
  });

  // Send notification
  const roleNames: Record<string, string> = {
    filmmaker: 'Filmmaker',
    lender: 'Lender',
    worker: 'Crew',
    influencer: 'Influencer',
  };

  await addDoc(collection(db, 'notifications'), {
    userId: request.userId,
    type: 'roleRejected',
    title: `${roleNames[request.role]} Verification Not Approved`,
    body: `Your ${roleNames[request.role]} verification was not approved. ${notes}`,
    data: { verificationType: request.role },
    isRead: false,
    createdAt: Timestamp.now(),
  });
};

export const toggleUserBan = async (userId: string, isBanned: boolean) => {
  await updateDoc(doc(db, 'users', userId), {
    isBanned,
    updatedAt: Timestamp.now(),
  });
};

export const deleteUser = async (userId: string) => {
  await deleteDoc(doc(db, 'users', userId));
};

// ==================== EQUIPMENT ====================

export const getEquipment = (callback: (equipment: Equipment[]) => void) => {
  const q = query(collection(db, 'equipment'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, async (snapshot) => {
    const equipmentList = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: toDate(doc.data().createdAt),
      updatedAt: toDate(doc.data().updatedAt),
    })) as Equipment[];
    
    // Fetch owner names for equipment that don't have ownerName or have 'Unknown'
    const equipmentWithOwners = await Promise.all(
      equipmentList.map(async (item) => {
        if ((!item.ownerName || item.ownerName === 'Unknown') && item.ownerId) {
          try {
            const userDoc = await getDoc(doc(db, 'users', item.ownerId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              const ownerName = userData?.displayName || userData?.name || userData?.filmgridId || userData?.phoneNumber || 'Unknown';
              return { ...item, ownerName };
            }
          } catch (e) {
            console.error('Error fetching owner:', e);
          }
        }
        return item;
      })
    );
    
    callback(equipmentWithOwners);
  }, (error) => {
    console.error('Error fetching equipment:', error);
    callback([]);
  });
};

export const getPendingEquipment = (callback: (equipment: Equipment[]) => void) => {
  // Query for equipment with verificationStatus = 'pending'
  const q = query(
    collection(db, 'equipment'),
    where('verificationStatus', '==', 'pending')
  );
  return onSnapshot(q, async (snapshot) => {
    const equipmentList = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: toDate(doc.data().createdAt),
      updatedAt: toDate(doc.data().updatedAt),
    })) as Equipment[];
    
    // Fetch owner names for equipment that don't have ownerName or have 'Unknown'
    const equipmentWithOwners = await Promise.all(
      equipmentList.map(async (item) => {
        if ((!item.ownerName || item.ownerName === 'Unknown') && item.ownerId) {
          try {
            const userDoc = await getDoc(doc(db, 'users', item.ownerId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              const ownerName = userData?.displayName || userData?.name || userData?.filmgridId || userData?.phoneNumber || 'Unknown';
              return { ...item, ownerName };
            }
          } catch (e) {
            console.error('Error fetching owner:', e);
          }
        }
        return item;
      })
    );
    
    // Sort client-side by createdAt descending
    equipmentWithOwners.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
    callback(equipmentWithOwners);
  }, (error) => {
    console.error('Error fetching pending equipment:', error);
    callback([]);
  });
};

export const verifyEquipment = async (
  equipmentId: string,
  isVerified: boolean,
  notes?: string
) => {
  // Get equipment details first to get owner info
  const equipmentDoc = await getDoc(doc(db, 'equipment', equipmentId));
  const equipmentData = equipmentDoc.data();
  
  // Update equipment verification status
  await updateDoc(doc(db, 'equipment', equipmentId), {
    verificationStatus: isVerified ? 'verified' : 'rejected',
    verifiedAt: Timestamp.now(),
    ...(notes && { verificationNotes: notes }),
  });
  
  // Create notification for the equipment owner
  if (equipmentData?.ownerId) {
    const notificationType = isVerified ? 'equipmentVerified' : 'equipmentRejected';
    const title = isVerified ? 'Equipment Approved! 🎉' : 'Equipment Not Approved';
    const body = isVerified 
      ? `Your ${equipmentData.title || 'equipment'} has been verified and is now live on FilmGrid!`
      : `Your ${equipmentData.title || 'equipment'} was not approved.${notes ? ` Reason: ${notes}` : ' Please contact support for more details.'}`;
    
    await addDoc(collection(db, 'notifications'), {
      userId: equipmentData.ownerId,
      type: notificationType,
      title,
      body,
      data: { equipmentId, equipmentTitle: equipmentData.title },
      isRead: false,
      createdAt: Timestamp.now(),
    });
  }
};

export const toggleEquipmentStatus = async (equipmentId: string, isActive: boolean) => {
  await updateDoc(doc(db, 'equipment', equipmentId), {
    isActive,
    updatedAt: Timestamp.now(),
  });
};

export const updateEquipmentTitle = async (equipmentId: string, title: string) => {
  await updateDoc(doc(db, 'equipment', equipmentId), {
    title,
    updatedAt: Timestamp.now(),
  });
};

export const deleteEquipment = async (equipmentId: string) => {
  await deleteDoc(doc(db, 'equipment', equipmentId));
};

// Create new equipment (admin)
export interface CreateEquipmentData {
  title: string;
  brand: string;
  category: string;
  description: string;
  dailyRate: number;
  photos: string[];
  city: string;
  isActive: boolean;
}

// Map category display names to enum names used by Flutter app
const categoryToEnumName: Record<string, string> = {
  'Cameras': 'camera',
  'Lenses': 'lens',
  'Lights': 'lighting',
  'Lighting': 'lighting',
  'Audio': 'audio',
  'Drones': 'drone',
  'Tripods & Stabilizers': 'grip',
  'Grip': 'grip',
  'Storage': 'storage',
  'Accessories': 'accessories',
};

export const createEquipment = async (data: CreateEquipmentData) => {
  // Convert to Flutter app's expected field names
  const categoryEnum = categoryToEnumName[data.category] || data.category.toLowerCase();
  
  const docRef = await addDoc(collection(db, 'equipment'), {
    name: data.title,
    title: data.title, // Keep for admin panel compatibility
    brand: data.brand,
    category: categoryEnum,
    description: data.description,
    dailyRate: data.dailyRate,
    imageUrls: data.photos,
    photos: data.photos, // Keep for admin panel compatibility
    location: data.city,
    city: data.city, // Keep for admin panel compatibility
    isAvailable: data.isActive,
    isActive: data.isActive, // Keep for admin panel compatibility
    ownerId: 'admin',
    ownerName: 'FilmGrid',
    ownerPhone: '',
    accessories: [],
    isVerified: true,
    verificationStatus: 'verified',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
};

// Update equipment
export const updateEquipment = async (equipmentId: string, data: Partial<CreateEquipmentData>) => {
  const updateData: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
  };
  
  if (data.title) {
    updateData.name = data.title;
    updateData.title = data.title;
  }
  if (data.brand) updateData.brand = data.brand;
  if (data.category) {
    const categoryEnum = categoryToEnumName[data.category] || data.category.toLowerCase();
    updateData.category = categoryEnum;
  }
  if (data.description) updateData.description = data.description;
  if (data.dailyRate !== undefined) updateData.dailyRate = data.dailyRate;
  if (data.photos) {
    updateData.imageUrls = data.photos;
    updateData.photos = data.photos;
  }
  if (data.city) {
    updateData.location = data.city;
    updateData.city = data.city;
  }
  if (data.isActive !== undefined) {
    updateData.isAvailable = data.isActive;
    updateData.isActive = data.isActive;
  }
  
  await updateDoc(doc(db, 'equipment', equipmentId), updateData);
};

// Get equipment categories
export const getEquipmentCategories = (callback: (categories: string[]) => void) => {
  const q = query(collection(db, 'equipment_categories'), orderBy('name', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const categories = snapshot.docs.map((doc) => doc.data().name as string);
    callback(categories);
  }, (error) => {
    console.error('Error fetching categories:', error);
    callback([]);
  });
};

// Create equipment category if not exists
export const createEquipmentCategory = async (name: string) => {
  // Check if category exists
  const q = query(collection(db, 'equipment_categories'), where('name', '==', name));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    await addDoc(collection(db, 'equipment_categories'), {
      name,
      createdAt: Timestamp.now(),
    });
  }
};

// ==================== BOOKINGS ====================

export const getBookings = (callback: (bookings: Booking[]) => void) => {
  const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const bookings = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      startDate: toDate(doc.data().startDate),
      endDate: toDate(doc.data().endDate),
      createdAt: toDate(doc.data().createdAt),
      updatedAt: toDate(doc.data().updatedAt),
    })) as Booking[];
    callback(bookings);
  }, (error) => {
    console.error('Error fetching bookings:', error);
    callback([]);
  });
};

export const getBookingsByStatus = (
  status: BookingStatus,
  callback: (bookings: Booking[]) => void
) => {
  const q = query(
    collection(db, 'bookings'),
    where('status', '==', status),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const bookings = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      startDate: toDate(doc.data().startDate),
      endDate: toDate(doc.data().endDate),
      createdAt: toDate(doc.data().createdAt),
      updatedAt: toDate(doc.data().updatedAt),
    })) as Booking[];
    callback(bookings);
  }, (error) => {
    console.error('Error fetching bookings by status:', error);
    callback([]);
  });
};

export const updateBookingStatus = async (bookingId: string, status: BookingStatus) => {
  await updateDoc(doc(db, 'bookings', bookingId), {
    status,
    updatedAt: Timestamp.now(),
  });
};

// ==================== OPEN ORDERS ====================

export const getOpenOrders = (callback: (orders: OpenOrder[]) => void) => {
  const q = query(collection(db, 'open_orders'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      startDate: toDate(doc.data().startDate),
      endDate: toDate(doc.data().endDate),
      createdAt: toDate(doc.data().createdAt),
      expiresAt: toDate(doc.data().expiresAt),
      acceptedAt: doc.data().acceptedAt ? toDate(doc.data().acceptedAt) : undefined,
    })) as OpenOrder[];
    callback(orders);
  }, (error) => {
    console.error('Error fetching open orders:', error);
    callback([]);
  });
};

export const getOpenOrdersByStatus = (
  status: OpenOrderStatus,
  callback: (orders: OpenOrder[]) => void
) => {
  const q = query(
    collection(db, 'open_orders'),
    where('status', '==', status),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      startDate: toDate(doc.data().startDate),
      endDate: toDate(doc.data().endDate),
      createdAt: toDate(doc.data().createdAt),
      expiresAt: toDate(doc.data().expiresAt),
      acceptedAt: doc.data().acceptedAt ? toDate(doc.data().acceptedAt) : undefined,
    })) as OpenOrder[];
    callback(orders);
  }, (error) => {
    console.error('Error fetching open orders by status:', error);
    callback([]);
  });
};

export const cancelOpenOrder = async (orderId: string) => {
  await updateDoc(doc(db, 'open_orders', orderId), {
    status: 'cancelled',
    updatedAt: Timestamp.now(),
  });
};

// ==================== DASHBOARD STATS ====================

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const [
    usersSnapshot,
    equipmentSnapshot,
    bookingsSnapshot,
    activeBookingsSnapshot,
    pendingEquipmentSnapshot,
    pendingProfilesSnapshot,
    openOrdersSnapshot,
    completedBookingsSnapshot,
    rentersSnapshot,
    lendersSnapshot,
    workersSnapshot,
    influencersSnapshot,
    defaultUsersSnapshot,
  ] = await Promise.all([
    getCountFromServer(collection(db, 'users')),
    getCountFromServer(collection(db, 'equipment')),
    getCountFromServer(collection(db, 'bookings')),
    getCountFromServer(query(collection(db, 'bookings'), where('status', '==', 'active'))),
    getCountFromServer(query(collection(db, 'equipment'), where('isVerified', '==', false))),
    getCountFromServer(query(collection(db, 'users'), where('verificationStatus', '==', 'pending'))),
    getCountFromServer(query(collection(db, 'open_orders'), where('status', '==', 'open'))),
    getDocs(query(collection(db, 'bookings'), where('status', '==', 'completed'))),
    getCountFromServer(query(collection(db, 'users'), where('role', '==', 'renter'))),
    getCountFromServer(query(collection(db, 'users'), where('role', '==', 'lender'))),
    getCountFromServer(query(collection(db, 'users'), where('role', '==', 'worker'))),
    getCountFromServer(query(collection(db, 'users'), where('role', '==', 'influencer'))),
    getCountFromServer(query(collection(db, 'users'), where('role', '==', 'user'))),
  ]);

  let totalRevenue = 0;
  completedBookingsSnapshot.docs.forEach((doc) => {
    totalRevenue += doc.data().totalAmount || 0;
  });

  return {
    totalUsers: usersSnapshot.data().count,
    totalEquipment: equipmentSnapshot.data().count,
    totalBookings: bookingsSnapshot.data().count,
    activeBookings: activeBookingsSnapshot.data().count,
    pendingEquipment: pendingEquipmentSnapshot.data().count,
    pendingProfiles: pendingProfilesSnapshot.data().count,
    openOrders: openOrdersSnapshot.data().count,
    totalRevenue,
    usersByRole: {
      renters: rentersSnapshot.data().count,
      lenders: lendersSnapshot.data().count,
      workers: workersSnapshot.data().count,
      influencers: influencersSnapshot.data().count,
      users: defaultUsersSnapshot.data().count,
    },
  };
};

// ==================== HERO BANNERS ====================

export interface HeroBanner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl?: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export const getHeroBanners = async (): Promise<HeroBanner[]> => {
  const q = query(collection(db, 'hero_banners'), orderBy('order', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    title: doc.data().title || '',
    subtitle: doc.data().subtitle || '',
    imageUrl: doc.data().imageUrl || '',
    linkUrl: doc.data().linkUrl || '',
    isActive: doc.data().isActive ?? true,
    order: doc.data().order || 0,
    createdAt: toDate(doc.data().createdAt),
    updatedAt: toDate(doc.data().updatedAt),
  }));
};

export const createHeroBanner = async (banner: Omit<HeroBanner, 'id' | 'createdAt' | 'updatedAt'>) => {
  const docRef = await addDoc(collection(db, 'hero_banners'), {
    ...banner,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
};

export const updateHeroBanner = async (id: string, data: Partial<HeroBanner>) => {
  await updateDoc(doc(db, 'hero_banners', id), {
    ...data,
    updatedAt: Timestamp.now(),
  });
};

export const deleteHeroBanner = async (id: string) => {
  await deleteDoc(doc(db, 'hero_banners', id));
};
