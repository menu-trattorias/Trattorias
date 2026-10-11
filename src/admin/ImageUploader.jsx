import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Zap
} from 'lucide-react';
import {
  uploadImageToSupabase,
  isSupabaseConfigured,
  DEFAULT_STORAGE_BUCKET
} from '../lib/supabase';

/**
 * ImageUploader component for uploading images to Supabase Storage Bucket
 * with automatic client-side WebP compression
 * 
 * @param {string} value - Current image URL
 * @param {function} onChange - Callback function with new image URL
 * @param {string} label - Input label (optional)
 * @param {string} folder - Destination folder in Supabase bucket (e.g. 'dishes', 'banners')
 * @param {string} bucket - Supabase bucket name (default: DEFAULT_STORAGE_BUCKET)
 * @param {string} placeholder - Placeholder text
 * @param {boolean} compact - Compact UI mode
 */
export const ImageUploader = ({
  value = '',
  onChange,
  label = 'Image',
  folder = 'uploads',
  bucket = DEFAULT_STORAGE_BUCKET,
  compact = false
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [compressionStats, setCompressionStats] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const isConfigured = isSupabaseConfigured();

  const handleFileChange = async (file) => {
    if (!file) return;

    // Validate type
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, WEBP, GIF, SVG).');
      return;
    }

    // Validate size (15MB limit before compression)
    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('Image size exceeds 15MB. Please choose a smaller image.');
      return;
    }

    setErrorMsg('');
    setIsUploading(true);
    setUploadSuccess(false);
    setCompressionStats(null);

    try {
      const result = await uploadImageToSupabase(file, {
        bucket,
        folder,
        compress: true,
        maxDimension: 1200,
        quality: 0.82
      });

      if (result && (result.success || result.url)) {
        onChange(result.url);
        setUploadSuccess(true);
        if (result.stats) {
          setCompressionStats(result.stats);
        }
        setTimeout(() => setUploadSuccess(false), 5000);
      } else {
        setErrorMsg(result?.error || 'Upload failed. Please try again.');
      }
    } catch (err) {
      console.error('Upload component error:', err);
      setErrorMsg(err.message || 'An error occurred during upload.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setCompressionStats(null);
    setErrorMsg('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isSupabaseUrl = value && value.includes('/storage/v1/object/public/');

  return (
    <div style={{ marginBottom: '14px' }}>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '600',
            color: 'var(--adm-text)',
            marginBottom: '6px'
          }}
        >
          {label}
        </label>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
        accept="image/*"
        style={{ display: 'none' }}
      />

      {/* Main Image Control Area */}
      {value ? (
        /* Image Preview Box */
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'var(--adm-bg)',
            border: '1px solid var(--adm-border)',
            borderRadius: '10px',
            padding: '10px 12px',
            flexWrap: 'wrap'
          }}
        >
          <div
            style={{
              width: compact ? '42px' : '56px',
              height: compact ? '42px' : '56px',
              borderRadius: '6px',
              overflow: 'hidden',
              backgroundColor: '#fff',
              border: '1px solid var(--adm-border)',
              flexShrink: 0
            }}
          >
            <img
              src={value}
              alt="Preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%238ea397" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
              }}
            />
          </div>

          <div style={{ flex: 1, minWidth: '160px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  background: isSupabaseUrl ? 'var(--adm-success-bg)' : '#f3f4f6',
                  color: isSupabaseUrl ? 'var(--adm-success)' : '#4b5563'
                }}
              >
                {isSupabaseUrl ? 'Supabase Storage' : 'Active Image'}
              </span>
              {compressionStats && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: '#e0f2fe',
                    color: '#0369a1',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title={`Original: ${compressionStats.originalFormatted} → Compressed: ${compressionStats.compressedFormatted}`}
                >
                  <Zap size={11} /> {compressionStats.compressedFormatted} ({compressionStats.saved}% saved)
                </span>
              )}
            </div>

            <div
              style={{
                fontSize: '11.5px',
                color: 'var(--adm-text-muted)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '220px'
              }}
              title={value}
            >
              {value}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              style={{
                padding: '6px 10px',
                background: 'var(--adm-surface)',
                border: '1px solid var(--adm-border)',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                color: 'var(--adm-text)',
                cursor: isUploading ? 'wait' : 'pointer'
              }}
            >
              {isUploading ? 'Uploading...' : 'Replace'}
            </button>
            <button
              type="button"
              onClick={handleClear}
              style={{
                padding: '6px 8px',
                background: 'var(--adm-danger-bg)',
                border: 'none',
                borderRadius: '6px',
                color: 'var(--adm-danger)',
                cursor: 'pointer'
              }}
              title="Remove image"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        /* Drag & Drop Upload Zone */
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? 'var(--adm-primary)' : 'var(--adm-border-hover)'}`,
            borderRadius: '10px',
            padding: compact ? '14px 16px' : '20px 20px',
            textAlign: 'center',
            backgroundColor: isDragging ? 'var(--adm-primary-light)' : '#ffffff',
            cursor: isUploading ? 'wait' : 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative'
          }}
        >
          {isUploading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <Loader2 size={24} className="spin" style={{ color: 'var(--adm-primary)', animation: 'spin 1s linear infinite' }} />
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--adm-primary)' }}>
                Compressing & uploading to Storage...
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--adm-text-secondary)' }}>
                Optimizing image dimensions and WebP encoding
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'var(--adm-primary-light)',
                  color: 'var(--adm-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <UploadCloud size={18} />
              </div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--adm-primary)' }}>
                Click to browse or drag & drop image
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--adm-text-muted)' }}>
                {isConfigured
                  ? `Auto-compressed to WebP & uploaded to "${bucket}/${folder}"`
                  : 'Auto-compressed WebP format'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Success Notification */}
      {uploadSuccess && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '6px',
            color: 'var(--adm-success)',
            fontSize: '12px',
            background: 'var(--adm-success-bg)',
            padding: '6px 10px',
            borderRadius: '6px'
          }}
        >
          <CheckCircle2 size={14} />
          <span>
            Image compressed & uploaded successfully!{' '}
            {compressionStats && (
              <span style={{ fontWeight: '600' }}>
                ({compressionStats.originalFormatted} → {compressionStats.compressedFormatted}, {compressionStats.saved}% smaller)
              </span>
            )}
          </span>
        </div>
      )}

      {/* Error Notification */}
      {errorMsg && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '6px',
            color: 'var(--adm-danger)',
            fontSize: '12px',
            background: 'var(--adm-danger-bg)',
            padding: '6px 10px',
            borderRadius: '6px'
          }}
        >
          <AlertCircle size={14} />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
