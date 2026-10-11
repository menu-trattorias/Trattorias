import { createClient } from '@supabase/supabase-js';
import { INITIAL_CATEGORIES, INITIAL_MENU_ITEMS } from '../data/initialMenuData';
import { INITIAL_SETTINGS } from '../data/initialSettings';

// Load Supabase credentials from Env or localStorage
const getSupabaseConfig = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const localUrl = localStorage.getItem('trattorias_supabase_url');
  const localKey = localStorage.getItem('trattorias_supabase_key');

  // Environment variables are preferred over localStorage
  const url = (envUrl && envUrl.trim()) || (localUrl && localUrl.trim()) || null;
  const key = (envKey && envKey.trim()) || (localKey && localKey.trim()) || null;

  let cleanUrl = null;
  if (url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'https:' || parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        cleanUrl = url.replace(/\/+$/, '');
      }
    } catch (_) {}
  }

  const cleanKey = key && key.length > 10 ? key : null;

  return {
    url: cleanUrl,
    key: cleanKey
  };
};

let supabaseClient = null;

export const getSupabase = () => {
  const { url, key } = getSupabaseConfig();
  if (url && key) {
    if (!supabaseClient || supabaseClient.supabaseUrl !== url) {
      supabaseClient = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
    }
    return supabaseClient;
  }
  return null;
};

export const isSupabaseConfigured = () => {
  const { url, key } = getSupabaseConfig();
  return Boolean(url && key);
};

// ================= SUPABASE STORAGE HELPERS =================
export const DEFAULT_STORAGE_BUCKET = 'trattorias-images';

/**
 * Format bytes into human readable format (e.g. 240 KB, 1.4 MB)
 */
export const formatBytes = (bytes, decimals = 1) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Helper to check whether browser canvas supports WebP export
 */
const checkWebPSupport = () => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  } catch (e) {
    return false;
  }
};

/**
 * Compress an image file using browser Canvas API (WebP / JPEG)
 * Preserves aspect ratio, resizes oversized images, handles EXIF orientation,
 * and reduces file size by 70-90% before uploading to Supabase.
 * 
 * @param {File|Blob} file - The original image file
 * @param {Object} options - Compression configuration (maxWidth, maxHeight, maxDimension, quality, format)
 * @returns {Promise<File>} Compressed File object
 */
export const compressImage = async (file, options = {}) => {
  // If not an image or is SVG/GIF, return directly
  if (!file || !file.type?.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return file;
  }

  const maxDimension = options.maxDimension || 1400;
  const maxWidth = options.maxWidth || maxDimension;
  const maxHeight = options.maxHeight || maxDimension;
  const quality = options.quality !== undefined ? options.quality : 0.82;

  // Prefer WebP, fall back to JPEG if canvas doesn't support WebP
  let targetFormat = options.format || 'image/webp';
  if (targetFormat === 'image/webp' && !checkWebPSupport()) {
    targetFormat = 'image/jpeg';
  }

  return new Promise((resolve) => {
    const processImageSource = (source, naturalWidth, naturalHeight) => {
      let width = naturalWidth;
      let height = naturalHeight;

      // Maintain aspect ratio while bounding within maxWidth & maxHeight
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // If falling back to JPEG, fill white background to avoid transparent black fill
      if (targetFormat === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(source, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          // If compression resulted in a larger file and dimensions did not scale down, keep original
          if (blob.size >= file.size && width === naturalWidth && height === naturalHeight) {
            const originalFile = file;
            originalFile.originalSize = file.size;
            originalFile.compressedSize = file.size;
            resolve(originalFile);
            return;
          }

          const rawName = file.name ? file.name.substring(0, file.name.lastIndexOf('.')) : 'image';
          const ext = targetFormat === 'image/webp' ? 'webp' : 'jpg';
          const compressedFile = new File([blob], `${rawName}.${ext}`, {
            type: targetFormat,
            lastModified: Date.now()
          });

          // Metadata for UI feedback
          compressedFile.originalSize = file.size;
          compressedFile.compressedSize = blob.size;

          resolve(compressedFile);
        },
        targetFormat,
        quality
      );
    };

    // Modern createImageBitmap with EXIF orientation support
    if (typeof createImageBitmap === 'function') {
      createImageBitmap(file, { imageOrientation: 'from-image' })
        .then((bitmap) => {
          processImageSource(bitmap, bitmap.width, bitmap.height);
        })
        .catch(() => {
          loadViaImageElement();
        });
    } else {
      loadViaImageElement();
    }

    function loadViaImageElement() {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        processImageSource(img, img.naturalWidth || img.width, img.naturalHeight || img.height);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };

      img.src = objectUrl;
    }
  });
};

