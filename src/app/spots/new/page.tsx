'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera,
  MapPin,
  LocateFixed,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { useRequireAuth } from '@/lib/auth';
import { api, uploadSpotPhoto } from '@/lib/api';

const categories = [
  { id: 'eat_drink', label: 'Eat & Drink', subcategories: ['restaurant', 'carinderia', 'cafe', 'bakery', 'street_food', 'bar'] },
  { id: 'nature_outdoors', label: 'Nature & Outdoors', subcategories: ['beach', 'waterfall', 'cave', 'park', 'trailhead', 'viewpoint'] },
  { id: 'culture_heritage', label: 'Culture & Heritage', subcategories: ['church', 'museum', 'heritage_site', 'arts_crafts'] },
  { id: 'activities_wellness', label: 'Activities & Wellness', subcategories: ['sports_venue', 'running_spot', 'gym', 'recreation', 'water_activity'] },
  { id: 'shopping_local', label: 'Shopping & Local Finds', subcategories: ['market', 'souvenir', 'local_products'] },
  { id: 'stay', label: 'Stay', subcategories: ['hotel', 'resort', 'homestay', 'campsite'] },
];

const availableTags = ['coffee', 'local_food', 'family', 'friends', 'quiet', 'work_friendly', 'scenic', 'running', 'sports', 'hidden_gem', 'free'];
const availableAmenities = ['parking', 'restroom', 'wifi', 'wheelchair_accessible', 'pet_friendly', 'child_friendly'];

