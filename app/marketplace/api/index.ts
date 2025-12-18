// This file will contain Supabase and Firestore integration logic

import { createClient } from '@supabase/supabase-js';
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, updateDoc, query, where } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '../../../constants/firebase'; // Assuming firebase.ts exports your Firebase app instance

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize Firestore and Storage
export const db = getFirestore(app);
export const storage = getStorage(app);

// --- Supabase Storage Functions ---

/**
 * Uploads a file to Supabase storage.
 * @param fileUri The URI of the file to upload (e.g., from ImagePicker).
 * @param pathInBucket The desired path and filename within the 'marketplace' bucket (e.g., 'product_images/my-product.jpg').
 * @returns The public URL of the uploaded file.
 */
export const uploadFileToSupabase = async (fileUri: string, pathInBucket: string): Promise<string> => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL or Anon Key is not defined in environment variables.');
  }

  const response = await fetch(fileUri);
  const blob = await response.blob();

  const { data, error } = await supabase.storage
    .from('marketplace') // Ensure 'marketplace' bucket exists in Supabase
    .upload(pathInBucket, blob, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Supabase upload error: ${error.message}`);
  }

  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from('marketplace')
    .getPublicUrl(pathInBucket);

  return publicUrlData.publicUrl;
};

// --- Firestore Functions ---

export enum ProductCategory {
  MERCHANDISE = 'Merchandise',
  COLLECTIBLES = 'Collectibles',
  FILM_SERVICES = 'Film & Creator Services',
  DIGITAL_GOODS = 'Digital Goods',
  CREATIVE_ASSETS = 'Creative Assets',
  ADVERTISING = 'Advertising Slots',
  LIFESTYLE = 'Lifestyle & General Products',
  EVENTS = 'Event & Experience Sales',
}

export enum ProductType {
  PHYSICAL = 'Physical',
  DIGITAL = 'Digital',
  SERVICE = 'Service',
  EVENT = 'Event',
}

export interface Product {
  id?: string; // Optional for when adding new products
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  sellerId: string; // Assuming user authentication provides a seller ID
  sellerName: string;
  sellerContact?: string; // Optional field for seller contact information
  category: ProductCategory;
  productType: ProductType;
  createdAt: any; // Firebase Timestamp
  // Add more fields as needed, e.g., condition for physical items, duration for services/events
}

const productsCollection = collection(db, 'marketplace_products');

/**
 * Adds a new product to Firestore.
 * @param productData The product data to add.
 * @returns The ID of the newly created product.
 */
export const addProduct = async (productData: Omit<Product, 'id' | 'createdAt'> & {createdAt: any}): Promise<string> => {
  try {
    const docRef = await addDoc(productsCollection, {
      ...productData,
      createdAt: productData.createdAt,
    });
    return docRef.id;
  } catch (e) {
    console.error("Error adding document: ", e);
    throw e;
  }
};

/**
 * Fetches all products from Firestore.
 * @returns An array of Product objects.
 */
export const getProducts = async (): Promise<Product[]> => {
  try {
    const querySnapshot = await getDocs(productsCollection);
    const products: Product[] = [];
    querySnapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() } as Product);
    });
    return products;
  } catch (e) {
    console.error("Error getting documents: ", e);
    throw e;
  }
};

/**
 * Fetches a single product by its ID from Firestore.
 * @param id The ID of the product.
 * @returns The Product object or null if not found.
 */
export const getProductById = async (id: string): Promise<Product | null> => {
  try {
    const docRef = doc(db, 'marketplace_products', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Product;
    } else {
      return null;
    }
  } catch (e) {
    console.error("Error getting document: ", e);
    throw e;
  }
};

/**
 * Updates an existing product in Firestore.
 * @param id The ID of the product to update.
 * @param updates The fields to update.
 */
export const updateProduct = async (id: string, updates: Partial<Product>): Promise<void> => {
  try {
    const docRef = doc(db, 'marketplace_products', id);
    await updateDoc(docRef, updates);
  } catch (e) {
    console.error("Error updating document: ", e);
    throw e;
  }
};