/**
 * Upload an image file to Supabase Storage bucket with automatic client-side compression
 * @param {File|Blob} file - The file to upload
 * @param {Object} options - Options including bucket, folder, and compression options
 * @returns {Promise<{success: boolean, url: string, path: string, source: 'supabase'|'local', originalSize: number, compressedSize: number, stats: Object}>}
 */
export const uploadImageToSupabase = async (file, options = {}) => {
  const bucket = options.bucket || DEFAULT_STORAGE_BUCKET;
  const folder = options.folder || 'uploads';
  const supabase = getSupabase();

  if (!file) throw new Error('No file provided for upload');

  // Automatic client-side compression before upload
  let uploadFile = file;
  const originalSize = file.size;
  if (!options.skipCompression && options.compress !== false) {
    try {
      const compressionConfig = {
        maxWidth: options.maxWidth || options.maxDimension || 1400,
        maxHeight: options.maxHeight || options.maxDimension || 1400,
        maxDimension: options.maxDimension || 1400,
        quality: options.quality !== undefined ? options.quality : 0.82,
        format: options.format || 'image/webp',
        ...(options.compression || {})
      };
      uploadFile = await compressImage(file, compressionConfig);
    } catch (compErr) {
      console.warn('Image compression skipped due to error, uploading original:', compErr);
      uploadFile = file;
    }
  }

  const compressedSize = uploadFile.size || originalSize;
  const savedPercentage = originalSize > 0
    ? Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100))
    : 0;

  const stats = {
    originalSize,
    compressedSize,
    saved: savedPercentage,
    originalFormatted: formatBytes(originalSize),
    compressedFormatted: formatBytes(compressedSize)
  };

  // If Supabase is not configured, fallback to base64 data URL for local offline testing
  if (!supabase) {
    console.warn('Supabase not configured. Converting compressed image to Base64 data URL fallback.');
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        success: true,
        url: reader.result,
        path: null,
        source: 'local',
        originalSize,
        compressedSize,
        stats
      });
      reader.onerror = (err) => reject(new Error('Failed to read local image file: ' + err.message));
      reader.readAsDataURL(uploadFile);
    });
  }

  // Ensure caller is an authenticated admin before attempting upload
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) {
    throw new Error('Authentication required: You must be signed in as an administrator to upload images.');
  }

  try {
    // Generate safe clean file path
    const fileExt = uploadFile.name ? uploadFile.name.split('.').pop().toLowerCase() : 'webp';
    const rawName = uploadFile.name ? uploadFile.name.substring(0, uploadFile.name.lastIndexOf('.')) : 'image';
    const safeName = rawName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().slice(0, 35);
    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const filePath = folder ? `${folder}/${uniqueId}_${safeName}.${fileExt}` : `${uniqueId}_${safeName}.${fileExt}`;

    // Upload compressed file to Supabase bucket
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, uploadFile, {
        cacheControl: '31536000', // 1 year cache for compressed assets
        upsert: true,
        contentType: uploadFile.type || 'image/webp'
      });

    if (error) {
      if (error.message?.includes('Bucket not found') || error.error === 'Bucket not found' || error.statusCode === '404' || error.status === 404) {
        throw new Error(`Bucket "${bucket}" was not found in your Supabase project. Please create the public bucket "${bucket}" in Supabase -> Storage or run the Storage SQL script in the Database Connection tab.`);
      }
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      throw new Error('Could not retrieve public URL from Supabase storage.');
    }

    return {
      success: true,
      url: urlData.publicUrl,
      path: filePath,
      source: 'supabase',
      originalSize,
      compressedSize,
      stats
    };
  } catch (err) {
    console.error('Supabase Storage upload error:', err);
    throw err;
  }
};

