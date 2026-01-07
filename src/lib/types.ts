// User types
export type UserRole = 'renter' | 'lender';
export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'notVerified';

export interface ContactInfo {
  name: string;
  phoneNumber: string;
  email?: string;
}

export interface User {
  uid: string;
  filmgridId: string;
  phoneNumber: string;
  displayName: string;
  role: UserRole;
  email?: string;
  rating: number;
  totalRatings: number;
  avatarUrl?: string;
  createdAt: Date;
  verificationStatus: VerificationStatus;
  idProofUrl?: string;
  idProofType?: string;
  verificationNotes?: string;
  verifiedAt?: Date;
  verifiedBy?: string;
  isBanned: boolean;
  contacts?: ContactInfo[];
  referredBy?: string;
  requestedRole?: UserRole;
}

// Equipment types
export interface Equipment {
  id: string;
  ownerId: string;
  ownerName: string;
  title: string;
  brand: string;
  category: string;
  description: string;
  dailyRate: number;
  photos: string[];
  city: string;
  isActive: boolean;
  isVerified: boolean;
  verificationNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Booking types
export type BookingStatus = 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  equipmentId: string;
  equipmentTitle: string;
  equipmentImage?: string;
  renterId: string;
  renterName: string;
  ownerId: string;
  ownerName: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  dailyRate: number;
  totalAmount: number;
  status: BookingStatus;
  pickupOtp?: string;
  dropoffOtp?: string;
  rentalId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Open Order types
export type OpenOrderStatus = 'open' | 'accepted' | 'expired' | 'cancelled';

export interface OpenOrder {
  id: string;
  renterId: string;
  renterName: string;
  renterPhone: string;
  renterPhotoUrl?: string;
  category: string;
  preferredBrand?: string;
  preferredModel?: string;
  description: string;
  startDate: Date;
  endDate: Date;
  maxBudgetPerDay: number;
  city: string;
  pickupLocation?: string;
  status: OpenOrderStatus;
  createdAt: Date;
  expiresAt: Date;
  acceptedByLenderId?: string;
  acceptedByLenderName?: string;
  acceptedEquipmentId?: string;
  acceptedEquipmentTitle?: string;
  agreedPricePerDay?: number;
  acceptedAt?: Date;
}

// Dashboard stats
export interface DashboardStats {
  totalUsers: number;
  totalEquipment: number;
  totalBookings: number;
  activeBookings: number;
  pendingEquipment: number;
  pendingProfiles: number;
  openOrders: number;
  totalRevenue: number;
  usersByRole: {
    renters: number;
    lenders: number;
  };
}
