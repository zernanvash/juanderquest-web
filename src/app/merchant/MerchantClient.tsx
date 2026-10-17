'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  Coins,
  Store,
  CheckCircle2,
  Clock,
  MapPin,
  Mail,
  Phone,
  Package,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Globe,
  AlertCircle,
  Save,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Info
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/lib/auth';
import {
  fetchMerchantMe,
  fetchMerchantDashboard,
  fetchMerchantProfile,
  updateMerchantProfile,
  publishMerchantProfile,
  unpublishMerchantProfile,
  listMerchantProducts,
  createMerchantProduct,
  updateMerchantProduct,
  archiveMerchantProduct,
  MerchantMeModel,
  MerchantDashboardModel,
  MerchantProductModel
} from '@/lib/api';

export function MerchantClient() {
  const { user, isLoading: authLoading } = useAuth();

  const [identity, setIdentity] = useState<MerchantMeModel | null>(null);
  const [dashboardData, setDashboardData] = useState<MerchantDashboardModel | null>(null);
  const [products, setProducts] = useState<MerchantProductModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active workspace tab: 'overview' | 'profile' | 'products'
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'products'>('overview');

  // Profile Edit State
  const [profileName, setProfileName] = useState('');
  const [profileDescription, setProfileDescription] = useState('');
  const [profileLocation, setProfileLocation] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');

  // Product Create/Edit Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MerchantProductModel | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodDescription, setProdDescription] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodCurrency, setProdCurrency] = useState('PHP');
  const [prodSaving, setProdSaving] = useState(false);
  const [prodError, setProdError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const me = await fetchMerchantMe();
      setIdentity(me);

      if (me.has_merchant && me.merchant) {
        // Load dashboard & products
        const [dash, prodList, prof] = await Promise.all([
          fetchMerchantDashboard(),
          listMerchantProducts(false),
          fetchMerchantProfile(),
        ]);
        setDashboardData(dash);
        setProducts(prodList);

        // Populate profile form
        setProfileName(prof.name || '');
        setProfileDescription(prof.description || '');
        setProfileLocation(prof.location || '');
        setProfileEmail(prof.contact_email || '');
        setProfilePhone(prof.contact_phone || '');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to merchant services.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      loadData();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading]);

  // Profile update handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      setProfileSuccessMsg('');
      const updated = await updateMerchantProfile({
        name: profileName.trim(),
        description: profileDescription.trim(),
        location: profileLocation.trim(),
        contact_email: profileEmail.trim(),
        contact_phone: profilePhone.trim(),
      });
      setProfileSuccessMsg('Profile information saved.');
      setTimeout(() => setProfileSuccessMsg(''), 3000);
      void loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save profile changes.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Toggle publish handler
  const handleTogglePublish = async () => {
    if (!dashboardData?.merchant) return;
    try {
      if (dashboardData.merchant.is_published) {
        await unpublishMerchantProfile();
      } else {
        await publishMerchantProfile();
      }
      void loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update publication status.');
    }
  };

  // Product modal open
  const openNewProductModal = () => {
    setEditingProduct(null);
    setProdName('');
    setProdDescription('');
    setProdPrice('');
    setProdCurrency('PHP');
    setProdError('');
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (p: MerchantProductModel) => {
    setEditingProduct(p);
    setProdName(p.name);
    setProdDescription(p.description || '');
    setProdPrice(p.price != null ? String(p.price) : '');
    setProdCurrency(p.currency || 'PHP');
    setProdError('');
    setIsProductModalOpen(true);
  };

  // Product save handler
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) {
      setProdError('Please provide a product or item name.');
      return;
    }

    try {
      setProdSaving(true);
      setProdError('');
      const priceVal = prodPrice.trim() ? parseFloat(prodPrice) : null;

      if (editingProduct) {
        await updateMerchantProduct(editingProduct.id, {
          name: prodName.trim(),
          description: prodDescription.trim(),
          price: priceVal,
          currency: prodCurrency,
        });
      } else {
        await createMerchantProduct({
          name: prodName.trim(),
          description: prodDescription.trim(),
          price: priceVal,
          currency: prodCurrency,
        });
      }

      setIsProductModalOpen(false);
      void loadData();
    } catch (err: any) {
      setProdError(err.message || 'Failed to save product.');
    } finally {
      setProdSaving(false);
    }
  };

  // Archive product handler
  const handleArchiveProduct = async (id: string) => {
    if (!confirm('Are you sure you want to remove this product from your showcase catalog?')) return;
    try {
      await archiveMerchantProduct(id);
      void loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to remove product.');
    }
  };

  if (loading || authLoading) {
    return (
      <Navigation>
        <div className="max-w-5xl mx-auto px-4 py-20 text-center text-[#888]">
          Loading merchant workspace...
        </div>
      </Navigation>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <Navigation>
        <div className="max-w-md mx-auto px-4 py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center mx-auto mb-4">
            <Store size={32} />
          </div>
          <h2 className="text-xl font-bold text-[#1B4332] mb-2">Merchant Sign In Required</h2>
          <p className="text-sm text-[#666] mb-6">
            Please log in with your JuanDerQuest account to access your merchant workspace.
          </p>
          <Link
            href="/auth/signin"
            className="inline-block px-6 py-2.5 bg-[#1B4332] text-white rounded-xl text-sm font-bold shadow hover:bg-[#2D6A4F] transition-all"
          >
            Sign In to Continue
          </Link>
        </div>
      </Navigation>
    );
  }

  // Signed in, but no active merchant workspace
  if (!identity?.has_merchant) {
    return (
      <Navigation>
        <div className="max-w-xl mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#FEF3C7] text-[#92400E] flex items-center justify-center mx-auto mb-4">
            <Building2 size={32} />
          </div>
          <h2 className="text-2xl font-bold text-[#1B4332] mb-2">No Active Merchant Workspace</h2>
          <p className="text-sm text-[#666] mb-6 leading-relaxed">
            Your account does not currently own a verified merchant establishment on JuanDerQuest. If you represent a Pangasinan tourism business, you can apply in minutes through our partner portal.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/affiliate"
              className="px-6 py-3 bg-[#1B4332] text-white rounded-xl text-sm font-bold shadow hover:bg-[#2D6A4F] transition-all flex items-center gap-2"
            >
              Apply for Merchant Affiliation <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </Navigation>
    );
  }

  const merchant = dashboardData?.merchant || identity.merchant!;

  return (
    <Navigation>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Workspace Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#2D6A4F] mb-1">
              <Store size={14} /> Merchant Partner Workspace
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B4332] tracking-tight">
              {merchant.name}
            </h1>
            <p className="text-xs text-[#666] mt-1 flex items-center gap-2">
              <MapPin size={12} /> {merchant.location}
              <span>•</span>
              <span className="capitalize">{merchant.category || 'Local Business'}</span>
            </p>
          </div>

          {/* Publication Toggle Button */}
          <div className="flex items-center gap-3">
            <Link href="/merchant/funding" className="inline-flex items-center gap-2 rounded-xl border border-[#D5C4AC] bg-white px-3 py-2 text-xs font-bold text-[#1B4332] hover:bg-[#FAF9F5]">
              <Coins size={14} /> Points &amp; sponsorships
            </Link>
            <div className="text-right">
              <span className="text-[11px] text-[#777] block font-medium">Showcase Status</span>
              <span className={`text-xs font-bold ${merchant.is_published ? 'text-[#166534]' : 'text-[#854D0E]'}`}>
                {merchant.is_published ? 'Published to Travelers' : 'Draft / Unpublished'}
              </span>
            </div>
            <button
              onClick={handleTogglePublish}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
                merchant.is_published
                  ? 'bg-[#E9E8E4] text-[#444] hover:bg-[#DDD]'
                  : 'bg-[#2D6A4F] text-white hover:bg-[#1B4332]'
              }`}
            >
              <Globe size={14} />
              {merchant.is_published ? 'Unpublish Showcase' : 'Publish Profile'}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-[#D5C4AC] pb-3 mb-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'overview'
                ? 'bg-[#1B4332] text-white shadow-sm'
                : 'bg-white text-[#555] hover:bg-[#E9E8E4]'
            }`}
          >
            Overview & Checklist
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'profile'
                ? 'bg-[#1B4332] text-white shadow-sm'
                : 'bg-white text-[#555] hover:bg-[#E9E8E4]'
            }`}
          >
            Business Profile & Contacts
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'products'
                ? 'bg-[#1B4332] text-white shadow-sm'
                : 'bg-white text-[#555] hover:bg-[#E9E8E4]'
            }`}
          >
            Products & Specialties ({products.length})
          </button>
        </div>

        {/* TAB 1: OVERVIEW & SETUP CHECKLIST */}
        {activeTab === 'overview' && dashboardData && (
          <div className="space-y-6">
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 bg-white rounded-2xl border border-[#E0D8CA]">
                <span className="text-xs text-[#777] font-medium">Showcase Products</span>
                <div className="text-2xl font-black text-[#1B4332] mt-1">
                  {dashboardData.counts.active_products}
                </div>
                <span className="text-[11px] text-[#888] mt-1 block">Active catalog listings</span>
              </div>

              <div className="p-5 bg-white rounded-2xl border border-[#E0D8CA]">
                <span className="text-xs text-[#777] font-medium">Affiliation Status</span>
                <div className="text-2xl font-black text-[#2D6A4F] mt-1 flex items-center gap-1.5">
                  <ShieldCheck size={24} /> Verified
                </div>
                <span className="text-[11px] text-[#888] mt-1 block">Accredited tourism partner</span>
              </div>

              <div className="p-5 bg-white rounded-2xl border border-[#E0D8CA]">
                <span className="text-xs text-[#777] font-medium">Profile Completeness</span>
                <div className="text-2xl font-black text-[#B45309] mt-1">
                  {dashboardData.checklist.completed_count} / {dashboardData.checklist.total_count}
                </div>
                <span className="text-[11px] text-[#888] mt-1 block">Setup tasks completed</span>
              </div>
            </div>

            {/* Checklist Card */}
            <div className="p-6 bg-white rounded-2xl border border-[#E0D8CA]">
              <h3 className="text-base font-bold text-[#1B4332] mb-1">Establishment Setup Checklist</h3>
              <p className="text-xs text-[#666] mb-5">
                Complete these initial items so tourists have all the details they need to visit your store.
              </p>

              <div className="space-y-3">
                {dashboardData.checklist.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-[#F0EAE1] bg-[#FAF9F5]"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                        item.completed ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#E9E8E4] text-[#888]'
                      }`}>
                        {item.completed ? <CheckCircle2 size={14} /> : '○'}
                      </div>
                      <span className={`text-xs font-semibold ${item.completed ? 'text-[#333]' : 'text-[#777]'}`}>
                        {item.title}
                      </span>
                    </div>

                    {!item.completed && (
                      <button
                        onClick={() => {
                          if (item.id.includes('product')) setActiveTab('products');
                          else setActiveTab('profile');
                        }}
                        className="text-xs font-bold text-[#2D6A4F] hover:underline flex items-center gap-1"
                      >
                        Complete <ChevronRight size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Truthful Notice Card */}
            <div className="p-5 bg-[#FBF9F5] border border-[#E5DEC9] rounded-2xl flex items-start gap-3">
              <Info size={18} className="text-[#854D0E] shrink-0 mt-0.5" />
              <div className="text-xs text-[#666] leading-relaxed">
                <strong className="text-[#444] block mb-0.5">Sovereign Discovery Notice:</strong>
                {dashboardData.truthful_notice.statement}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BUSINESS PROFILE & CONTACTS */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E0D8CA]">
            <h3 className="text-base font-bold text-[#1B4332] mb-1">Edit Business Profile & Public Details</h3>
            <p className="text-xs text-[#666] mb-6">
              Update how your establishment appears to travelers across quest waypoint maps and listings.
            </p>

            {profileSuccessMsg && (
              <div className="mb-6 p-4 bg-[#DCFCE7] text-[#166534] rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 size={16} /> {profileSuccessMsg}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-5 max-w-2xl">
              <div>
                <label className="block text-xs font-bold text-[#333] mb-1">Establishment Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D5C4AC] bg-[#FAF9F5] text-sm focus:outline-none focus:border-[#2D6A4F]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#333] mb-1">Locality & Physical Landmark</label>
                <input
                  type="text"
                  value={profileLocation}
                  onChange={(e) => setProfileLocation(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D5C4AC] bg-[#FAF9F5] text-sm focus:outline-none focus:border-[#2D6A4F]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#333] mb-1">Public Inquiries Email</label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#D5C4AC] bg-[#FAF9F5] text-sm focus:outline-none focus:border-[#2D6A4F]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#333] mb-1">Public Contact Phone</label>
                  <input
                    type="tel"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#D5C4AC] bg-[#FAF9F5] text-sm focus:outline-none focus:border-[#2D6A4F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#333] mb-1">Description & Visitor Story</label>
                <textarea
                  rows={4}
                  value={profileDescription}
                  onChange={(e) => setProfileDescription(e.target.value)}
                  placeholder="Tell travelers what makes your establishment unique..."
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D5C4AC] bg-[#FAF9F5] text-sm focus:outline-none focus:border-[#2D6A4F]"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-6 py-2.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow"
                >
                  <Save size={14} /> {savingProfile ? 'Saving Changes...' : 'Save Profile Details'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: PRODUCTS & SPECIALTIES */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1B4332]">Showcase Catalog</h3>
                <p className="text-xs text-[#666]">
                  Informational products, culinary dishes, or tour offerings displayed on your store profile.
                </p>
              </div>
              <button
                onClick={openNewProductModal}
                className="px-4 py-2 bg-[#2D6A4F] hover:bg-[#1B4332] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Plus size={14} /> Add Product / Specialty
              </button>
            </div>

            {products.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-[#D5C4AC]">
                <Package size={36} className="mx-auto text-[#AAA] mb-2" />
                <h4 className="text-sm font-bold text-[#333]">No Products Listed Yet</h4>
                <p className="text-xs text-[#777] max-w-sm mx-auto mt-1 mb-4">
                  Add local specialties like grilled milkfish, artisanal handicrafts, or boat tours to your catalog.
                </p>
                <button
                  onClick={openNewProductModal}
                  className="px-4 py-2 bg-[#1B4332] text-white rounded-xl text-xs font-bold"
                >
                  Add Your First Item
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((p) => (
                  <div key={p.id} className="p-5 bg-white rounded-2xl border border-[#E0D8CA] flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-sm text-[#1B4332]">{p.name}</h4>
                        {p.price != null && (
                          <span className="text-xs font-black text-[#2D6A4F] shrink-0">
                            {p.currency} {Number(p.price).toFixed(2)}
                          </span>
                        )}
                      </div>
                      {p.description && (
                        <p className="text-xs text-[#666] mt-2 line-clamp-3 leading-relaxed">
                          {p.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-[#F0EAE1]">
                      <button
                        onClick={() => openEditProductModal(p)}
                        className="p-1.5 text-[#555] hover:text-[#1B4332] rounded hover:bg-[#F0EAE1]"
                        title="Edit product"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleArchiveProduct(p.id)}
                        className="p-1.5 text-[#991B1B] hover:text-red-700 rounded hover:bg-[#FEE2E2]"
                        title="Archive product"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Product Modal */}
        {isProductModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
              <div className="flex justify-between items-center pb-3 border-b border-[#EEE] mb-4">
                <h3 className="font-bold text-base text-[#1B4332]">
                  {editingProduct ? 'Edit Product Item' : 'New Product or Specialty'}
                </h3>
                <button
                  onClick={() => setIsProductModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {prodError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg">
                  {prodError}
                </div>
              )}

              <form onSubmit={handleSaveProduct} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#333] mb-1">
                    Product / Specialty Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Bonuan Marinated Milkfish"
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D5C4AC] bg-[#FAF9F5] text-xs focus:outline-none focus:border-[#2D6A4F]"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#333] mb-1">Display Price (Optional)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g., 250.00"
                      value={prodPrice}
                      onChange={(e) => setProdPrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#D5C4AC] bg-[#FAF9F5] text-xs focus:outline-none focus:border-[#2D6A4F]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#333] mb-1">Currency</label>
                    <input
                      type="text"
                      value={prodCurrency}
                      onChange={(e) => setProdCurrency(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#D5C4AC] bg-[#FAF9F5] text-xs focus:outline-none focus:border-[#2D6A4F]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#333] mb-1">Description (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Freshly vacuum-packed boneless bangus from local Dagupan fish ponds..."
                    value={prodDescription}
                    onChange={(e) => setProdDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D5C4AC] bg-[#FAF9F5] text-xs focus:outline-none focus:border-[#2D6A4F]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#EEE]">
                  <button
                    type="button"
                    onClick={() => setIsProductModalOpen(false)}
                    className="px-4 py-2 border border-[#DDD] rounded-xl text-xs font-bold text-[#666]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={prodSaving}
                    className="px-5 py-2 bg-[#1B4332] text-white rounded-xl text-xs font-bold hover:bg-[#2D6A4F]"
                  >
                    {prodSaving ? 'Saving...' : 'Save Item'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Navigation>
  );
}
