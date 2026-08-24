import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * Base animated skeleton element with fluid shimmer gradient
 */
export const Skeleton: React.FC<SkeletonProps> = ({ className = '', ...props }) => {
  return (
    <div
      className={`relative overflow-hidden bg-[#EAE6DF] rounded-xl before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent ${className}`}
      {...props}
    />
  );
};

/**
 * Skeleton placeholder for Explore / Destination cards in community feed
 */
export const SpotCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl border border-[#E3DFD5] p-5 sm:p-6 space-y-4 shadow-xs">
      {/* Top Meta Line */}
      <div className="flex items-center gap-2">
        <Skeleton className="w-24 h-4 rounded-md" />
        <Skeleton className="w-16 h-4 rounded-md" />
        <Skeleton className="w-20 h-4 rounded-md ml-auto" />
      </div>

      {/* Title */}
      <Skeleton className="w-3/4 h-7 rounded-lg" />

      {/* Description Lines */}
      <div className="space-y-2">
        <Skeleton className="w-full h-4 rounded-md" />
        <Skeleton className="w-5/6 h-4 rounded-md" />
      </div>

      {/* Media Image Box */}
      <Skeleton className="w-full h-56 sm:h-72 rounded-2xl" />

      {/* Action Footer Bar */}
      <div className="flex items-center justify-between pt-2 border-t border-[#E3DFD5]/60">
        <div className="flex items-center gap-2">
          <Skeleton className="w-16 h-8 rounded-xl" />
          <Skeleton className="w-20 h-8 rounded-xl" />
        </div>
        <Skeleton className="w-8 h-8 rounded-xl" />
      </div>
    </div>
  );
};

/**
 * Skeleton placeholder for Quest Trail cards
 */
export const QuestCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl border border-[#E3DFD5] p-5 space-y-4 shadow-xs flex flex-col justify-between h-[280px]">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="w-24 h-5 rounded-lg" />
          <Skeleton className="w-20 h-6 rounded-lg" />
        </div>
        <Skeleton className="w-4/5 h-6 rounded-lg" />
        <div className="space-y-1.5">
          <Skeleton className="w-full h-3.5 rounded-md" />
          <Skeleton className="w-11/12 h-3.5 rounded-md" />
          <Skeleton className="w-2/3 h-3.5 rounded-md" />
        </div>
        <Skeleton className="w-1/2 h-4 rounded-md" />
      </div>
      <div className="pt-3 border-t border-[#E3DFD5]/60 flex items-center justify-between">
        <Skeleton className="w-28 h-4 rounded-md" />
        <Skeleton className="w-24 h-8 rounded-xl" />
      </div>
    </div>
  );
};

/**
 * Skeleton placeholder for Spot Detail page
 */
export const SpotDetailSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Hero Banner */}
      <Skeleton className="w-full h-72 sm:h-96 rounded-3xl" />

      {/* Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-6 border border-[#E3DFD5] space-y-3">
            <Skeleton className="w-32 h-5 rounded-lg" />
            <Skeleton className="w-3/4 h-8 rounded-lg" />
            <Skeleton className="w-full h-4 rounded-md" />
            <Skeleton className="w-full h-4 rounded-md" />
            <Skeleton className="w-2/3 h-4 rounded-md" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-6 border border-[#E3DFD5] space-y-3">
            <Skeleton className="w-28 h-5 rounded-lg" />
            <Skeleton className="w-full h-10 rounded-xl" />
            <Skeleton className="w-full h-10 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Skeleton placeholder for Merchant Voucher cards
 */
export const VoucherCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl border border-[#E3DFD5] p-5 space-y-3 shadow-xs">
      <div className="flex items-center justify-between">
        <Skeleton className="w-28 h-4 rounded-md" />
        <Skeleton className="w-16 h-6 rounded-lg" />
      </div>
      <Skeleton className="w-3/4 h-6 rounded-lg" />
      <Skeleton className="w-full h-4 rounded-md" />
      <div className="pt-2 border-t border-[#E3DFD5]/60 flex items-center justify-between">
        <Skeleton className="w-20 h-4 rounded-md" />
        <Skeleton className="w-24 h-8 rounded-xl" />
      </div>
    </div>
  );
};

/**
 * Skeleton placeholder for Governance Proposal cards
 */
export const ProposalCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl border border-[#E3DFD5] p-6 space-y-4 shadow-xs">
      <div className="flex items-center justify-between">
        <Skeleton className="w-24 h-5 rounded-lg" />
        <Skeleton className="w-32 h-4 rounded-md" />
      </div>
      <Skeleton className="w-2/3 h-7 rounded-lg" />
      <Skeleton className="w-full h-4 rounded-md" />
      <Skeleton className="w-5/6 h-4 rounded-md" />
      <div className="pt-3 border-t border-[#E3DFD5]/60 flex items-center justify-between">
        <Skeleton className="w-36 h-4 rounded-md" />
        <div className="flex gap-2">
          <Skeleton className="w-20 h-8 rounded-xl" />
          <Skeleton className="w-20 h-8 rounded-xl" />
        </div>
      </div>
    </div>
  );
};
