'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  MapPin,
  Camera,
  Film,
  Sparkles,
  ShieldCheck,
  ArrowLeft,
  AlertCircle,
  Loader2,
  CheckCircle2,
  LocateFixed,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { api, uploadSpotMedia, isVideoMedia } from '@/lib/api';
import { invalidateCache } from '@/lib/cache';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const categories = [
  {
    id: 'eat_drink',
    label: '🍜 Food & Culinary',
    subcategories: ['kaleskes', 'bangus_grill', 'puto_calasiao', 'seafood_shack', 'tupig_stand', 'third_wave_coffee'],
  },
  {
    id: 'nature_outdoors',
    label: '🏖️ Nature & Beaches',
    subcategories: ['white_sand_beach', 'waterfall', 'cave_system', 'island_cove', 'tidal_pool', 'mountain_viewpoint'],
  },
  {
    id: 'culture_heritage',
    label: '🏛️ Heritage & Shrines',
    subcategories: ['colonial_church', 'historical_lighthouse', 'heritage_mansion', 'provincial_capitol', 'shrine_monument'],
  },
  {
    id: 'activities_wellness',
    label: '🧗 Outdoor & Eco',
    subcategories: ['island_hopping', 'snorkeling_dive', 'mangrove_paddling', 'eco_trail_hike', 'campground'],
  },
  {
    id: 'shopping_local',
    label: '🛍️ Local MSME Crafts',
    subcategories: ['bagoong_distillery', 'salt_beds_farm', 'bamboo_crafts', 'night_market', 'local_cooperative'],
  },
];

const availableTags = [
  'hidden_gem',
  'budget_friendly',
  'family_safe',
  'sunset_spot',
  'pet_friendly',
  'verified_guide',
  'sustainable_eco',
  'local_favorite',
  'quiet_retreat',
  'scenic_drive',
];

const availableAmenities = [
  'parking',
  'restrooms',
  'food_nearby',
  'guide_available',
  'cottage_rentals',
  'boat_service',
  'wifi_signal',
  'pwd_accessible',
];