export default function AddSpotPage() {
  const router = useRouter();
  const { isReady } = useRequireAuth();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('nature_outdoors');
  const [subcategory, setSubcategory] = useState('park');
  const [description, setDescription] = useState('');
  const [municipality, setMunicipality] = useState('Lingayen');
  const [address, setAddress] = useState('');
  const [gpsLat, setGpsLat] = useState<number>(16.0218);
  const [gpsLng, setGpsLng] = useState<number>(120.2319);
  const [priceLevel, setPriceLevel] = useState<number>(0);
  const [dailyHours, setDailyHours] = useState('08:00 - 18:00');
  const [selectedTags, setSelectedTags] = useState<string[]>(['family', 'scenic']);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(['parking', 'restroom']);

  // Photo Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedAssetId, setUploadedAssetId] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);

  // Form Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!isReady) return null;

  const currentCategoryObj = categories.find((c) => c.id === category) || categories[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    // Validate size (max 8 MB)
    if (file.size > 8 * 1024 * 1024) {
      setUploadError('File size exceeds maximum limit of 8 MB.');
      return;
    }

    // Validate client-side MIME type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setUploadError('Unsupported file type. Please upload a JPEG, PNG, or WebP photo.');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setUploadedAssetId(null);
    setUploadedPhotoUrl(null);
  };

  const handleUploadPhoto = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadError(null);

    try {
      const asset = await uploadSpotPhoto(selectedFile);
      setUploadedAssetId(asset.asset_id);
      setUploadedPhotoUrl(asset.url);
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || 'Failed to upload photo. Please try again.';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (name.trim().length < 3) {
      setSubmitError('Destination name must be at least 3 characters.');
      return;
    }

    if (description.trim().length < 20) {
      setSubmitError('Description must be at least 20 characters.');
      return;
    }

    if (!address.trim()) {
      setSubmitError('Address is required.');
      return;
    }

    setSubmitting(true);

    try {
      let finalAssetId = uploadedAssetId;

      // Auto-upload photo if file selected but not yet uploaded
      if (selectedFile && !finalAssetId) {
        setUploading(true);
        const uploaded = await uploadSpotPhoto(selectedFile);
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
      router.push('/explore?submitted=review');
      } else {
        setSubmitError('Failed to create destination spot.');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || 'Failed to submit destination spot.';
      setSubmitError(errMsg);
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <Navigation>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-xs font-extrabold text-[#582F0E] hover:text-[#2D6A4F]"
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
          <h1 className="text-2xl md:text-4xl font-black font-serif">Add a Pangasinan Destination</h1>
          <p className="text-xs md:text-sm text-emerald-50">
            Share local beaches, food spots, cultural sites, and eco-trails. Upload a real photo to help travelers discover authentic local places.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-[#D5C4AC]/50 p-6 md:p-8 space-y-6 shadow-sm">
          {submitError && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Photo Upload Section */}
          <div className="space-y-3">
            <label className="block text-xs font-black text-[#582F0E] uppercase tracking-wider">
              Destination Photo (JPEG, PNG, WebP — max 8 MB)
            </label>

            <div className="border-2 border-dashed border-[#D5C4AC] rounded-3xl p-6 text-center bg-[#FAF9F5] space-y-4">
              {previewUrl ? (
                <div className="relative max-w-md mx-auto rounded-2xl overflow-hidden shadow-md">
                  <img src={previewUrl} alt="Preview" className="w-full h-56 object-cover" />
                  {uploadedAssetId && (
                    <div className="absolute top-3 right-3 bg-[#48C71D] text-white px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 shadow-md">
                      <CheckCircle2 className="w-4 h-4" /> Photo Uploaded
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2 py-4">
                  <Camera className="w-12 h-12 text-[#2D6A4F] mx-auto opacity-60" />
                  <p className="text-xs text-[#514532] font-semibold">
                    Select a photo from your device to upload.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 bg-[#2D6A4F] text-white font-extrabold text-xs px-5 py-3 rounded-2xl hover:bg-[#1B4332] transition">
                  <Upload className="w-4 h-4" />
                  <span>{previewUrl ? 'Change Photo' : 'Select Photo'}</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="hidden" />
                </label>

                {selectedFile && !uploadedAssetId && (
                  <button
                    type="button"
                    onClick={handleUploadPhoto}
                    disabled={uploading}
                    className="inline-flex items-center gap-2 bg-[#FFB703] text-[#582F0E] font-black text-xs px-5 py-3 rounded-2xl shadow-md hover:bg-amber-400 transition"
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    <span>{uploading ? 'Uploading...' : 'Upload Now'}</span>
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
              <label className="block text-xs font-black text-[#582F0E] uppercase mb-1">Destination Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tondaligan Beach Baywalk"
                className="w-full p-3.5 rounded-2xl border border-[#D5C4AC] text-sm text-[#582F0E] font-semibold outline-none focus:border-[#2D6A4F]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black text-[#582F0E] uppercase mb-1">Municipality / City *</label>
              <input
                type="text"
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
                placeholder="e.g. Dagupan City"
                className="w-full p-3.5 rounded-2xl border border-[#D5C4AC] text-sm text-[#582F0E] font-semibold outline-none focus:border-[#2D6A4F]"
                required
              />
            </div>
          </div>

          {/* Category & Subcategory */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-[#582F0E] uppercase mb-1">Category *</label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  const firstSub = categories.find((c) => c.id === e.target.value)?.subcategories[0] || '';
                  setSubcategory(firstSub);
                }}
                className="w-full p-3.5 rounded-2xl border border-[#D5C4AC] text-sm text-[#582F0E] font-semibold outline-none focus:border-[#2D6A4F]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-[#582F0E] uppercase mb-1">Subcategory *</label>
              <select
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                className="w-full p-3.5 rounded-2xl border border-[#D5C4AC] text-sm text-[#582F0E] font-semibold outline-none focus:border-[#2D6A4F]"
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
            <label className="block text-xs font-black text-[#582F0E] uppercase mb-1">Description *</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what makes this spot special, accessibility, scenic features, or local tips..."
              className="w-full p-3.5 rounded-2xl border border-[#D5C4AC] text-sm text-[#582F0E] font-semibold outline-none focus:border-[#2D6A4F]"
              required
            />
          </div>

          {/* Address & GPS Coordinates */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-black text-[#582F0E] uppercase mb-1">Address / Landmark *</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Bonuan Gueset, Dagupan City, Pangasinan"
                className="w-full p-3.5 rounded-2xl border border-[#D5C4AC] text-sm text-[#582F0E] font-semibold outline-none focus:border-[#2D6A4F]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase">GPS Latitude</label>
                <input
                  type="number"
                  step="0.00001"
                  value={gpsLat}
                  onChange={(e) => setGpsLat(Number(e.target.value))}
                  className="w-full p-3 rounded-xl border border-[#D5C4AC] text-xs text-[#582F0E] font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase">GPS Longitude</label>
                <input
                  type="number"
                  step="0.00001"
                  value={gpsLng}
                  onChange={(e) => setGpsLng(Number(e.target.value))}
                  className="w-full p-3 rounded-xl border border-[#D5C4AC] text-xs text-[#582F0E] font-mono font-bold"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleCaptureGps}
              className="inline-flex items-center gap-2 text-xs font-extrabold text-[#2D6A4F] hover:text-[#1B4332]"
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
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
            className="w-full inline-flex items-center justify-center gap-3 bg-[#48C71D] hover:bg-[#3FB418] text-white font-black py-4 px-6 rounded-2xl shadow-xl transition transform text-sm tracking-wide disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
            <span>{submitting ? 'Submitting Spot...' : 'Submit Destination Spot'}</span>
          </button>
        </form>
      </div>
    </Navigation>
  );
}