/**
 * Delete an image from Supabase storage
 * @param {string} imageUrl - The full URL or relative path
 * @param {string} bucket - The bucket name
 */
export const deleteImageFromSupabase = async (imageUrl, bucket = DEFAULT_STORAGE_BUCKET) => {
  const supabase = getSupabase();
  if (!supabase || !imageUrl) return false;

  // Verify authentication before deletion
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) {
    console.warn('Unauthorized: You must be logged in as an administrator to delete images.');
    return false;
  }

  try {
    let filePath = imageUrl;
    const bucketMarker = `/storage/v1/object/public/${bucket}/`;
    if (imageUrl.includes(bucketMarker)) {
      filePath = imageUrl.split(bucketMarker)[1];
    }

    if (filePath && !filePath.startsWith('http')) {
      const decodedPath = decodeURIComponent(filePath);
      const { error } = await supabase.storage.from(bucket).remove([decodedPath]);
      if (error) throw error;
      return true;
    }
  } catch (err) {
    console.warn('Could not delete image from Supabase Storage:', err.message);
  }
  return false;
};

// ================= LOCAL STORAGE HELPERS =================
const getLocalData = (key, fallback) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.error('Error reading localStorage', e);
    return fallback;
  }
};

const setLocalData = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Error writing localStorage', e);
  }
};

