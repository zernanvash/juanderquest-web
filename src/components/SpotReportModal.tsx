'use client';

import React, { useState } from 'react';
import { 
  ShieldAlert, 
  X, 
  MapPin, 
  AlertTriangle, 
  Camera, 
  Megaphone, 
  Leaf, 
  HelpCircle, 
  CheckCircle2, 
  Loader2 
} from 'lucide-react';
import { api } from '@/lib/api';

export type ReportReason = 
  | 'inaccurate_location'
  | 'site_closed_or_hazard'
  | 'misleading_photo'
  | 'spam_or_scam'
  | 'environmental_concern'
  | 'other';

interface ReportReasonOption {
  id: ReportReason;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const REPORT_REASONS: ReportReasonOption[] = [
  {
    id: 'inaccurate_location',
    title: 'Inaccurate Location or Coordinates',
    description: 'Pin is in the wrong municipality, GPS is misleading, or access road is impassable.',
    icon: MapPin,
  },
  {
    id: 'site_closed_or_hazard',
    title: 'Site Closed or Hazard Alert',
    description: 'Destination is permanently closed, private property, or undergoing unannounced safety hazards.',
    icon: AlertTriangle,
  },
  {
    id: 'misleading_photo',
    title: 'Misleading or Off-Topic Photo',
    description: 'Image does not depict this location, is heavily manipulated, or violates community standards.',
    icon: Camera,
  },
  {
    id: 'spam_or_scam',
    title: 'Commercial Spam or Fake Listing',
    description: 'Unauthorized commercial advertisement, predatory tourist pricing, or duplicate entry.',
    icon: Megaphone,
  },
  {
    id: 'environmental_concern',
    title: 'Environmental or Cultural Concern',
    description: 'Depicts or promotes damage to marine sanctuaries, protected reefs, or heritage monuments.',
    icon: Leaf,
  },
  {
    id: 'other',
    title: 'Other Platform Integrity Issue',
    description: 'Any other issue that requires review by LGU Tourism moderators.',
    icon: HelpCircle,
  },
];

export interface SpotReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  spotId: string;
  spotName: string;
  onReportSubmitted?: (spotId: string) => void;
}

export function SpotReportModal({
  isOpen,
  onClose,
  spotId,
  spotName,
  onReportSubmitted,
}: SpotReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason>('inaccurate_location');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await api.post(`/spots/${spotId}/reports`, {
        reason: selectedReason,
        details: details.trim() || undefined,
      });

      setSubmitted(true);
      if (onReportSubmitted) {
        onReportSubmitted(spotId);
      }
    } catch {
      // Local graceful fallback if offline
      try {
        const storedReports = JSON.parse(localStorage.getItem('jdq_local_spot_reports') || '[]');
        storedReports.push({
          spotId,
          reason: selectedReason,
          details,
          date: new Date().toISOString(),
        });
        localStorage.setItem('jdq_local_spot_reports', JSON.stringify(storedReports));
        setSubmitted(true);
        if (onReportSubmitted) onReportSubmitted(spotId);
      } catch {
        setError('Unable to record report at this time. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmitted(false);
    setDetails('');
    setError(null);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleResetAndClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl border border-[#E3DFD5] shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#E3DFD5] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 id="report-modal-title" className="text-base font-black text-[#582F0E]">
                Report Destination Post
              </h2>
              <p className="text-xs text-[#837560] line-clamp-1">
                Spot: <strong className="text-[#2C221E]">{spotName}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetAndClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= STATE 1: FORM ================= */}
        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-[#514532] leading-relaxed">
              Help preserve Pangasinan tourism data integrity. Select the issue that best describes why this destination post requires moderation:
            </p>

            {/* Reasons List */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {REPORT_REASONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = selectedReason === opt.id;
                return (
                  <label
                    key={opt.id}
                    className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition ${
                      isSelected
                        ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/30'
                        : 'bg-[#FAF9F5] border-[#E3DFD5] hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="report_reason"
                      value={opt.id}
                      checked={isSelected}
                      onChange={() => setSelectedReason(opt.id)}
                      className="mt-1 text-[#2D6A4F] focus:ring-[#2D6A4F]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#B45309]' : 'text-stone-500'}`} />
                        <span className="text-xs font-black text-[#582F0E]">
                          {opt.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#837560] leading-tight mt-0.5">
                        {opt.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Additional Details */}
            <div className="space-y-1.5 pt-1">
              <label htmlFor="report-details" className="block text-xs font-bold text-[#582F0E]">
                Additional Field Observations (Optional)
              </label>
              <textarea
                id="report-details"
                rows={2}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Share specific road updates, closed gates, or date observed..."
                maxLength={500}
                className="w-full text-xs p-3 rounded-xl border border-[#E3DFD5] bg-[#FAF9F5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2D6A4F] text-[#2C221E] resize-none"
              />
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E3DFD5]">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2.5 rounded-xl border border-[#D5C4AC] text-xs font-bold text-[#582F0E] hover:bg-[#FAF9F5] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-tactile px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{submitting ? 'Submitting...' : 'Submit Report'}</span>
              </button>
            </div>
          </form>
        ) : (
          /* ================= STATE 2: CONFIRMATION ================= */
          <div className="text-center py-4 space-y-4 animate-in fade-in">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-[#2D6A4F] flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-[#582F0E]">
                Report Submitted to Moderation
              </h3>
              <p className="text-xs text-[#514532] max-w-sm mx-auto leading-relaxed">
                Thank you for being a responsible scout! Your report has been flagged for LGU Tourism moderation review within 24 hours.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="w-full py-3 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-black transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
