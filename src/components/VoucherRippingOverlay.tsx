'use client';

import React, { useState, useEffect } from 'react';
import { 
  Ticket, 
  Sparkles, 
  Copy, 
  CheckCircle2, 
  X, 
  Scissors, 
  Tag, 
  Store,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { triggerCelebration } from './CelebrationEffects';

export interface VoucherRippingOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  voucherTitle: string;
  merchantName: string;
  costPoints: number;
  redemptionCode: string;
  description?: string;
  userPointsLeft?: number;
}

export function VoucherRippingOverlay({
  isOpen,
  onClose,
  voucherTitle,
  merchantName,
  costPoints,
  redemptionCode,
  description,
  userPointsLeft,
}: VoucherRippingOverlayProps) {
  // Stages: 'pristine' (unripped) -> 'tearing' (paper ripping animation) -> 'ripped' (revealed code pass)
  const [tearStage, setTearStage] = useState<'pristine' | 'tearing' | 'ripped'>('pristine');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTearStage('pristine');
      setCopied(false);
      // Auto-trigger tear after brief suspenseful delay (600ms) or allow manual tap
      const timer = setTimeout(() => {
        handleTear();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleTear = () => {
    if (tearStage !== 'pristine') return;
    setTearStage('tearing');

    // Fire sound & tear particles right at the seam
    triggerCelebration({ type: 'ticket-rip', playAudio: true });

    // Transition to revealed pass after 550ms
    setTimeout(() => {
      setTearStage('ripped');
      // Fire grand party poppers celebration
      setTimeout(() => {
        triggerCelebration({ type: 'poppers', playAudio: true });
      }, 100);
    }, 550);
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(redemptionCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="voucher-rip-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dismiss Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-stone-400 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
          aria-label="Close voucher modal"
        >
          <span>Close</span>
          <X className="w-5 h-5" />
        </button>

        {/* ================= STAGE 1 & 2: PRISTINE / TEARING TICKET ================= */}
        {tearStage !== 'ripped' && (
          <div className="flex flex-col items-center">
            {/* Instruction pill */}
            <div className="mb-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-extrabold animate-bounce-subtle">
              <Scissors className="w-3.5 h-3.5" />
              <span>{tearStage === 'tearing' ? 'Ripping Ticket...' : 'Perforated Ticket Ready to Tear'}</span>
            </div>

            {/* Complete Physical Ticket Container */}
            <div
              onClick={handleTear}
              className={`w-full cursor-pointer relative transition-transform duration-300 ${
                tearStage === 'pristine' ? 'hover:scale-[1.02] active:scale-95' : ''
              }`}
            >
              {/* TOP MAIN TICKET BODY */}
              <div
                className={`relative bg-[#FFFDF7] rounded-t-3xl border-2 border-b-0 border-[#E8DCB8] p-6 shadow-2xl transition-all duration-500 ${
                  tearStage === 'tearing'
                    ? '-translate-y-2 -rotate-1 shadow-amber-900/40'
                    : ''
                }`}
              >
                {/* Decorative Side Notches (Cutouts) */}
                <div className="absolute -bottom-3.5 -left-4 w-7 h-7 rounded-full bg-stone-950/80 border border-[#E8DCB8]" />
                <div className="absolute -bottom-3.5 -right-4 w-7 h-7 rounded-full bg-stone-950/80 border border-[#E8DCB8]" />

                <div className="flex items-center justify-between border-b border-[#E8DCB8] pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-[#2D6A4F] text-white flex items-center justify-center font-black text-xs">
                      JQ
                    </span>
                    <span className="text-xs font-black text-[#582F0E] uppercase tracking-wider">
                      JuanDerQuest Voucher
                    </span>
                  </div>
                  <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-amber-100 text-[#7D5800] border border-amber-200">
                    {costPoints} PTS
                  </span>
                </div>

                <div className="space-y-1.5 text-center my-4">
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#2D6A4F]">
                    <Store className="w-3.5 h-3.5" />
                    <span>{merchantName}</span>
                  </div>
                  <h3 id="voucher-rip-title" className="text-xl font-black text-[#582F0E] leading-snug">
                    {voucherTitle}
                  </h3>
                  {description && (
                    <p className="text-xs text-[#837560] line-clamp-2 max-w-xs mx-auto pt-1">
                      {description}
                    </p>
                  )}
                </div>

                <div className="text-[10px] text-center font-mono text-stone-400 uppercase tracking-widest pt-2">
                  Official Merchant Partner Pass
                </div>
              </div>

              {/* PERFORATION SEAM WITH SCISSORS / TEAR LINE */}
              <div className="relative w-full h-0 z-20 flex items-center justify-center">
                <div className="w-full border-t-2 border-dashed border-[#D5C4AC]" />
                <div
                  className={`absolute px-3 py-1 rounded-full bg-amber-400 text-[#582F0E] text-[10px] font-black uppercase flex items-center gap-1.5 shadow-md transition-all duration-300 ${
                    tearStage === 'tearing'
                      ? 'scale-125 bg-red-500 text-white animate-pulse'
                      : ''
                  }`}
                >
                  <Scissors className="w-3 h-3" />
                  <span>{tearStage === 'tearing' ? 'TEARING...' : 'TEAR HERE'}</span>
                </div>
              </div>

              {/* BOTTOM CLAIM STUB (Detaches during tear) */}
              <div
                className={`relative bg-[#F9F6EE] rounded-b-3xl border-2 border-t-0 border-[#E8DCB8] p-5 shadow-2xl transition-all duration-500 origin-top-left ${
                  tearStage === 'tearing'
                    ? 'translate-y-8 rotate-12 opacity-0 pointer-events-none'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase tracking-wider text-stone-400 font-bold block">
                      Redemption Stub
                    </span>
                    <span className="text-xs font-mono font-bold text-[#582F0E]">
                      ●●●●-●●●●-CLAIM
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] uppercase tracking-wider text-stone-400 font-bold block">
                      Wallet
                    </span>
                    <span className="text-xs font-black text-[#2D6A4F]">
                      {userPointsLeft != null ? `${userPointsLeft} PTS left` : 'Verified'}
                    </span>
                  </div>
                </div>

                {/* Simulated Barcode */}
                <div className="mt-3 pt-2.5 border-t border-[#E8DCB8]/60 flex items-center justify-between px-2 opacity-60">
                  <div className="h-6 flex items-center gap-0.5">
                    {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 4, 1, 2, 3, 2, 1, 4].map((w, i) => (
                      <div
                        key={i}
                        className="h-full bg-stone-700"
                        style={{ width: `${w * 1.5}px` }}
                      />
                    ))}
                  </div>
                  <span className="text-[9px] font-mono font-bold text-stone-500">
                    JDQ-AUTH-2026
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= STAGE 3: REVEALED UNWRAPPED VOUCHER PASS ================= */}
        {tearStage === 'ripped' && (
          <div className="animate-in zoom-in-95 fade-in duration-300">
            <div className="relative bg-gradient-to-b from-white to-[#FAF9F5] rounded-3xl border-2 border-[#FFB703] p-6 sm:p-8 shadow-2xl text-center space-y-5 overflow-hidden">
              {/* Golden Ribbon Banner */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-[#FFB703] text-[#582F0E] text-xs font-black uppercase tracking-wider shadow-sm">
                <Sparkles className="w-4 h-4 fill-current" />
                <span>Voucher Claimed & Unwrapped!</span>
              </div>

              {/* Title & Merchant */}
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-xs font-extrabold text-[#2D6A4F]">
                  <Store className="w-4 h-4" />
                  <span>{merchantName}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#582F0E]">
                  {voucherTitle}
                </h2>
              </div>

              {/* MONOSPACE CODE BOX WITH PULSING GLOW & COPY */}
              <div className="p-4 sm:p-5 rounded-2xl bg-stone-900 text-white border-2 border-amber-400/80 shadow-inner relative group">
                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block mb-1.5">
                  Present this code to the merchant cashier:
                </span>
                <div className="text-2xl sm:text-3xl font-mono font-black tracking-widest text-[#FFB703] select-all py-1">
                  {redemptionCode}
                </div>

                <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFB703] hover:bg-[#F59E0B] text-[#582F0E] text-xs font-black transition cursor-pointer active:scale-95 shadow-md"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-[#582F0E]" />
                        <span>Code Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-[#582F0E]" />
                        <span>Copy Voucher Code</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Verification & Instructions */}
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-left flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-[#2D6A4F] shrink-0 mt-0.5" />
                <div className="text-xs text-[#2D6A4F] leading-relaxed">
                  <p className="font-extrabold">Instant Merchant Verification</p>
                  <p className="text-[11px] text-stone-600 mt-0.5">
                    Show this code when paying. Points have been deducted from your explorer wallet balance.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 px-5 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-black transition cursor-pointer shadow-md active:scale-95"
                >
                  Done • Back to Rewards
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