// ================= DATA SERVICES =================
export const DataService = {
  // 1. Fetch all data directly from Supabase Database
  async getInitialData() {
    const supabase = getSupabase();

    if (supabase) {
      try {
        const [categoriesRes, itemsRes, settingsRes] = await Promise.all([
          supabase
            .from('categories')
            .select('*')
            .order('display_order', { ascending: true }),
          supabase
            .from('menu_items')
            .select('*')
            .order('created_at', { ascending: true }),
          supabase
            .from('restaurant_settings')
            .select('*')
            .eq('id', 'main')
            .maybeSingle()
        ]);

        if (categoriesRes.error) {
          console.error('Supabase Categories error:', categoriesRes.error);
        }
        if (itemsRes.error) {
          console.error('Supabase Menu Items error:', itemsRes.error);
        }

        // If database query succeeded without errors
        if (!categoriesRes.error && !itemsRes.error) {
          const dbCategories = categoriesRes.data || [];
          const dbItems = itemsRes.data || [];
          const dbSettings = settingsRes?.data?.settings;

          if (dbCategories.length > 0 || dbItems.length > 0 || dbSettings) {
            console.log(`Loaded ${dbCategories.length} categories and ${dbItems.length} dishes from Supabase DB.`);
            return {
              categories: dbCategories,
              menuItems: dbItems,
              settings: dbSettings || INITIAL_SETTINGS,
              source: 'supabase'
            };
          }
        }
      } catch (err) {
        console.error('Supabase fetch failed:', err);
      }
    }

    // Fallback if offline or DB tables not created yet
    console.warn('Using initial seed dataset fallback.');
    const categories = getLocalData('trattorias_categories', INITIAL_CATEGORIES);
    const menuItems = getLocalData('trattorias_menu_items', INITIAL_MENU_ITEMS);
    const settings = getLocalData('trattorias_settings', INITIAL_SETTINGS);

    return {
      categories,
      menuItems,
      settings,
      source: 'local'
    };
  },

  // 1a. Fetch only categories
  async getCategories() {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('display_order', { ascending: true });
        if (!error && data) {
          return data;
        }
        if (error) console.error('Supabase getCategories error:', error);
      } catch (err) {
        console.error('Supabase fetch categories failed:', err);
      }
    }
    return getLocalData('trattorias_categories', INITIAL_CATEGORIES);
  },

  // 1b. Fetch only menu items
  async getMenuItems() {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('menu_items')
          .select('*')
          .order('created_at', { ascending: true });
        if (!error && data) {
          return data;
        }
        if (error) console.error('Supabase getMenuItems error:', error);
      } catch (err) {
        console.error('Supabase fetch menu items failed:', err);
      }
    }
    return getLocalData('trattorias_menu_items', INITIAL_MENU_ITEMS);
  },

  // 1c. Fetch only restaurant settings
  async getSettings() {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('restaurant_settings')
          .select('*')
          .eq('id', 'main')
          .maybeSingle();
        if (!error && data?.settings) {
          return data.settings;
        }
        if (error) console.error('Supabase getSettings error:', error);
      } catch (err) {
        console.error('Supabase fetch settings failed:', err);
      }
    }
    return getLocalData('trattorias_settings', INITIAL_SETTINGS);
  },

  // 1d. Fetch counts only for admin navigation badges without downloading full records
  async getCounts() {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const [itemsCountRes, catsCountRes] = await Promise.all([
          supabase.from('menu_items').select('*', { count: 'exact', head: true }),
          supabase.from('categories').select('*', { count: 'exact', head: true })
        ]);
        return {
          menuCount: itemsCountRes.count ?? 0,
          categoryCount: catsCountRes.count ?? 0
        };
      } catch (err) {
        console.error('Supabase fetch counts failed:', err);
      }
    }
    const categories = getLocalData('trattorias_categories', INITIAL_CATEGORIES);
    const menuItems = getLocalData('trattorias_menu_items', INITIAL_MENU_ITEMS);
    return {
      menuCount: menuItems.length,
      categoryCount: categories.length
    };
  },

  // 1e. Fetch dish counts per category (lightweight query without full dish data)
  async getCategoryItemCounts() {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('menu_items').select('categoryId');
        if (!error && data) {
          const counts = {};
          for (const item of data) {
            if (item.categoryId) {
              counts[item.categoryId] = (counts[item.categoryId] || 0) + 1;
            }
          }
          return counts;
        }
        if (error) console.error('Supabase getCategoryItemCounts error:', error);
      } catch (err) {
        console.error('Supabase fetch category item counts failed:', err);
      }
    }
    const items = getLocalData('trattorias_menu_items', INITIAL_MENU_ITEMS);
    const counts = {};
    for (const item of items) {
      if (item.categoryId) {
        counts[item.categoryId] = (counts[item.categoryId] || 0) + 1;
      }
    }
    return counts;
  },

  // 2. Save / Update Menu Item
  async saveMenuItem(item) {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('menu_items')
        .upsert(item)
        .select()
        .single();
      if (error) {
        console.error('Error saving to Supabase:', error);
        throw error;
      }
      return data;
    }

    // Local save
    const items = getLocalData('trattorias_menu_items', INITIAL_MENU_ITEMS);
    const index = items.findIndex((i) => i.id === item.id);
    let updated;
    if (index >= 0) {
      items[index] = { ...items[index], ...item };
      updated = items[index];
    } else {
      updated = { ...item, id: item.id || `custom-${Date.now()}` };
      items.push(updated);
    }
    setLocalData('trattorias_menu_items', items);
    return updated;
  },

  // 3. Delete Menu Item
  async deleteMenuItem(id) {
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('menu_items').delete().eq('id', id);
      if (error) {
        console.error('Error deleting from Supabase:', error);
        throw error;
      }
    }

    const items = getLocalData('trattorias_menu_items', INITIAL_MENU_ITEMS);
    const filtered = items.filter((i) => i.id !== id);
    setLocalData('trattorias_menu_items', filtered);
    return true;
  },

  // 4. Save Category
  async saveCategory(category) {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('categories')
        .upsert(category)
        .select()
        .single();
      if (error) {
        console.error('Error saving category to Supabase:', error);
        throw error;
      }
      return data;
    }

    const categories = getLocalData('trattorias_categories', INITIAL_CATEGORIES);
    const index = categories.findIndex((c) => c.id === category.id);
    let updated;
    if (index >= 0) {
      categories[index] = { ...categories[index], ...category };
      updated = categories[index];
    } else {
      updated = { ...category, id: category.id || `cat-${Date.now()}` };
      categories.push(updated);
    }
    setLocalData('trattorias_categories', categories);
    return updated;
  },

  // 5. Delete Category
  async deleteCategory(id) {
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) {
        console.error('Error deleting category from Supabase:', error);
        throw error;
      }
    }

    const categories = getLocalData('trattorias_categories', INITIAL_CATEGORIES);
    const filtered = categories.filter((c) => c.id !== id);
    setLocalData('trattorias_categories', filtered);
    return true;
  },

  // 6. Save Restaurant Settings
  async saveSettings(settings) {
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase
        .from('restaurant_settings')
        .upsert({ id: 'main', settings: settings, updated_at: new Date().toISOString() });
      if (error) {
        console.error('Error saving settings to Supabase:', error);
        throw error;
      }
    }

    setLocalData('trattorias_settings', settings);
    return settings;
  },

  // 6b. Save Multiple Menu Items (Batch)
  async saveMenuItemsBatch(items) {
    const supabase = getSupabase();
    if (supabase && items.length > 0) {
      const { error } = await supabase.from('menu_items').upsert(items);
      if (error) {
        console.error('Error saving menu items batch to Supabase:', error);
        throw error;
      }
    }
    setLocalData('trattorias_menu_items', items);
    return items;
  },

  // 6c. Save Multiple Categories (Batch)
  async saveCategoriesBatch(categories) {
    const supabase = getSupabase();
    if (supabase && categories.length > 0) {
      const formatted = categories.map((cat, idx) => ({
        ...cat,
        display_order: idx
      }));
      const { error } = await supabase.from('categories').upsert(formatted);
      if (error) {
        console.error('Error saving categories batch to Supabase:', error);
        throw error;
      }
    }
    setLocalData('trattorias_categories', categories);
    return categories;
  },

  // 7. Seed local data into Supabase (one-click sync)
  async seedToSupabase() {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase is not configured yet');

    const categories = getLocalData('trattorias_categories', INITIAL_CATEGORIES);
    const menuItems = getLocalData('trattorias_menu_items', INITIAL_MENU_ITEMS);
    const settings = getLocalData('trattorias_settings', INITIAL_SETTINGS);

    // Format categories with order and subtitle
    const formattedCategories = categories.map((cat, idx) => ({
      id: cat.id,
      name: cat.name,
      subtitle: cat.subtitle || '',
      icon: cat.icon,
      display_order: idx
    }));

    // Format menu items
    const formattedItems = menuItems.map((item) => ({
      id: String(item.id),
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      name: item.name,
      description: item.description || '',
      price: item.price || '',
      variants: item.variants || [],
      is_available: item.is_available !== false,
      image_url: item.image_url || ''
    }));

    // Insert categories
    const { error: catErr } = await supabase.from('categories').upsert(formattedCategories);
    if (catErr) throw new Error(`Category seed failed: ${catErr.message}`);

    // Insert menu items in batches of 50
    for (let i = 0; i < formattedItems.length; i += 50) {
      const batch = formattedItems.slice(i, i + 50);
      const { error: itemErr } = await supabase.from('menu_items').upsert(batch);
      if (itemErr) throw new Error(`Menu item seed failed: ${itemErr.message}`);
    }

    // Insert settings
    const { error: settErr } = await supabase.from('restaurant_settings').upsert({
      id: 'main',
      settings: settings,
      updated_at: new Date().toISOString()
    });
    if (settErr) throw new Error(`Settings seed failed: ${settErr.message}`);

    return true;
  }
};
