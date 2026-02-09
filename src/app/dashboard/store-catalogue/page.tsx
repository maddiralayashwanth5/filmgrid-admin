'use client';

import { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import {
  Store,
  Plus,
  MoreVertical,
  Search,
  X,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Camera,
  Filter,
  IndianRupee,
  MapPin,
  Phone,
  User,
  Image as ImageIcon,
  Upload,
  Loader2,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/contexts/AuthContext';

type ItemStatus = 'pending' | 'approved' | 'rejected' | 'sold';
type ItemType = 'equipment' | 'non-equipment';

interface StoreItem {
  id: string;
  title: string;
  description: string;
  category: string;
  itemType: ItemType;
  price: number;
  condition: string;
  location: string;
  sellerId: string;
  sellerName: string;
  sellerPhone: string;
  sellerFgId?: string;
  imageUrl?: string;
  images?: string[];
  status: ItemStatus;
  createdAt: Date;
  updatedAt?: Date;
  approvedAt?: Date;
  approvedBy?: string;
  rejectionReason?: string;
  source?: 'sales_items' | 'used_gear';
}

const EQUIPMENT_CATEGORIES = [
  'Used Equipment',
  'Cameras',
  'Lenses',
  'Lighting',
  'Audio',
  'Grip',
  'Drones',
  'Storage',
  'Accessories',
  'Sales',
];

const NON_EQUIPMENT_CATEGORIES = [
  'Gels & Filters',
  'Cables & Electrical',
  'Bulbs & Lamps',
  'Diffusion Materials',
  'Consumables',
  'Props',
  'Costumes',
  'Other',
];

const statusColors: Record<ItemStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  sold: 'bg-purple-100 text-purple-700',
};

const conditionOptions = ['New', 'Like New', 'Good', 'Fair', 'For Parts'];

export default function StoreCataloguePage() {
  const { user } = useAuth();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'equipment' | 'non-equipment'>('all');
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<StoreItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [sizeFilter, setSizeFilter] = useState<string>('all');
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Excel upload state
  const excelInputRef = useRef<HTMLInputElement>(null);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [excelData, setExcelData] = useState<Array<{
    title: string;
    description: string;
    category: string;
    itemType: ItemType;
    price: number;
    condition: string;
    location: string;
    sellerName: string;
    sellerPhone: string;
  }>>([]);
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Dimension pricing state
  const [variantPrices, setVariantPrices] = useState<Record<string, string>>({});
  const [savingVariantId, setSavingVariantId] = useState<string | null>(null);

  // Size pricing for form: { "4 x 4 ft": "6000", "6 x 6 ft": "6000" }
  const [formSizePrices, setFormSizePrices] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    itemType: 'equipment' as ItemType,
    price: '',
    condition: 'Good',
    location: '',
    sellerName: '',
    sellerPhone: '',
    sellerFgId: '',
    imageUrl: '',
    status: 'pending' as ItemStatus,
  });

  useEffect(() => {
    // Listen to both sales_items and used_gear collections
    const salesItemsQuery = query(collection(db, 'sales_items'), orderBy('createdAt', 'desc'));
    const usedGearQuery = query(collection(db, 'used_gear'), orderBy('createdAt', 'desc'));
    
    let salesItems: StoreItem[] = [];
    let usedGearItems: StoreItem[] = [];
    
    const unsubscribeSales = onSnapshot(salesItemsQuery, (snapshot) => {
      salesItems = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || data.name || '',
          description: data.description || '',
          category: data.category || '',
          itemType: data.itemType || 'equipment',
          price: data.price || 0,
          condition: data.condition || 'Good',
          location: data.location || '',
          sellerId: data.sellerId || '',
          sellerName: data.sellerName || '',
          sellerPhone: data.sellerPhone || '',
          sellerFgId: data.sellerFgId || '',
          imageUrl: data.imageUrl || '',
          images: data.images || [],
          status: data.status || 'pending',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate(),
          approvedAt: data.approvedAt?.toDate(),
          source: 'sales_items' as const,
        };
      }) as StoreItem[];
      setItems([...salesItems, ...usedGearItems].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
      setLoading(false);
    }, (error) => {
      console.error('Error loading sales items:', error);
    });

    const unsubscribeUsedGear = onSnapshot(usedGearQuery, (snapshot) => {
      usedGearItems = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.name || data.title,
          description: data.description || '',
          category: data.category || '',
          itemType: data.type === 'Materials & Consumables' ? 'non-equipment' : 'equipment',
          price: data.price || 0,
          condition: data.condition || 'Good',
          location: '',
          sellerId: data.sellerId || '',
          sellerName: data.sellerName || data.storeName || '',
          sellerPhone: '',
          imageUrl: data.images?.[0] || '',
          images: data.images || [],
          status: data.status || 'pending',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate(),
          source: 'used_gear',
        };
      }) as StoreItem[];
      setItems([...salesItems, ...usedGearItems].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
      setLoading(false);
    }, (error) => {
      console.error('Error loading used gear:', error);
    });

    return () => {
      unsubscribeSales();
      unsubscribeUsedGear();
    };
  }, []);

  // Helper: extract dimensions from title (e.g. "8x8", "12 X 12")
  const dimRegex = /(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)/;
  const sizeStripRegex = /[\s(]*\d+(?:\.\d+)?\s*[xX×]\s*\d+(?:\.\d+)?\s*(?:ft|feet)?[)\s]*/gi;

  const extractSize = (title: string): string | null => {
    const match = dimRegex.exec(title);
    return match ? `${match[1]} x ${match[2]} ft` : null;
  };

  const getBaseName = (title: string): string => {
    return title.replace(sizeStripRegex, '').replace(/[,\s()]+$/g, '').replace(/^[,\s()]+/g, '').trim().toUpperCase();
  };

  const handleOpenForm = (item?: StoreItem) => {
    if (item) {
      setEditingItem(item);
      // For Diffusion Materials, strip dimensions from title to show clean name
      const cleanTitle = item.category === 'Diffusion Materials'
        ? item.title.replace(sizeStripRegex, '').replace(/\s*(half roll|full roll)\s*/gi, '').replace(/,/g, '').trim()
        : item.title;
      setFormData({
        title: cleanTitle,
        description: item.description,
        category: item.category,
        itemType: item.itemType || 'equipment',
        price: item.price.toString(),
        condition: item.condition,
        location: item.location,
        sellerName: item.sellerName,
        sellerPhone: item.sellerPhone,
        sellerFgId: item.sellerFgId || '',
        imageUrl: item.imageUrl || '',
        status: item.status,
      });
      setImagePreview(item.imageUrl || null);
      // Initialize size prices from grouped variants when editing a Diffusion Materials item
      if (item.category === 'Diffusion Materials') {
        const baseName = getBaseName(item.title);
        const relatedItems = items.filter(i => i.category === 'Diffusion Materials' && getBaseName(i.title) === baseName && i.sellerName === item.sellerName);
        const sp: Record<string, string> = {};
        for (const ri of relatedItems) {
          const size = extractSize(ri.title);
          if (size) sp[size] = ri.price.toString();
          if (ri.title.toLowerCase().includes('half roll')) sp['Half Roll'] = ri.price.toString();
          if (ri.title.toLowerCase().includes('full roll')) sp['Full Roll'] = ri.price.toString();
        }
        setFormSizePrices(sp);
      } else {
        setFormSizePrices({});
      }
    } else {
      setEditingItem(null);
      setFormSizePrices({});
      setFormData({
        title: '',
        description: '',
        category: '',
        itemType: 'equipment',
        price: '',
        condition: 'Good',
        location: '',
        sellerName: '',
        sellerPhone: '',
        sellerFgId: '',
        imageUrl: '',
        status: 'pending',
      });
      setImagePreview(null);
    }
    setImageFile(null);
    setShowForm(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    if (!storage) throw new Error('Storage not initialized');
    
    // Sanitize filename - remove special characters
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const timestamp = Date.now();
    const fileName = `store-items/${timestamp}_${sanitizedName}`;
    const storageRef = ref(storage, fileName);
    
    console.log('Uploading to:', fileName);
    console.log('User authenticated:', !!user);
    
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    console.log('Upload successful, URL:', url);
    return url;
  };

  const handleSaveItem = async () => {
    const hasSizePrices = formData.category === 'Diffusion Materials' && Object.keys(formSizePrices).length > 0;
    if (!formData.title || !formData.category || (!hasSizePrices && !formData.price)) {
      alert('Please fill in all required fields');
      return;
    }

    if (hasSizePrices) {
      // Validate all size prices
      for (const [size, price] of Object.entries(formSizePrices)) {
        if (!price || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
          alert(`Please enter a valid price for size: ${size}`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      let imageUrl = formData.imageUrl;
      
      // Upload image if a new file was selected
      if (imageFile) {
        setUploadingImage(true);
        try {
          imageUrl = await uploadImage(imageFile);
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          alert('Failed to upload image. Please try again.');
          setSaving(false);
          setUploadingImage(false);
          return;
        }
        setUploadingImage(false);
      }

      // Clean base title (strip any leftover dimensions/commas)
      const cleanTitle = formData.title
        .replace(/[\s(]*\d+(?:\.\d+)?\s*[xX×]\s*\d+(?:\.\d+)?\s*(?:ft|feet)?[)\s]*/gi, '')
        .replace(/\s*(half roll|full roll)\s*/gi, '')
        .replace(/,/g, '')
        .trim();

      if (hasSizePrices) {
        // Create/update separate documents per size
        if (editingItem) {
          // Find all existing variants for this product
          const baseName = getBaseName(editingItem.title);
          const existingVariants = items.filter(i => 
            i.category === 'Diffusion Materials' && 
            getBaseName(i.title) === baseName && 
            i.sellerName === editingItem.sellerName
          );

          // Update existing variants and create new ones
          const processedSizes = new Set<string>();
          for (const variant of existingVariants) {
            const size = extractSize(variant.title);
            const isHalfRoll = variant.title.toLowerCase().includes('half roll');
            const isFullRoll = variant.title.toLowerCase().includes('full roll');
            const sizeKey = size || (isHalfRoll ? 'Half Roll' : isFullRoll ? 'Full Roll' : null);
            
            if (sizeKey && sizeKey in formSizePrices) {
              // Update existing variant
              const collectionName = variant.source || 'sales_items';
              const sizeLabel = sizeKey === 'Half Roll' || sizeKey === 'Full Roll' ? sizeKey : `(${sizeKey.replace(' ft', '')})`;
              await updateDoc(doc(db, collectionName, variant.id), {
                title: `${cleanTitle} ${sizeLabel}`,
                description: formData.description,
                category: formData.category,
                itemType: formData.itemType,
                price: parseFloat(formSizePrices[sizeKey]) || 0,
                condition: formData.condition,
                location: formData.location,
                sellerName: formData.sellerName,
                sellerPhone: formData.sellerPhone,
                sellerFgId: formData.sellerFgId || null,
                imageUrl: imageUrl || null,
                status: formData.status,
                updatedAt: Timestamp.now(),
              });
              processedSizes.add(sizeKey);
            } else if (sizeKey) {
              // Size was deselected — delete the variant
              const collectionName = variant.source || 'sales_items';
              await deleteDoc(doc(db, collectionName, variant.id));
            }
          }

          // Create new size variants that didn't exist before
          for (const [size, price] of Object.entries(formSizePrices)) {
            if (!processedSizes.has(size)) {
              const sizeLabel = size === 'Half Roll' || size === 'Full Roll' ? size : `(${size.replace(' ft', '')})`;
              await addDoc(collection(db, 'sales_items'), {
                title: `${cleanTitle} ${sizeLabel}`,
                description: formData.description,
                category: formData.category,
                itemType: formData.itemType,
                price: parseFloat(price) || 0,
                condition: formData.condition,
                location: formData.location,
                sellerName: formData.sellerName,
                sellerPhone: formData.sellerPhone,
                sellerFgId: formData.sellerFgId || null,
                imageUrl: imageUrl || null,
                status: formData.status,
                sellerId: user?.uid || 'admin',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
              });
            }
          }
        } else {
          // Creating new — one doc per size
          for (const [size, price] of Object.entries(formSizePrices)) {
            const sizeLabel = size === 'Half Roll' || size === 'Full Roll' ? size : `(${size.replace(' ft', '')})`;
            await addDoc(collection(db, 'sales_items'), {
              title: `${cleanTitle} ${sizeLabel}`,
              description: formData.description,
              category: formData.category,
              itemType: formData.itemType,
              price: parseFloat(price) || 0,
              condition: formData.condition,
              location: formData.location,
              sellerName: formData.sellerName,
              sellerPhone: formData.sellerPhone,
              sellerFgId: formData.sellerFgId || null,
              imageUrl: imageUrl || null,
              status: formData.status,
              sellerId: user?.uid || 'admin',
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            });
          }
        }
      } else {
        // Non-size item — single doc
        const itemData = {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          itemType: formData.itemType,
          price: parseFloat(formData.price) || 0,
          condition: formData.condition,
          location: formData.location,
          sellerName: formData.sellerName,
          sellerPhone: formData.sellerPhone,
          sellerFgId: formData.sellerFgId || null,
          imageUrl: imageUrl || null,
          status: formData.status,
          updatedAt: Timestamp.now(),
        };

        if (editingItem) {
          const collectionName = editingItem.source || 'sales_items';
          await updateDoc(doc(db, collectionName, editingItem.id), itemData);
        } else {
          await addDoc(collection(db, 'sales_items'), {
            ...itemData,
            sellerId: user?.uid || 'admin',
            createdAt: Timestamp.now(),
          });
        }
      }

      setShowForm(false);
      setEditingItem(null);
      setFormSizePrices({});
    } catch (error: any) {
      console.error('Error saving item:', error);
      alert(`Failed to save item: ${error?.message || error}`);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (itemId: string, newStatus: ItemStatus, reason?: string, source?: 'sales_items' | 'used_gear') => {
    try {
      const updateData: any = {
        status: newStatus,
        updatedAt: Timestamp.now(),
      };
      
      if (newStatus === 'approved') {
        updateData.approvedAt = Timestamp.now();
        updateData.approvedBy = user?.uid || 'admin';
      }
      
      if (newStatus === 'rejected' && reason) {
        updateData.rejectionReason = reason;
      }

      // Determine which collection to update
      const collectionName = source || 'sales_items';
      await updateDoc(doc(db, collectionName, itemId), updateData);
      setShowMenu(null);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const handleDeleteItem = async (itemId: string, source?: 'sales_items' | 'used_gear') => {
    try {
      const collectionName = source || 'sales_items';
      await deleteDoc(doc(db, collectionName, itemId));
      setShowMenu(null);
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  };

  // Excel upload handling
  const handleExcelFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const mappedData = jsonData.map((row: any) => {
          const itemType = mapItemType(row['Type'] || row['Item Type'] || row['itemType'] || 'equipment');
          return {
            title: row['Title'] || row['title'] || row['Name'] || row['name'] || '',
            description: row['Description'] || row['description'] || '',
            category: mapStoreCategory(row['Category'] || row['category'] || '', itemType),
            itemType,
            price: Number(row['Price'] || row['price'] || 0),
            condition: row['Condition'] || row['condition'] || 'Good',
            location: row['Location'] || row['location'] || '',
            sellerName: row['Seller Name'] || row['sellerName'] || row['Seller'] || '',
            sellerPhone: row['Seller Phone'] || row['sellerPhone'] || row['Phone'] || '',
          };
        });

        const validData = mappedData.filter((item) => item.title && item.category && item.price > 0);
        setExcelData(validData);
        setShowExcelModal(true);
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        alert('Failed to parse Excel file. Please check the format.');
      }
    };
    reader.readAsArrayBuffer(file);
    
    if (excelInputRef.current) {
      excelInputRef.current.value = '';
    }
  };

  const mapItemType = (type: string): ItemType => {
    const normalized = type.toLowerCase().trim();
    if (normalized.includes('non') || normalized.includes('consumable') || normalized.includes('material')) {
      return 'non-equipment';
    }
    return 'equipment';
  };

  const mapStoreCategory = (category: string, itemType: ItemType): string => {
    const normalized = category.toLowerCase().trim();
    
    if (itemType === 'equipment') {
      const equipmentMap: Record<string, string> = {
        'used': 'Used Equipment',
        'used equipment': 'Used Equipment',
        'camera': 'Cameras',
        'cameras': 'Cameras',
        'lens': 'Lenses',
        'lenses': 'Lenses',
        'light': 'Lighting',
        'lighting': 'Lighting',
        'audio': 'Audio',
        'sound': 'Audio',
        'grip': 'Grip',
        'drone': 'Drones',
        'drones': 'Drones',
        'storage': 'Storage',
        'accessory': 'Accessories',
        'accessories': 'Accessories',
        'sale': 'Sales',
        'sales': 'Sales',
      };
      return equipmentMap[normalized] || EQUIPMENT_CATEGORIES.find(c => c.toLowerCase() === normalized) || category;
    } else {
      const nonEquipmentMap: Record<string, string> = {
        'gel': 'Gels & Filters',
        'gels': 'Gels & Filters',
        'filter': 'Gels & Filters',
        'filters': 'Gels & Filters',
        'cable': 'Cables & Electrical',
        'cables': 'Cables & Electrical',
        'electrical': 'Cables & Electrical',
        'bulb': 'Bulbs & Lamps',
        'bulbs': 'Bulbs & Lamps',
        'lamp': 'Bulbs & Lamps',
        'lamps': 'Bulbs & Lamps',
        'diffusion': 'Diffusion Materials',
        'consumable': 'Consumables',
        'consumables': 'Consumables',
        'prop': 'Props',
        'props': 'Props',
        'costume': 'Costumes',
        'costumes': 'Costumes',
        'other': 'Other',
      };
      return nonEquipmentMap[normalized] || NON_EQUIPMENT_CATEGORIES.find(c => c.toLowerCase() === normalized) || category;
    }
  };

  const handleExcelUpload = async () => {
    if (excelData.length === 0) return;

    setIsUploadingExcel(true);
    setUploadProgress({ current: 0, total: excelData.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < excelData.length; i++) {
      try {
        await addDoc(collection(db, 'sales_items'), {
          title: excelData[i].title,
          name: excelData[i].title, // Flutter app may use 'name' field
          description: excelData[i].description || '',
          category: excelData[i].category,
          itemType: excelData[i].itemType,
          price: excelData[i].price,
          condition: excelData[i].condition || 'Good',
          location: excelData[i].location || '',
          sellerName: excelData[i].sellerName || '',
          sellerPhone: excelData[i].sellerPhone || '',
          sellerId: user?.uid || 'admin',
          imageUrl: '',
          images: [], // Empty array for images to be added later
          status: 'approved',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        successCount++;
      } catch (error) {
        console.error(`Error creating item ${excelData[i].title}:`, error);
        failCount++;
      }
      setUploadProgress({ current: i + 1, total: excelData.length });
    }

    setIsUploadingExcel(false);
    setShowExcelModal(false);
    setExcelData([]);
    
    alert(`Upload complete!\n✓ ${successCount} items created\n✗ ${failCount} failed`);
  };

  const removeExcelItem = (index: number) => {
    setExcelData((prev) => prev.filter((_, i) => i !== index));
  };

  const downloadStoreTemplate = () => {
    const template = [
      { Title: 'Sony FX3 (Used)', Type: 'Equipment', Category: 'Cameras', Description: 'Full-frame cinema camera in excellent condition', Price: 250000, Condition: 'Like New', Location: 'Mumbai', 'Seller Name': 'John Doe', 'Seller Phone': '+919876543210' },
      { Title: 'Canon RF 24-70mm f/2.8', Type: 'Equipment', Category: 'Lenses', Description: 'Professional zoom lens', Price: 150000, Condition: 'Good', Location: 'Delhi', 'Seller Name': 'Jane Smith', 'Seller Phone': '+919876543211' },
      { Title: 'Lee Filters Set', Type: 'Non-Equipment', Category: 'Gels & Filters', Description: 'Complete gel filter set', Price: 5000, Condition: 'New', Location: 'Bangalore', 'Seller Name': 'Mike Wilson', 'Seller Phone': '+919876543212' },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Store Items');
    XLSX.writeFile(wb, 'store_catalogue_template.xlsx');
  };

  const exportStoreToExcel = () => {
    const exportData = items.map(item => ({
      'Title': item.title || '',
      'Type': item.itemType || '',
      'Category': item.category || '',
      'Price': item.price || 0,
      'Condition': item.condition || '',
      'Location': item.location || '',
      'Seller Name': item.sellerName || '',
      'Seller Phone': item.sellerPhone || '',
      'Status': item.status || '',
      'Description': item.description || '',
      'Created At': item.createdAt ? format(item.createdAt, 'yyyy-MM-dd HH:mm') : '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Store Catalogue');
    XLSX.writeFile(wb, `store_catalogue_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesSearch = 
      item.title?.toLowerCase().includes(search.toLowerCase()) ||
      item.sellerName?.toLowerCase().includes(search.toLowerCase()) ||
      item.category?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesType = activeTab === 'all' || item.itemType === activeTab;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Collect available sizes from filtered items
  const availableSizes: string[] = (() => {
    const sizes = new Set<string>();
    for (const item of filteredItems) {
      const size = extractSize(item.title);
      if (size) sizes.add(size);
    }
    return Array.from(sizes).sort();
  })();

  // Apply size filter to items before grouping
  const sizeFilteredItems = sizeFilter === 'all'
    ? filteredItems
    : filteredItems.filter((item) => {
        const size = extractSize(item.title);
        return size === sizeFilter;
      });

  // Group items by base name + seller (only if they have dimensions)
  interface GroupedItem {
    baseName: string;
    displayTitle: string;
    variants: StoreItem[];
  }

  const groupedItems: GroupedItem[] = (() => {
    const groups = new Map<string, StoreItem[]>();
    for (const item of sizeFilteredItems) {
      const hasDim = dimRegex.test(item.title);
      const baseName = getBaseName(item.title);
      const key = hasDim ? `${baseName}||${item.sellerName}` : `UNIQUE_${item.id}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }
    return Array.from(groups.values()).map((variants) => {
      // Sort variants by dimension area (smallest to largest)
      variants.sort((a, b) => {
        const matchA = dimRegex.exec(a.title);
        const matchB = dimRegex.exec(b.title);
        const areaA = matchA ? parseFloat(matchA[1]) * parseFloat(matchA[2]) : 0;
        const areaB = matchB ? parseFloat(matchB[1]) * parseFloat(matchB[2]) : 0;
        return areaA - areaB;
      });
      const first = variants[0];
      const hasSizes = variants.length > 1;
      return {
        baseName: getBaseName(first.title),
        displayTitle: hasSizes ? first.title.replace(sizeStripRegex, '').replace(/[,\s()]+$/g, '').replace(/^[,\s()]+/g, '').trim() : first.title,
        variants,
      };
    });
  })();

  // Stats
  const stats = {
    total: items.length,
    pending: items.filter(i => i.status === 'pending').length,
    approved: items.filter(i => i.status === 'approved').length,
    equipment: items.filter(i => i.itemType === 'equipment').length,
    nonEquipment: items.filter(i => i.itemType === 'non-equipment').length,
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Store Catalogue</h1>
          <p className="text-gray-500">Manage sales items - equipment and non-equipment</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportStoreToExcel}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Download className="h-4 w-4" />
            Export Excel
          </button>
          <button
            onClick={() => excelInputRef.current?.click()}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Import Excel
          </button>
          <input
            ref={excelInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleExcelFileSelect}
            className="hidden"
          />
          <button
            onClick={() => handleOpenForm()}
            className="flex items-center gap-2 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Items</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-yellow-100 p-2">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending Review</p>
              <p className="text-xl font-bold">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Approved</p>
              <p className="text-xl font-bold">{stats.approved}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-100 p-2">
              <Camera className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Equipment</p>
              <p className="text-xl font-bold">{stats.equipment}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-orange-100 p-2">
              <Store className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Non-Equipment</p>
              <p className="text-xl font-bold">{stats.nonEquipment}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b">
        <button
          onClick={() => setActiveTab('all')}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${
            activeTab === 'all'
              ? 'border-yellow-500 text-yellow-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          All Items ({items.length})
        </button>
        <button
          onClick={() => setActiveTab('equipment')}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${
            activeTab === 'equipment'
              ? 'border-yellow-500 text-yellow-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Camera className="mr-1 inline h-4 w-4" />
          Equipment ({stats.equipment})
        </button>
        <button
          onClick={() => setActiveTab('non-equipment')}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${
            activeTab === 'non-equipment'
              ? 'border-yellow-500 text-yellow-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Store className="mr-1 inline h-4 w-4" />
          Non-Equipment ({stats.nonEquipment})
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search items, sellers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border py-2 pl-10 pr-4 text-sm focus:border-yellow-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'pending', 'approved', 'rejected', 'sold'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                statusFilter === status
                  ? status === 'all'
                    ? 'bg-yellow-100 text-yellow-700'
                    : statusColors[status]
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Size Filter - shown when there are items with sizes */}
      {availableSizes.length > 0 && (
        <div className="relative inline-block">
          <button
            onClick={() => setShowSizeDropdown(!showSizeDropdown)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              sizeFilter !== 'all'
                ? 'border-purple-300 bg-purple-50 text-purple-700'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-4 w-4" />
            {sizeFilter === 'all' ? 'Filter by Size' : sizeFilter}
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {sizeFilter !== 'all' && (
            <button
              onClick={() => setSizeFilter('all')}
              className="ml-2 rounded-full bg-purple-100 p-1 text-purple-600 hover:bg-purple-200"
              title="Clear size filter"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {showSizeDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSizeDropdown(false)} />
              <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border bg-white py-2 shadow-xl">
                <label
                  className="flex cursor-pointer items-center gap-3 px-4 py-2 hover:bg-gray-50"
                  onClick={() => { setSizeFilter('all'); setShowSizeDropdown(false); }}
                >
                  <input
                    type="radio"
                    name="sizeFilter"
                    checked={sizeFilter === 'all'}
                    onChange={() => {}}
                    className="h-4 w-4 accent-purple-600"
                  />
                  <span className="text-sm font-medium text-gray-700">All Sizes</span>
                </label>
                <div className="my-1 border-t" />
                {availableSizes.map((size) => (
                  <label
                    key={size}
                    className="flex cursor-pointer items-center gap-3 px-4 py-2 hover:bg-gray-50"
                    onClick={() => { setSizeFilter(size); setShowSizeDropdown(false); }}
                  >
                    <input
                      type="radio"
                      name="sizeFilter"
                      checked={sizeFilter === size}
                      onChange={() => {}}
                      className="h-4 w-4 accent-purple-600"
                    />
                    <span className="text-sm text-gray-700">{size}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (() => {
        // Count total variants across selected groups
        const selectedGroups = groupedItems.filter(g => selectedIds.has(g.variants[0].id));
        const totalVariants = selectedGroups.reduce((sum, g) => sum + g.variants.length, 0);
        return (
          <div className="flex items-center gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <span className="text-sm font-medium text-red-700">{selectedIds.size} product(s) selected ({totalVariants} items total)</span>
            <button
              onClick={async () => {
                if (!confirm(`Are you sure you want to delete ${selectedIds.size} product(s) (${totalVariants} items)?`)) return;
                for (const group of selectedGroups) {
                  for (const v of group.variants) {
                    await handleDeleteItem(v.id, v.source);
                  }
                }
                setSelectedIds(new Set());
              }}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4" /> Delete Selected
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear Selection
            </button>
          </div>
        );
      })()}

      {/* Table */}
      <div className="rounded-lg border bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={groupedItems.length > 0 && groupedItems.every(g => selectedIds.has(g.variants[0].id))}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const allIds = new Set<string>();
                      groupedItems.forEach(g => allIds.add(g.variants[0].id));
                      setSelectedIds(allIds);
                    } else {
                      setSelectedIds(new Set());
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Item
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Type / Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Seller
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {groupedItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No items found
                </td>
              </tr>
            ) : (
              groupedItems.map((group) => {
                const item = group.variants[0];
                const hasSizes = group.variants.length > 1;
                return (
                  <tr
                    key={item.id}
                    className={`cursor-pointer hover:bg-gray-50 ${selectedIds.has(item.id) ? 'bg-yellow-50' : ''}`}
                    onClick={() => setSelectedItem(item)}
                  >
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={(e) => {
                          const newSet = new Set(selectedIds);
                          if (e.target.checked) {
                            newSet.add(item.id);
                          } else {
                            newSet.delete(item.id);
                          }
                          setSelectedIds(newSet);
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
                            <ImageIcon className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{group.displayTitle}</p>
                          {hasSizes ? (
                            <p className="mt-0.5 text-xs text-purple-600">{group.variants.length} sizes available</p>
                          ) : (
                            <p className="text-xs text-gray-500">{item.sellerName}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium ${
                        item.itemType === 'equipment' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {item.itemType === 'equipment' ? 'Equipment' : 'Non-Equip.'}
                      </span>
                      <p className="mt-1 text-sm text-gray-600 whitespace-nowrap">{item.category}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{item.sellerName}</p>
                      <p className="text-xs text-gray-500">{item.sellerFgId || item.sellerId?.slice(0, 8)}</p>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      {hasSizes ? (
                        <div>
                          {group.variants.map((v) => {
                            const size = extractSize(v.title) || 'Default';
                            const editKey = v.id;
                            const isEditing = editKey in variantPrices;
                            const isSaving = savingVariantId === v.id;
                            return (
                              <div key={v.id} className="flex items-center gap-1.5 py-0.5">
                                <span className="text-[10px] text-gray-500 w-14 truncate" title={size}>{size.replace(' ft', '')}</span>
                                {isEditing ? (
                                  <div className="flex items-center gap-1">
                                    <div className="flex items-center rounded border border-green-300 bg-white">
                                      <span className="pl-1 text-xs text-gray-400">₹</span>
                                      <input
                                        type="number"
                                        value={variantPrices[editKey]}
                                        onChange={(e) => setVariantPrices(prev => ({ ...prev, [editKey]: e.target.value }))}
                                        className="w-16 border-0 px-1 py-0.5 text-xs font-medium text-gray-900 focus:outline-none"
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === 'Escape') {
                                            setVariantPrices(prev => { const next = { ...prev }; delete next[editKey]; return next; });
                                          }
                                        }}
                                      />
                                    </div>
                                    <button
                                      disabled={isSaving}
                                      onClick={async () => {
                                        const newPrice = parseFloat(variantPrices[editKey]);
                                        if (isNaN(newPrice) || newPrice < 0) return;
                                        setSavingVariantId(v.id);
                                        try {
                                          const collectionName = v.source || 'sales_items';
                                          await updateDoc(doc(db, collectionName, v.id), { price: newPrice, updatedAt: Timestamp.now() });
                                          setVariantPrices(prev => { const next = { ...prev }; delete next[editKey]; return next; });
                                        } catch (error) {
                                          console.error('Error updating price:', error);
                                          alert('Failed to update price');
                                        } finally {
                                          setSavingVariantId(null);
                                        }
                                      }}
                                      className="text-green-600 hover:text-green-800"
                                    >
                                      {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                                    </button>
                                    <button
                                      onClick={() => setVariantPrices(prev => { const next = { ...prev }; delete next[editKey]; return next; })}
                                      className="text-gray-400 hover:text-gray-600"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setVariantPrices(prev => ({ ...prev, [editKey]: v.price.toString() }))}
                                    className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-800"
                                    title="Click to edit price"
                                  >
                                    ₹{v.price.toLocaleString()}
                                    <Edit className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        (() => {
                          const editKey = item.id;
                          const isEditing = editKey in variantPrices;
                          const isSaving = savingVariantId === item.id;
                          return isEditing ? (
                            <div className="flex items-center gap-1">
                              <div className="flex items-center rounded border border-green-300 bg-white">
                                <span className="pl-1 text-xs text-gray-400">₹</span>
                                <input
                                  type="number"
                                  value={variantPrices[editKey]}
                                  onChange={(e) => setVariantPrices(prev => ({ ...prev, [editKey]: e.target.value }))}
                                  className="w-20 border-0 px-1 py-0.5 text-sm font-medium text-gray-900 focus:outline-none"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                      setVariantPrices(prev => { const next = { ...prev }; delete next[editKey]; return next; });
                                    }
                                  }}
                                />
                              </div>
                              <button
                                disabled={isSaving}
                                onClick={async () => {
                                  const newPrice = parseFloat(variantPrices[editKey]);
                                  if (isNaN(newPrice) || newPrice < 0) return;
                                  setSavingVariantId(item.id);
                                  try {
                                    const collectionName = item.source || 'sales_items';
                                    await updateDoc(doc(db, collectionName, item.id), { price: newPrice, updatedAt: Timestamp.now() });
                                    setVariantPrices(prev => { const next = { ...prev }; delete next[editKey]; return next; });
                                  } catch (error) {
                                    console.error('Error updating price:', error);
                                    alert('Failed to update price');
                                  } finally {
                                    setSavingVariantId(null);
                                  }
                                }}
                                className="text-green-600 hover:text-green-800"
                              >
                                {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                              </button>
                              <button
                                onClick={() => setVariantPrices(prev => { const next = { ...prev }; delete next[editKey]; return next; })}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setVariantPrices(prev => ({ ...prev, [editKey]: item.price.toString() }))}
                              className="font-medium text-green-600 hover:text-green-800 hover:underline"
                              title="Click to edit price"
                            >
                              ₹{item.price.toLocaleString()}
                            </button>
                          );
                        })()
                      )}
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      {hasSizes ? (
                        <select
                          value={group.variants.every(v => v.status === group.variants[0].status) ? group.variants[0].status : 'mixed' as string}
                          onChange={(e) => {
                            const newStatus = e.target.value as ItemStatus;
                            if (newStatus === 'mixed' as string) return;
                            const reason = newStatus === 'rejected' ? prompt('Rejection reason:') ?? undefined : undefined;
                            if (newStatus === 'rejected' && !reason) return;
                            for (const v of group.variants) {
                              handleStatusChange(v.id, newStatus, reason, v.source);
                            }
                          }}
                          className={`rounded-lg border px-2 py-1 text-xs font-medium focus:outline-none ${
                            group.variants.every(v => v.status === group.variants[0].status)
                              ? statusColors[group.variants[0].status]
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {!group.variants.every(v => v.status === group.variants[0].status) && (
                            <option value="mixed" disabled>Mixed</option>
                          )}
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                          <option value="sold">Sold</option>
                        </select>
                      ) : (
                        <select
                          value={item.status}
                          onChange={(e) => {
                            const newStatus = e.target.value as ItemStatus;
                            if (newStatus === 'rejected') {
                              const reason = prompt('Rejection reason:');
                              if (reason) handleStatusChange(item.id, newStatus, reason, item.source);
                            } else {
                              handleStatusChange(item.id, newStatus, undefined, item.source);
                            }
                          }}
                          className={`rounded-lg border px-2 py-1 text-xs font-medium focus:outline-none ${statusColors[item.status]}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                          <option value="sold">Sold</option>
                        </select>
                      )}
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        <button
                          onClick={() => setShowMenu(showMenu === item.id ? null : item.id)}
                          className="rounded p-1 hover:bg-gray-100"
                        >
                          <MoreVertical className="h-5 w-5 text-gray-500" />
                        </button>
                        {showMenu === item.id && (
                          <div className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-lg border bg-white py-1 shadow-xl">
                            <button
                              onClick={() => {
                                handleOpenForm(item);
                                setShowMenu(null);
                              }}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50"
                            >
                              <Edit className="h-4 w-4" /> Edit
                            </button>
                            <button
                              onClick={() => {
                                setSelectedItem(item);
                                setShowMenu(null);
                              }}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50"
                            >
                              <Eye className="h-4 w-4" /> View Details
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete ${hasSizes ? `all ${group.variants.length} size variants of "${group.displayTitle}"` : `"${item.title}"`}?`)) {
                                  for (const v of group.variants) {
                                    handleDeleteItem(v.id, v.source);
                                  }
                                }
                                setShowMenu(null);
                              }}
                              className="flex w-full items-center gap-2 border-t px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" /> Delete{hasSizes ? ` (${group.variants.length} sizes)` : ''}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Item Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingItem ? 'Edit Item' : 'Add New Item'}
              </h2>
              <button onClick={() => setShowForm(false)} className="rounded-full p-1 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-yellow-500 focus:outline-none"
                  placeholder="Item title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-yellow-500 focus:outline-none"
                  placeholder="Item description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Item Type *</label>
                  <select
                    value={formData.itemType}
                    onChange={(e) => setFormData({ ...formData, itemType: e.target.value as ItemType, category: '' })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-yellow-500 focus:outline-none"
                  >
                    <option value="equipment">Equipment</option>
                    <option value="non-equipment">Non-Equipment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-yellow-500 focus:outline-none"
                  >
                    <option value="">Select category</option>
                    {(formData.itemType === 'equipment' ? EQUIPMENT_CATEGORIES : NON_EQUIPMENT_CATEGORIES).map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Size selector for Diffusion Materials */}
              {formData.category === 'Diffusion Materials' && (() => {
                const diffusionSizes = (() => {
                  const excludedSizes = new Set(['2 x 3 ft', '8 x 10 ft']);
                  const sizes = new Set<string>();
                  for (const item of items) {
                    if (item.category === 'Diffusion Materials') {
                      const size = extractSize(item.title);
                      if (size && !excludedSizes.has(size)) sizes.add(size);
                    }
                  }
                  return Array.from(sizes).sort((a, b) => {
                    const matchA = dimRegex.exec(a);
                    const matchB = dimRegex.exec(b);
                    const areaA = matchA ? parseFloat(matchA[1]) * parseFloat(matchA[2]) : 0;
                    const areaB = matchB ? parseFloat(matchB[1]) * parseFloat(matchB[2]) : 0;
                    return areaA - areaB;
                  });
                })();
                const allOptions = [...diffusionSizes, 'Half Roll', 'Full Roll'];

                const handleSizeToggle = (size: string) => {
                  setFormSizePrices(prev => {
                    const next = { ...prev };
                    if (size in next) {
                      delete next[size];
                    } else {
                      next[size] = formData.price || '0';
                    }
                    return next;
                  });
                };

                return (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Sizes & Pricing</label>
                    <p className="mt-0.5 text-xs text-gray-400">Select sizes and set individual pricing</p>
                    <div className="mt-2 space-y-1.5">
                      {allOptions.map((size) => {
                        const isSelected = size in formSizePrices;
                        return (
                          <div key={size} className="flex items-center gap-3">
                            <label
                              className="flex items-center gap-2 min-w-[140px] cursor-pointer"
                              onClick={() => handleSizeToggle(size)}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                readOnly
                                className="h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500 cursor-pointer"
                              />
                              <span className="text-sm font-medium text-gray-700">{size}</span>
                            </label>
                            {isSelected ? (
                              <div className="flex items-center rounded-lg border border-gray-300 bg-white">
                                <span className="pl-2 text-sm text-gray-400">₹</span>
                                <input
                                  type="number"
                                  value={formSizePrices[size]}
                                  onChange={(e) => setFormSizePrices(prev => ({ ...prev, [size]: e.target.value }))}
                                  className="w-24 border-0 px-2 py-1.5 text-sm font-medium text-gray-900 focus:outline-none rounded-lg"
                                  placeholder="Price"
                                />
                              </div>
                            ) : (
                              <div className="flex items-center rounded-lg border border-gray-200 bg-gray-100">
                                <span className="px-2 py-1.5 text-sm text-gray-400">Pricing</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-4">
                {!(formData.category === 'Diffusion Materials' && Object.keys(formSizePrices).length > 0) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price (₹) *</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-yellow-500 focus:outline-none"
                    placeholder="0"
                  />
                </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Condition</label>
                  <select
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-yellow-500 focus:outline-none"
                  >
                    {conditionOptions.map((cond) => (
                      <option key={cond} value={cond}>{cond}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-yellow-500 focus:outline-none"
                  placeholder="City, State"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Seller Name</label>
                  <input
                    type="text"
                    value={formData.sellerName}
                    onChange={(e) => setFormData({ ...formData, sellerName: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-yellow-500 focus:outline-none"
                    placeholder="Seller name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Seller Phone</label>
                  <input
                    type="text"
                    value={formData.sellerPhone}
                    onChange={(e) => setFormData({ ...formData, sellerPhone: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-yellow-500 focus:outline-none"
                    placeholder="+91..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Seller FG_ID</label>
                  <input
                    type="text"
                    value={formData.sellerFgId}
                    onChange={(e) => setFormData({ ...formData, sellerFgId: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-yellow-500 focus:outline-none"
                    placeholder="FG_XXXXX"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Image</label>
                <input
                  type="file"
                  ref={imageInputRef}
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <div className="mt-1">
                  {(imagePreview || formData.imageUrl) ? (
                    <div className="relative">
                      <img
                        src={imagePreview || formData.imageUrl}
                        alt="Preview"
                        className="h-32 w-full rounded-lg object-cover border"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                          setFormData({ ...formData, imageUrl: '' });
                          if (imageInputRef.current) imageInputRef.current.value = '';
                        }}
                        className="absolute top-2 right-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="absolute bottom-2 right-2 rounded-lg bg-white/90 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-white"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="flex h-32 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 hover:border-yellow-500 hover:bg-yellow-50 transition-colors"
                    >
                      <div className="text-center">
                        <Upload className="mx-auto h-8 w-8 text-gray-400" />
                        <p className="mt-1 text-sm text-gray-500">Click to upload image</p>
                        <p className="text-xs text-gray-400">PNG, JPG up to 5MB</p>
                      </div>
                    </button>
                  )}
                </div>
                {uploadingImage && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-yellow-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading image...
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as ItemStatus })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-yellow-500 focus:outline-none"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="sold">Sold</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveItem}
                disabled={saving}
                className="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingItem ? 'Update Item' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Item Details</h2>
              <button onClick={() => { setSelectedItem(null); setVariantPrices({}); }} className="rounded-full p-1 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {selectedItem.imageUrl && (
                <img
                  src={selectedItem.imageUrl}
                  alt={selectedItem.title}
                  className="h-48 w-full rounded-lg object-cover"
                />
              )}

              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusColors[selectedItem.status]}`}>
                  {selectedItem.status.toUpperCase()}
                </span>
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${
                  selectedItem.itemType === 'equipment' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {selectedItem.itemType === 'equipment' ? 'Equipment' : 'Non-Equipment'}
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold">{selectedItem.title}</h3>
                <p className="text-gray-600">{selectedItem.description}</p>
              </div>

              {/* Available Sizes with Editable Pricing */}
              {(() => {
                const baseName = getBaseName(selectedItem.title);
                const sizeGroup = groupedItems.find(g => g.baseName === baseName && g.variants.some(v => v.sellerName === selectedItem.sellerName));
                if (sizeGroup && sizeGroup.variants.length > 1) {
                  return (
                    <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-purple-700">Dimension Pricing</h4>
                        <span className="text-xs text-purple-500">{sizeGroup.variants.length} sizes</span>
                      </div>
                      <div className="space-y-2">
                        {sizeGroup.variants.map((v) => {
                          const size = extractSize(v.title) || 'Default';
                          const editKey = v.id;
                          const isEditing = editKey in variantPrices;
                          const isSaving = savingVariantId === v.id;
                          return (
                            <div
                              key={v.id}
                              className={`flex items-center justify-between rounded-lg border px-3 py-2 transition-colors ${
                                v.id === selectedItem.id
                                  ? 'border-purple-400 bg-purple-100'
                                  : 'border-purple-200 bg-white hover:bg-purple-50'
                              }`}
                            >
                              <button
                                onClick={() => setSelectedItem(v)}
                                className="flex items-center gap-2 text-sm font-medium text-purple-700"
                              >
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-purple-200 text-xs font-bold text-purple-700">
                                  {size.split(' x ')[0]}
                                </span>
                                {size}
                              </button>
                              <div className="flex items-center gap-2">
                                {isEditing ? (
                                  <>
                                    <div className="flex items-center rounded-lg border border-purple-300 bg-white">
                                      <span className="pl-2 text-sm text-gray-400">₹</span>
                                      <input
                                        type="number"
                                        value={variantPrices[editKey]}
                                        onChange={(e) => setVariantPrices(prev => ({ ...prev, [editKey]: e.target.value }))}
                                        className="w-24 rounded-lg border-0 px-2 py-1 text-sm font-medium text-gray-900 focus:outline-none"
                                        autoFocus
                                      />
                                    </div>
                                    <button
                                      disabled={isSaving}
                                      onClick={async () => {
                                        const newPrice = parseFloat(variantPrices[editKey]);
                                        if (isNaN(newPrice) || newPrice < 0) {
                                          alert('Please enter a valid price');
                                          return;
                                        }
                                        setSavingVariantId(v.id);
                                        try {
                                          const collectionName = v.source || 'sales_items';
                                          await updateDoc(doc(db, collectionName, v.id), {
                                            price: newPrice,
                                            updatedAt: Timestamp.now(),
                                          });
                                          setVariantPrices(prev => {
                                            const next = { ...prev };
                                            delete next[editKey];
                                            return next;
                                          });
                                        } catch (error) {
                                          console.error('Error updating price:', error);
                                          alert('Failed to update price');
                                        } finally {
                                          setSavingVariantId(null);
                                        }
                                      }}
                                      className="rounded-lg bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                                    >
                                      {isSaving ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <CheckCircle className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                    <button
                                      onClick={() => setVariantPrices(prev => {
                                        const next = { ...prev };
                                        delete next[editKey];
                                        return next;
                                      })}
                                      className="rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-sm font-bold text-green-600">₹{v.price.toLocaleString()}</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setVariantPrices(prev => ({ ...prev, [editKey]: v.price.toString() }));
                                      }}
                                      className="rounded p-1 text-gray-400 hover:bg-purple-100 hover:text-purple-600"
                                      title="Edit price"
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-green-50 p-4">
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-5 w-5 text-green-600" />
                    <span className="text-sm text-green-600">Price</span>
                  </div>
                  <p className="text-xl font-bold text-green-700">₹{selectedItem.price.toLocaleString()}</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-600" />
                    <span className="text-sm text-blue-600">Condition</span>
                  </div>
                  <p className="text-xl font-bold text-blue-700">{selectedItem.condition}</p>
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-4">
                <h4 className="mb-2 text-sm font-medium text-gray-500">Category</h4>
                <p className="font-medium">{selectedItem.category}</p>
              </div>

              <div className="rounded-lg bg-gray-50 p-4">
                <h4 className="mb-2 text-sm font-medium text-gray-500">Seller Information</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span>{selectedItem.sellerName}</span>
                  </div>
                  {selectedItem.sellerPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{selectedItem.sellerPhone}</span>
                    </div>
                  )}
                  {selectedItem.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>{selectedItem.location}</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    FG_ID: {selectedItem.sellerFgId || 'N/A'} | User ID: {selectedItem.sellerId}
                  </p>
                </div>
              </div>

              {selectedItem.rejectionReason && (
                <div className="rounded-lg bg-red-50 p-4">
                  <h4 className="text-sm font-medium text-red-600">Rejection Reason</h4>
                  <p className="text-red-700">{selectedItem.rejectionReason}</p>
                </div>
              )}

              <div className="text-sm text-gray-500">
                Created: {format(selectedItem.createdAt, 'MMM d, yyyy h:mm a')}
                {selectedItem.approvedAt && (
                  <> | Approved: {format(selectedItem.approvedAt, 'MMM d, yyyy h:mm a')}</>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  handleOpenForm(selectedItem);
                  setSelectedItem(null);
                }}
                className="rounded-lg bg-yellow-100 px-4 py-2 text-sm font-medium text-yellow-600 hover:bg-yellow-200"
              >
                Edit Item
              </button>
              <button
                onClick={() => { setSelectedItem(null); setVariantPrices({}); }}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      {showExcelModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !isUploadingExcel && setShowExcelModal(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-xl bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Import Store Items from Excel</h2>
                <p className="text-sm text-gray-500">
                  {excelData.length} items ready to import
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={downloadStoreTemplate}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Download Template
                </button>
                <button
                  onClick={() => setShowExcelModal(false)}
                  disabled={isUploadingExcel}
                  className="rounded-lg p-2 hover:bg-gray-100 disabled:opacity-50"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-auto p-4">
              {excelData.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  No valid items found. Please check your Excel file format.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Title</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Type</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Category</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Price</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Condition</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Seller</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {excelData.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-900">{item.title}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            item.itemType === 'equipment' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {item.itemType === 'equipment' ? 'Equipment' : 'Non-Equipment'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-600">{item.category}</td>
                        <td className="px-3 py-2 text-green-600 font-medium">₹{item.price.toLocaleString()}</td>
                        <td className="px-3 py-2 text-gray-600">{item.condition}</td>
                        <td className="px-3 py-2 text-gray-600">{item.sellerName || '-'}</td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => removeExcelItem(index)}
                            disabled={isUploadingExcel}
                            className="text-red-600 hover:text-red-800 disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {isUploadingExcel && (
              <div className="border-t px-4 py-3">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-gray-600">Uploading...</span>
                  <span className="font-medium text-green-600">
                    {uploadProgress.current} / {uploadProgress.total}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-green-600 transition-all duration-300"
                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-t p-4">
              <p className="text-xs text-gray-500">
                Required: Title, Category, Price. Optional: Type, Description, Condition, Location, Seller info
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExcelModal(false)}
                  disabled={isUploadingExcel}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExcelUpload}
                  disabled={isUploadingExcel || excelData.length === 0}
                  className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {isUploadingExcel ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Import {excelData.length} Items
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
