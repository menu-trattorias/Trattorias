import React, { useState, useEffect, useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import { DataService } from '../lib/supabase';
import ImageUploader from './ImageUploader';
import UnsavedChangesBar from './UnsavedChangesBar';

export const SettingsEditor = ({ settings, onRefresh }) => {
  const [formData, setFormData] = useState({ ...(settings || {}) });
  const [baselineData, setBaselineData] = useState(() => JSON.stringify(settings || {}));
  const [statusMsg, setStatusMsg] = useState('');
  const [newBannerUrl, setNewBannerUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Synchronize when settings prop updates from server/storage
  useEffect(() => {
    if (settings) {
      setFormData({ ...settings });
      setBaselineData(JSON.stringify(settings));
    }
  }, [settings]);

  // Detect unsaved changes by comparing serialized state
  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(formData) !== baselineData;
  }, [formData, baselineData]);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      await DataService.saveSettings(formData);
      setBaselineData(JSON.stringify(formData));
      setStatusMsg('Restaurant settings saved successfully!');
      setTimeout(() => setStatusMsg(''), 3000);
      onRefresh();
    } catch (err) {
      console.error('Error saving settings:', err);
      alert(`Save failed: ${err.message || 'Please check your admin session and database permissions.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    try {
      setFormData(JSON.parse(baselineData));
    } catch {
      setFormData({ ...(settings || {}) });
    }
  };

  const removeBanner = (index) => {
    const updated = [...(formData.banners || [])];
    updated.splice(index, 1);
    setFormData({ ...formData, banners: updated });
  };

  return (
    <div>
      <div className="admin-header-row">
        <h1 className="admin-page-title">Info &amp; Banners</h1>
      </div>

      {statusMsg && (
        <div
          style={{
            background: 'var(--adm-success-bg)',
            color: 'var(--adm-success)',
            padding: '10px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '13.5px',
            fontWeight: '500'
          }}
        >
          {statusMsg}
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* 1. Hero Carousel Banners */}
        <div className="admin-card">
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--adm-primary)', margin: '0 0 14px' }}>
            Hero Carousel Banners
          </h3>

          <div className="admin-banner-grid">
            {(formData.banners || []).map((b, idx) => (
              <div
                key={b.id || idx}
                style={{
                  position: 'relative',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  border: '1px solid var(--adm-border)',
                  background: 'var(--adm-bg)'
                }}
              >
                <img
                  src={b.url}
                  alt={b.alt || 'Banner'}
                  style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }}
                />
                <button
                  type="button"
                  onClick={() => removeBanner(idx)}
                  style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    background: 'rgba(239, 68, 68, 0.95)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                  }}
                  title="Remove banner"
                  aria-label="Remove banner"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '16px' }}>
            <ImageUploader
              value={newBannerUrl}
              onChange={(url) => {
                if (url) {
                  const updatedBanners = [
                    ...(formData.banners || []),
                    { id: `banner-${Date.now()}`, url: url, alt: 'Banner image' }
                  ];
                  setFormData({ ...formData, banners: updatedBanners });
                  setNewBannerUrl('');
                }
              }}
              label="Upload Banner to Carousel (Supabase Storage)"
              folder="banners"
              placeholder="Paste banner image URL or upload image"
            />
          </div>
        </div>

        {/* 2. Restaurant Branding & Hero */}
        <div className="admin-card">
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--adm-primary)', margin: '0 0 14px' }}>
            Branding & Titles
          </h3>

          <div className="admin-form-grid-2">
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '5px' }}>
                Restaurant Name
              </label>
              <input
                type="text"
                value={formData.restaurant_name || ''}
                onChange={(e) => setFormData({ ...formData, restaurant_name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--adm-border)',
                  fontSize: '13.5px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  minHeight: '40px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '5px' }}>
                Tagline / Subtitle
              </label>
              <input
                type="text"
                value={formData.tagline || ''}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--adm-border)',
                  fontSize: '13.5px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  minHeight: '40px'
                }}
              />
            </div>
          </div>
        </div>

        {/* 3. Contact & Social */}
        <div className="admin-card">
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--adm-primary)', margin: '0 0 14px' }}>
            Contact, Hours & Social
          </h3>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '5px' }}>
              Phone Number
            </label>
            <input
              type="text"
              placeholder="+91 97469 68992"
              value={formData.phone || ''}
              onChange={(e) => {
                const val = e.target.value;
                setFormData({
                  ...formData,
                  phone: val,
                  phone_raw: val.replace(/[^0-9+]/g, '')
                });
              }}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid var(--adm-border)',
                fontSize: '13.5px',
                boxSizing: 'border-box',
                outline: 'none',
                minHeight: '40px'
              }}
            />
          </div>

          <div className="admin-form-grid-2">
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '5px' }}>
                Instagram Handle
              </label>
              <input
                type="text"
                value={formData.instagram_handle || ''}
                onChange={(e) => setFormData({ ...formData, instagram_handle: e.target.value })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--adm-border)',
                  fontSize: '13.5px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  minHeight: '40px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '5px' }}>
                Instagram URL
              </label>
              <input
                type="text"
                value={formData.instagram_url || ''}
                onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--adm-border)',
                  fontSize: '13.5px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  minHeight: '40px'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '5px' }}>
              Opening Hours
            </label>
            <input
              type="text"
              value={formData.opening_hours || ''}
              onChange={(e) => setFormData({ ...formData, opening_hours: e.target.value })}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid var(--adm-border)',
                fontSize: '13.5px',
                boxSizing: 'border-box',
                outline: 'none',
                minHeight: '40px'
              }}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '5px' }}>
              Full Location Address
            </label>
            <input
              type="text"
              value={formData.location_address || ''}
              onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid var(--adm-border)',
                fontSize: '13.5px',
                boxSizing: 'border-box',
                outline: 'none',
                minHeight: '40px'
              }}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '5px' }}>
              Google Reviews URL
            </label>
            <input
              type="text"
              value={formData.google_reviews_url || ''}
              onChange={(e) => setFormData({ ...formData, google_reviews_url: e.target.value })}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid var(--adm-border)',
                fontSize: '13.5px',
                boxSizing: 'border-box',
                outline: 'none',
                minHeight: '40px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '5px' }}>
              Google Maps Embed URL
            </label>
            <input
              type="text"
              placeholder="https://maps.google.com/maps?q=...&output=embed"
              value={formData.map_embed_url || ''}
              onChange={(e) => setFormData({ ...formData, map_embed_url: e.target.value })}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid var(--adm-border)',
                fontSize: '13.5px',
                boxSizing: 'border-box',
                outline: 'none',
                minHeight: '40px'
              }}
            />
          </div>
        </div>

        {/* 4. Story & About */}
        <div className="admin-card">
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--adm-primary)', margin: '0 0 14px' }}>
            About Section Details
          </h3>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '5px' }}>
              Story (Paragraph 1)
            </label>
            <textarea
              rows={3}
              value={formData.story_p1 || ''}
              onChange={(e) => setFormData({ ...formData, story_p1: e.target.value })}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid var(--adm-border)',
                fontSize: '13.5px',
                boxSizing: 'border-box',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '5px' }}>
              Story (Paragraph 2)
            </label>
            <textarea
              rows={3}
              value={formData.story_p2 || ''}
              onChange={(e) => setFormData({ ...formData, story_p2: e.target.value })}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid var(--adm-border)',
                fontSize: '13.5px',
                boxSizing: 'border-box',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>
        </div>
      </form>

      {/* Floating Bottom Save Bar */}
      <UnsavedChangesBar
        show={hasUnsavedChanges}
        onSave={handleSave}
        onDiscard={handleDiscard}
        isSaving={isSaving}
        message="Unsaved changes"
        saveLabel="Save"
        discardLabel="Discard"
      />
    </div>
  );
};

export default SettingsEditor;