export default function NewSpotPage() {
  const router = useRouter();

  // Form States
  const [name, setName] = useState('');
  const [category, setCategory] = useState('nature_outdoors');
  const [subcategory, setSubcategory] = useState('white_sand_beach');
  const [description, setDescription] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [address, setAddress] = useState('');
  const [gpsLat, setGpsLat] = useState<number>(16.0);
  const [gpsLng, setGpsLng] = useState<number>(120.0);
  const [priceLevel, setPriceLevel] = useState<number>(1);
  const [dailyHours, setDailyHours] = useState('08:00 AM - 05:00 PM');
  const [selectedTags, setSelectedTags] = useState<string[]>(['hidden_gem', 'local_favorite']);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(['parking']);

  // Media States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedAssetId, setUploadedAssetId] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [uploadedMediaType, setUploadedMediaType] = useState<'image' | 'video'>('image');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Status & Validation
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const nameInputRef = useRef<HTMLInputElement>(null);
  const descInputRef = useRef<HTMLTextAreaElement>(null);
  const muniInputRef = useRef<HTMLInputElement>(null);
  const addrInputRef = useRef<HTMLInputElement>(null);

  const currentCategoryObj = categories.find((c) => c.id === category) || categories[0];

  // Warn on accidental tab closure when draft has data
  useEffect(() => {
    const isDirty = name.trim() || description.trim() || address.trim() || selectedFile;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !submitting) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [name, description, address, selectedFile, submitting]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? 30 * 1024 * 1024 : 8 * 1024 * 1024;

    if (file.size > maxSize) {
      setUploadError(`File is too large. Max ${isVideo ? '30 MB for video' : '8 MB for photos'}.`);
      return;
    }

    setSelectedFile(file);
    setUploadedMediaType(isVideo ? 'video' : 'image');
    setPreviewUrl(URL.createObjectURL(file));
    setUploadedAssetId(null);
    setUploadedPhotoUrl(null);
  };

  const handleUploadPhoto = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadError(null);

    try {
      const asset = await uploadSpotMedia(selectedFile);
      setUploadedAssetId(asset.asset_id);
      setUploadedPhotoUrl(asset.url);
      setUploadedMediaType(asset.media_type || (selectedFile.type.startsWith('video/') ? 'video' : 'image'));
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: { message?: string } } } };
      const errMsg = errorObj.response?.data?.error?.message || 'Failed to upload media. Please try again.';
      setUploadError(errMsg);
    } finally {
      setUploading(false);
    }
  };

  const handleCaptureGps = () => {
    if (!navigator.geolocation) {
      setSubmitError('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLat(Number(pos.coords.latitude.toFixed(5)));
        setGpsLng(Number(pos.coords.longitude.toFixed(5)));
      },
      () => setSubmitError('Could not acquire current location.'),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (name.trim().length < 3) {
      errors.name = 'Destination name must be at least 3 characters.';
    }
    if (!municipality.trim()) {
      errors.municipality = 'Municipality or city is required.';
    }
    if (description.trim().length < 20) {
      errors.description = 'Description must be at least 20 characters.';
    }
    if (!address.trim()) {
      errors.address = 'Address or landmark description is required.';
    }

    setFieldErrors(errors);

    // Focus first invalid field
    if (errors.name) {
      nameInputRef.current?.focus();
    } else if (errors.municipality) {
      muniInputRef.current?.focus();
    } else if (errors.description) {
      descInputRef.current?.focus();
    } else if (errors.address) {
      addrInputRef.current?.focus();
    }

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      let finalAssetId = uploadedAssetId;

      // Auto-upload photo if file selected but not yet uploaded
      if (selectedFile && !finalAssetId) {
        setUploading(true);
        const uploaded = await uploadSpotMedia(selectedFile);
        finalAssetId = uploaded.asset_id;
        setUploadedAssetId(uploaded.asset_id);
        setUploadedPhotoUrl(uploaded.url);
        setUploading(false);
      }

      const res = await api.post('/spots', {
        name,
        category,
        subcategory,
        description,
        municipality,
        address,
        gps_lat: gpsLat,
        gps_lng: gpsLng,
        price_level: priceLevel,
        hours: { daily: dailyHours },
        tags: selectedTags,
        amenities: selectedAmenities,
        image_url: uploadedPhotoUrl || '',
        asset_id: finalAssetId || undefined,
        asset_ids: finalAssetId ? [finalAssetId] : undefined,
      });

      if (res.data?.success) {
        invalidateCache('spots');
        router.push('/thank-you?type=spot');
      } else {
        setSubmitError('Failed to create destination spot.');
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: { message?: string } } } };
      const errMsg = errorObj.response?.data?.error?.message || 'Failed to submit destination spot.';
      setSubmitError(errMsg);
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <Navigation>
      <ErrorBoundary fallbackTitle="Unable to display Spot Creation Form">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-xs font-extrabold text-[#582F0E] hover:text-[#2D6A4F] min-h-[36px] cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-100 text-[#2D6A4F] text-xs font-black">
              <ShieldCheck className="w-4 h-4" />
              <span>Community Destination Submission</span>
            </div>
          </div>

          {/* Title Banner */}
          <div className="rounded-3xl bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] text-white p-6 md:p-8 space-y-2">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-[#FFB703]">
              <Sparkles className="w-4 h-4" />
              <span>Contribute a Spot</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-black">Add a Pangasinan Destination</h1>
            <p className="text-xs md:text-sm text-emerald-50">
              Share local beaches, food spots, cultural sites, and eco-trails. Upload a real photo to help travelers discover authentic local places.
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            noValidate
            className="bg-white rounded-3xl border border-[#D5C4AC]/50 p-6 md:p-8 space-y-6 shadow-sm"
          >
            {submitError && (
              <div
                role="alert"
                aria-live="assertive"
                className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Photo / Video Upload Section */}
            <div className="space-y-3">
              <label
                htmlFor="spot-media-upload"
                className="block text-xs font-black text-[#582F0E] uppercase tracking-wider"
              >
                Destination Media (Photo up to 8 MB or Video Clip up to 30 MB)
              </label>

              <div className="border-2 border-dashed border-[#D5C4AC] rounded-3xl p-6 text-center bg-[#FAF9F5] space-y-4">
                {previewUrl ? (
                  <div className="relative max-w-md mx-auto rounded-2xl overflow-hidden shadow-md bg-black">
                    {uploadedMediaType === 'video' || isVideoMedia(previewUrl) ? (
                      <video src={previewUrl} controls playsInline className="w-full h-56 object-cover" />
                    ) : (
                      <img src={previewUrl} alt="Preview" className="w-full h-56 object-cover" />
                    )}

                    {uploadedAssetId && (
                      <div className="absolute top-3 right-3 bg-[#48C71D] text-white px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 shadow-md">
                        <CheckCircle2 className="w-4 h-4" /> {uploadedMediaType === 'video' ? 'Video' : 'Photo'} Uploaded
                      </div>
                    )}

                    {uploadedMediaType === 'video' && !uploadedAssetId && (
                      <div className="absolute top-3 left-3 bg-[#0F172A]/80 text-white px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1">
                        <Film className="w-3 h-3 text-[#FFB703]" />
                        <span>Video Clip</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 py-4">
                    <div className="flex items-center justify-center gap-2 opacity-60 text-[#2D6A4F]">
                      <Camera className="w-10 h-10" />
                      <span className="text-xl font-bold">/</span>
                      <Film className="w-10 h-10" />
                    </div>
                    <p className="text-xs text-[#514532] font-semibold">
                      Select a photo or short video clip (MP4, WebM, MOV) from your device.
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <label
                    htmlFor="spot-media-upload"
                    className="cursor-pointer inline-flex items-center gap-2 bg-[#2D6A4F] text-white font-extrabold text-xs px-5 py-3 rounded-2xl hover:bg-[#1B4332] transition shadow-xs min-h-[44px]"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{previewUrl ? 'Change Media' : 'Select Photo / Video'}</span>
                  </label>
                  <input
                    id="spot-media-upload"
                    name="media"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                    onChange={handleFileChange}
                    className="sr-only"
                  />

                  {selectedFile && !uploadedAssetId && (
                    <button
                      type="button"
                      onClick={handleUploadPhoto}
                      disabled={uploading}
                      className="inline-flex items-center gap-2 bg-[#FFB703] text-[#582F0E] font-black text-xs px-5 py-3 rounded-2xl shadow-md hover:bg-amber-400 transition min-h-[44px] cursor-pointer"
                    >
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      <span>{uploading ? 'Uploading...' : 'Upload Media Now'}</span>
                    </button>
                  )}
                </div>

                {uploadError && (
                  <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs font-bold flex items-center justify-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Name & Municipality */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="spot-name" className="block text-xs font-black text-[#582F0E] uppercase mb-1">
                  Destination Name *
                </label>
                <input
                  ref={nameInputRef}
                  id="spot-name"
                  name="name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? 'spot-name-error' : undefined}
                  placeholder="e.g. Tondaligan Beach Baywalk"
                  className={`w-full p-3.5 rounded-2xl border text-sm text-[#582F0E] font-semibold outline-none transition min-h-[44px] ${
                    fieldErrors.name
                      ? 'border-red-500 bg-red-50/20 focus:border-red-600'
                      : 'border-[#D5C4AC] focus:border-[#2D6A4F]'
                  }`}
                  required
                />
                {fieldErrors.name && (
                  <p id="spot-name-error" className="mt-1 text-xs text-red-600 font-bold">
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="spot-municipality" className="block text-xs font-black text-[#582F0E] uppercase mb-1">
                  Municipality / City *
                </label>
                <input
                  ref={muniInputRef}
                  id="spot-municipality"
                  name="municipality"
                  type="text"
                  value={municipality}
                  onChange={(e) => {
                    setMunicipality(e.target.value);
                    if (fieldErrors.municipality) setFieldErrors((prev) => ({ ...prev, municipality: '' }));
                  }}
                  aria-invalid={Boolean(fieldErrors.municipality)}
                  aria-describedby={fieldErrors.municipality ? 'spot-muni-error' : undefined}
                  placeholder="e.g. Dagupan City"
                  className={`w-full p-3.5 rounded-2xl border text-sm text-[#582F0E] font-semibold outline-none transition min-h-[44px] ${
                    fieldErrors.municipality
                      ? 'border-red-500 bg-red-50/20 focus:border-red-600'
                      : 'border-[#D5C4AC] focus:border-[#2D6A4F]'
                  }`}
                  required
                />
                {fieldErrors.municipality && (
                  <p id="spot-muni-error" className="mt-1 text-xs text-red-600 font-bold">
                    {fieldErrors.municipality}
                  </p>
                )}
              </div>
            </div>

            {/* Category & Subcategory */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="spot-category" className="block text-xs font-black text-[#582F0E] uppercase mb-1">
                  Category *
                </label>
                <select
                  id="spot-category"
                  name="category"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    const firstSub = categories.find((c) => c.id === e.target.value)?.subcategories[0] || '';
                    setSubcategory(firstSub);
                  }}
                  className="w-full p-3.5 rounded-2xl border border-[#D5C4AC] text-sm text-[#582F0E] font-semibold outline-none focus:border-[#2D6A4F] min-h-[44px] cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="spot-subcategory" className="block text-xs font-black text-[#582F0E] uppercase mb-1">
                  Subcategory *
                </label>
                <select
                  id="spot-subcategory"
                  name="subcategory"
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  className="w-full p-3.5 rounded-2xl border border-[#D5C4AC] text-sm text-[#582F0E] font-semibold outline-none focus:border-[#2D6A4F] min-h-[44px] cursor-pointer"
                >
                  {currentCategoryObj.subcategories.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="spot-description" className="block text-xs font-black text-[#582F0E] uppercase mb-1">
                Description *
              </label>
              <textarea
                ref={descInputRef}
                id="spot-description"
                name="description"
                rows={4}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (fieldErrors.description) setFieldErrors((prev) => ({ ...prev, description: '' }));
                }}
                aria-invalid={Boolean(fieldErrors.description)}
                aria-describedby={fieldErrors.description ? 'spot-desc-error' : undefined}
                placeholder="Describe what makes this spot special, accessibility, scenic features, or local tips..."
                className={`w-full p-3.5 rounded-2xl border text-sm text-[#582F0E] font-semibold outline-none transition ${
                  fieldErrors.description
                    ? 'border-red-500 bg-red-50/20 focus:border-red-600'
                    : 'border-[#D5C4AC] focus:border-[#2D6A4F]'
                }`}
                required
              />
              {fieldErrors.description && (
                <p id="spot-desc-error" className="mt-1 text-xs text-red-600 font-bold">
                  {fieldErrors.description}
                </p>
              )}
            </div>

            {/* Address & GPS Coordinates */}
            <div className="space-y-3">
              <div>
                <label htmlFor="spot-address" className="block text-xs font-black text-[#582F0E] uppercase mb-1">
                  Address / Landmark *
                </label>
                <input
                  ref={addrInputRef}
                  id="spot-address"
                  name="address"
                  type="text"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    if (fieldErrors.address) setFieldErrors((prev) => ({ ...prev, address: '' }));
                  }}
                  aria-invalid={Boolean(fieldErrors.address)}
                  aria-describedby={fieldErrors.address ? 'spot-address-error' : undefined}
                  placeholder="e.g. Bonuan Gueset, Dagupan City, Pangasinan"
                  className={`w-full p-3.5 rounded-2xl border text-sm text-[#582F0E] font-semibold outline-none transition min-h-[44px] ${
                    fieldErrors.address
                      ? 'border-red-500 bg-red-50/20 focus:border-red-600'
                      : 'border-[#D5C4AC] focus:border-[#2D6A4F]'
                  }`}
                  required
                />
                {fieldErrors.address && (
                  <p id="spot-address-error" className="mt-1 text-xs text-red-600 font-bold">
                    {fieldErrors.address}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label htmlFor="spot-lat" className="block text-[10px] font-bold text-gray-500 uppercase">
                    GPS Latitude
                  </label>
                  <input
                    id="spot-lat"
                    name="gpsLat"
                    type="number"
                    step="0.00001"
                    value={gpsLat}
                    onChange={(e) => setGpsLat(Number(e.target.value))}
                    className="w-full p-3 rounded-xl border border-[#D5C4AC] text-xs text-[#582F0E] font-mono font-bold min-h-[44px]"
                  />
                </div>
                <div>
                  <label htmlFor="spot-lng" className="block text-[10px] font-bold text-gray-500 uppercase">
                    GPS Longitude
                  </label>
                  <input
                    id="spot-lng"
                    name="gpsLng"
                    type="number"
                    step="0.00001"
                    value={gpsLng}
                    onChange={(e) => setGpsLng(Number(e.target.value))}
                    className="w-full p-3 rounded-xl border border-[#D5C4AC] text-xs text-[#582F0E] font-mono font-bold min-h-[44px]"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleCaptureGps}
                className="inline-flex items-center gap-2 text-xs font-extrabold text-[#2D6A4F] hover:text-[#1B4332] min-h-[36px] cursor-pointer"
              >
                <LocateFixed className="w-4 h-4 text-[#FFB703]" />
                <span>Use Current Device Location</span>
              </button>
            </div>

            {/* Tags & Amenities */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-[#582F0E] uppercase mb-2">Select Tags</label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      aria-pressed={selectedTags.includes(tag)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition min-h-[36px] cursor-pointer ${
                        selectedTags.includes(tag)
                          ? 'bg-[#2D6A4F] text-white shadow-sm'
                          : 'bg-[#FAF9F5] border border-[#D5C4AC] text-[#582F0E]'
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-[#582F0E] uppercase mb-2">Amenities</label>
                <div className="flex flex-wrap gap-2">
                  {availableAmenities.map((amenity) => (
                    <button
                      type="button"
                      key={amenity}
                      onClick={() => toggleAmenity(amenity)}
                      aria-pressed={selectedAmenities.includes(amenity)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition min-h-[36px] cursor-pointer ${
                        selectedAmenities.includes(amenity)
                          ? 'bg-[#FFB703] text-[#582F0E] shadow-sm'
                          : 'bg-[#FAF9F5] border border-[#D5C4AC] text-[#582F0E]'
                      }`}
                    >
                      {amenity.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={submitting || uploading}
              className="w-full inline-flex items-center justify-center gap-3 bg-[#2D6A4F] hover:bg-[#1B4332] text-white font-black py-4 px-6 rounded-2xl shadow-xl transition transform text-sm tracking-wide disabled:opacity-50 min-h-[48px] cursor-pointer active:scale-98"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5 text-[#FFB703]" />}
              <span>{submitting ? 'Submitting Spot...' : 'Submit Destination Spot'}</span>
            </button>
          </form>
        </div>
      </ErrorBoundary>
    </Navigation>
  );
}
