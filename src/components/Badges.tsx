'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  UserBadge,
  DestinationBadge,
  getActiveNametagBadges,
  getUserBadges,
  onBadgesUpdated,
} from '@/lib/badges';
import { Sparkles, Shield, Award, HelpCircle, CheckCircle2, ExternalLink } from 'lucide-react';

// ========================================================================
// Global Badge Preview Coordinator (Prevents overlapping modals when hovering across adjacent badges)
// ========================================================================

type ActiveModalInfo = {
  id: string;
  badge: UserBadge | DestinationBadge;
  kind?: 'user' | 'destination';
  anchorRect: DOMRect | null;
} | null;

let currentActiveModal: ActiveModalInfo = null;
const modalListeners = new Set<(active: ActiveModalInfo) => void>();
let globalCloseTimer: NodeJS.Timeout | null = null;

export const openBadgeModal = (
  id: string,
  badge: UserBadge | DestinationBadge,
  anchorRect: DOMRect | null,
  kind?: 'user' | 'destination'
) => {
  if (globalCloseTimer) {
    clearTimeout(globalCloseTimer);
    globalCloseTimer = null;
  }
  currentActiveModal = { id, badge, anchorRect, kind };
  modalListeners.forEach((listener) => listener(currentActiveModal));
};

export const scheduleCloseBadgeModal = (id?: string, delay = 120) => {
  if (globalCloseTimer) clearTimeout(globalCloseTimer);
  globalCloseTimer = setTimeout(() => {
    if (!id || currentActiveModal?.id === id) {
      currentActiveModal = null;
      modalListeners.forEach((listener) => listener(null));
    }
  }, delay);
};

export const cancelCloseBadgeModal = () => {
  if (globalCloseTimer) {
    clearTimeout(globalCloseTimer);
    globalCloseTimer = null;
  }
};

export const closeBadgeModalImmediately = () => {
  if (globalCloseTimer) {
    clearTimeout(globalCloseTimer);
    globalCloseTimer = null;
  }
  currentActiveModal = null;
  modalListeners.forEach((listener) => listener(null));
};

// ========================================================================
// 0. Badge Preview Modal / Overlay
// ========================================================================

export interface BadgePreviewModalProps {
  badge: UserBadge | DestinationBadge;
  kind?: 'user' | 'destination';
  isOpen: boolean;
  onClose: () => void;
  anchorRect?: DOMRect | null;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const BadgePreviewModal: React.FC<BadgePreviewModalProps> = ({
  badge,
  kind = 'isNft' in badge || 'rarity' in badge ? 'user' : 'destination',
  isOpen,
  onClose,
  anchorRect,
  onMouseEnter,
  onMouseLeave,
}) => {
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const isUser = kind === 'user' || 'rarity' in badge;
  const userBadge = isUser ? (badge as UserBadge) : null;
  const destBadge = !isUser ? (badge as DestinationBadge) : null;

  // Static & responsive floating placement relative to anchor without blurring or bouncing
  let style: React.CSSProperties = {};
  if (anchorRect && typeof window !== 'undefined') {
    const modalWidth = Math.min(300, window.innerWidth - 24);
    const estimatedHeight = 250;
    const spaceBelow = window.innerHeight - anchorRect.bottom;

    let left = anchorRect.left + anchorRect.width / 2 - modalWidth / 2;
    if (left < 12) left = 12;
    if (left + modalWidth > window.innerWidth - 12) {
      left = window.innerWidth - modalWidth - 12;
    }

    let top = anchorRect.bottom + 8;
    if (spaceBelow < estimatedHeight && anchorRect.top > estimatedHeight) {
      top = anchorRect.top - estimatedHeight - 8;
    }

    style = {
      position: 'fixed',
      top: `${Math.max(10, top)}px`,
      left: `${left}px`,
      width: `${modalWidth}px`,
      maxWidth: 'calc(100vw - 24px)',
      zIndex: 9999,
    };
  } else {
    style = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '300px',
      maxWidth: 'calc(100vw - 24px)',
      zIndex: 9999,
    };
  }

  const modalContent = (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${badge.name} details`}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave || onClose}
      onClick={(e) => e.stopPropagation()}
      className="bg-white rounded-2xl border border-[#D5C4AC] shadow-xl p-3.5 text-left text-[#2C221E] space-y-2.5 transition-opacity duration-100 opacity-100 pointer-events-auto select-none"
    >
      {/* Header with Icon and Title */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 border shadow-2xs relative overflow-hidden select-none ${
            badge.themeColor.bg
          } ${badge.themeColor.border} ${badge.themeColor.text}`}
        >
          {userBadge?.isNft && (
            <span
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[badge-glint_2.5s_ease-in-out_infinite] pointer-events-none"
              aria-hidden="true"
            />
          )}
          <span role="img" aria-label={badge.name} className="leading-none">
            {badge.icon}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-xs font-black text-[#2C221E] leading-snug truncate">
              {badge.name}
            </h3>
            {userBadge?.isNft && (
              <span className="px-1 py-0.2 rounded text-[8px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-900 border border-amber-500/30">
                Soulbound
              </span>
            )}
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800 mt-0.5">
            {userBadge ? (
              <>
                {userBadge.rarity} Rarity {userBadge.network ? `• ${userBadge.network}` : `• ${userBadge.type}`}
              </>
            ) : (
              <>
                {destBadge?.category.toUpperCase()} • Destination Badge
              </>
            )}
          </p>
        </div>
      </div>

      {/* Description */}
      <div className="bg-[#FAF9F5] p-2.5 rounded-xl border border-[#E3DFD5]/80 text-[11px] text-[#582F0E] leading-relaxed">
        {badge.description}
      </div>

      {/* What the user / spot did to achieve this badge */}
      <div className="space-y-1">
        <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[#2D6A4F]">
          <Award className="w-3 h-3" />
          <span>Achievement Criteria</span>
        </div>

        <p className="text-[11px] text-[#514532] leading-snug font-medium pl-0.5">
          {badge.howToEarn || 'Earned through verified community participation and on-site Pangasinan exploration.'}
        </p>

        {badge.criteria && badge.criteria.length > 0 && (
          <ul className="pt-1 space-y-0.5 pl-0.5">
            {badge.criteria.map((item, idx) => (
              <li key={idx} className="flex items-start gap-1 text-[10.5px] text-[#514532]">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                <span className="leading-tight">{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Blockchain / Verification Footnote */}
      {userBadge?.tokenId && (
        <div className="pt-1.5 border-t border-[#F2EFE9] flex items-center justify-between text-[10px] text-[#837560]">
          <span>Token Identifier</span>
          <span className="font-mono font-bold text-[#2D6A4F]">{userBadge.tokenId}</span>
        </div>
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
};

// ========================================================================
// 1. User Badge Chip (Full badge chip with icon + label)
// ========================================================================

export interface UserBadgeChipProps {
  badge: UserBadge;
  size?: 'xs' | 'sm' | 'md';
  showDetails?: boolean;
  enablePreviewModal?: boolean;
  className?: string;
}

export const UserBadgeChip: React.FC<UserBadgeChipProps> = ({
  badge,
  size = 'sm',
  showDetails = false,
  enablePreviewModal = true,
  className = '',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const handleModalChange = (active: ActiveModalInfo) => {
      if (active?.id === badge.id) {
        setAnchorRect(active.anchorRect);
        setIsModalOpen(true);
      } else {
        setIsModalOpen(false);
      }
    };
    modalListeners.add(handleModalChange);
    return () => {
      modalListeners.delete(handleModalChange);
    };
  }, [badge.id]);

  const openPreview = () => {
    if (!enablePreviewModal) return;
    const rect = triggerRef.current ? triggerRef.current.getBoundingClientRect() : null;
    openBadgeModal(badge.id, badge, rect, 'user');
  };

  const scheduleClose = () => {
    scheduleCloseBadgeModal(badge.id, 120);
  };

  const cancelClose = () => {
    cancelCloseBadgeModal();
  };

  const handleClick = (e: React.MouseEvent) => {
    if (enablePreviewModal) {
      e.preventDefault();
      e.stopPropagation();
      openPreview();
    }
  };

  const isXs = size === 'xs';
  const isSm = size === 'sm';
  const isMd = size === 'md';

  const sizeClasses = isXs
    ? 'text-[10px] px-1.5 py-0.5 gap-1'
    : isSm
    ? 'text-[11px] px-2 py-0.5 gap-1.5'
    : 'text-xs px-2.5 py-1 gap-1.5';

  return (
    <>
      <span
        ref={triggerRef}
        tabIndex={0}
        onClick={handleClick}
        onMouseEnter={openPreview}
        onMouseLeave={scheduleClose}
        onFocus={openPreview}
        onBlur={scheduleClose}
        className={`inline-flex items-center font-bold rounded-lg border transition-all select-none cursor-pointer hover:shadow-xs active:scale-95 focus:outline-hidden focus:ring-1 focus:ring-amber-500/50 ${badge.themeColor.bg} ${badge.themeColor.text} ${badge.themeColor.border} ${sizeClasses} ${
          badge.isNft ? 'relative overflow-hidden shadow-xs ring-1 ring-amber-400/30' : ''
        } ${className}`}
      >
        {/* Glint effect for NFTs */}
        {badge.isNft && (
          <span
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[badge-glint_3s_ease-in-out_infinite] pointer-events-none"
            aria-hidden="true"
          />
        )}

        {/* Badge Icon */}
        <span className="shrink-0 text-[12px] leading-none" role="img" aria-label={badge.name}>
          {badge.icon}
        </span>

        {/* Badge Name */}
        <span className="truncate max-w-[140px] tracking-tight">{badge.name}</span>

        {/* NFT indicator pill */}
        {badge.isNft && (
          <span className="shrink-0 px-1 py-0.2 rounded text-[8px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-900 border border-amber-500/30">
            NFT
          </span>
        )}

        {showDetails && badge.tokenId && (
          <span className="text-[9px] opacity-75 font-mono">{badge.tokenId}</span>
        )}
      </span>

      {isModalOpen && (
        <BadgePreviewModal
          badge={badge}
          kind="user"
          isOpen={isModalOpen}
          onClose={closeBadgeModalImmediately}
          anchorRect={anchorRect}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        />
      )}
    </>
  );
};

// ========================================================================
// 2. User Badge Icon (Discord / Reddit style compact badge icon)
// ========================================================================

export interface UserBadgeIconProps {
  badge: UserBadge;
  size?: 'xs' | 'sm' | 'md';
  enablePreviewModal?: boolean;
  onClick?: () => void;
  className?: string;
}

export const UserBadgeIcon: React.FC<UserBadgeIconProps> = ({
  badge,
  size = 'xs',
  enablePreviewModal = true,
  onClick,
  className = '',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const handleModalChange = (active: ActiveModalInfo) => {
      if (active?.id === badge.id) {
        setAnchorRect(active.anchorRect);
        setIsModalOpen(true);
      } else {
        setIsModalOpen(false);
      }
    };
    modalListeners.add(handleModalChange);
    return () => {
      modalListeners.delete(handleModalChange);
    };
  }, [badge.id]);

  const openPreview = () => {
    if (!enablePreviewModal) return;
    const rect = triggerRef.current ? triggerRef.current.getBoundingClientRect() : null;
    openBadgeModal(badge.id, badge, rect, 'user');
  };

  const scheduleClose = () => {
    scheduleCloseBadgeModal(badge.id, 120);
  };

  const cancelClose = () => {
    cancelCloseBadgeModal();
  };

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick();
      return;
    }
    if (enablePreviewModal) {
      e.preventDefault();
      e.stopPropagation();
      openPreview();
    }
  };

  const isXs = size === 'xs';
  const isSm = size === 'sm';

  const dimensionClasses = isXs
    ? 'w-4.5 h-4.5 text-[10.5px] rounded-sm'
    : isSm
    ? 'w-5.5 h-5.5 text-[12px] rounded-md'
    : 'w-6.5 h-6.5 text-[14px] rounded-md';

  return (
    <>
      <span
        ref={triggerRef}
        role="button"
        tabIndex={0}
        aria-label={badge.name}
        onClick={handleClick}
        onMouseEnter={openPreview}
        onMouseLeave={scheduleClose}
        onFocus={openPreview}
        onBlur={scheduleClose}
        className={`inline-flex items-center justify-center border shrink-0 transition-transform duration-150 select-none hover:scale-115 active:scale-95 cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-amber-500/60 ${dimensionClasses} ${
          badge.themeColor.bg
        } ${badge.themeColor.border} ${badge.themeColor.text} ${
          badge.isNft
            ? 'relative overflow-hidden shadow-2xs ring-1 ring-amber-400/50'
            : 'shadow-2xs'
        } ${className}`}
      >
        {badge.isNft && (
          <span
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent -translate-x-full animate-[badge-glint_3s_ease-in-out_infinite] pointer-events-none"
            aria-hidden="true"
          />
        )}
        <span className="leading-none">{badge.icon}</span>
      </span>

      {isModalOpen && (
        <BadgePreviewModal
          badge={badge}
          kind="user"
          isOpen={isModalOpen}
          onClose={closeBadgeModalImmediately}
          anchorRect={anchorRect}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        />
      )}
    </>
  );
};

// ========================================================================
// 3. User Badges Row (Discord / Reddit style badge cluster)
// ========================================================================

export interface UserBadgesRowProps {
  badges?: UserBadge[];
  userIdOrName?: string;
  isCurrentUser?: boolean;
  size?: 'xs' | 'sm' | 'md';
  maxDisplay?: number;
  enablePreviewModal?: boolean;
  className?: string;
}

export const UserBadgesRow: React.FC<UserBadgesRowProps> = ({
  badges: customBadges,
  userIdOrName = '',
  isCurrentUser = false,
  size = 'xs',
  maxDisplay = 3,
  enablePreviewModal = true,
  className = '',
}) => {
  const [resolvedBadges, setResolvedBadges] = useState<UserBadge[]>(() => {
    if (customBadges && customBadges.length > 0) return customBadges;
    if (isCurrentUser) return getActiveNametagBadges();
    if (userIdOrName) return getUserBadges(userIdOrName, isCurrentUser);
    return [];
  });

  useEffect(() => {
    if (customBadges && customBadges.length > 0) {
      setResolvedBadges(customBadges);
      return;
    }
    if (isCurrentUser) {
      setResolvedBadges(getActiveNametagBadges());
      const unsubscribe = onBadgesUpdated(() => {
        setResolvedBadges(getActiveNametagBadges());
      });
      return unsubscribe;
    }
    if (userIdOrName) {
      setResolvedBadges(getUserBadges(userIdOrName, isCurrentUser));
    }
  }, [customBadges, userIdOrName, isCurrentUser]);

  if (!resolvedBadges || resolvedBadges.length === 0) return null;

  const visible = resolvedBadges.slice(0, maxDisplay);
  const remaining = resolvedBadges.length - maxDisplay;

  return (
    <span className={`inline-flex items-center gap-1.5 shrink-0 ${className}`}>
      {visible.map((b) => (
        <UserBadgeIcon
          key={b.id}
          badge={b}
          size={size}
          enablePreviewModal={enablePreviewModal}
        />
      ))}
      {remaining > 0 && (
        <span
          className="inline-flex items-center justify-center text-[9px] font-black px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200 select-none cursor-default"
          aria-label={`${remaining} more badges`}
        >
          +{remaining}
        </span>
      )}
    </span>
  );
};

// ========================================================================
// 4. User Nametag (Username + Display Badges alongside)
// ========================================================================

export interface UserNametagProps {
  displayName: string;
  handle?: string | null;
  badges?: UserBadge[];
  badgeIds?: string[];
  isCurrentUser?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showHandle?: boolean;
  iconOnly?: boolean;
  badgeSize?: 'xs' | 'sm' | 'md';
  enablePreviewModal?: boolean;
  className?: string;
}

export const UserNametag: React.FC<UserNametagProps> = ({
  displayName,
  handle,
  badges: customBadges,
  isCurrentUser = false,
  size = 'md',
  showHandle = false,
  iconOnly = true,
  badgeSize,
  enablePreviewModal = true,
  className = '',
}) => {
  const [activeBadges, setActiveBadges] = useState<UserBadge[]>(() => {
    if (customBadges && customBadges.length > 0) return customBadges;
    if (isCurrentUser) return getActiveNametagBadges();
    return getUserBadges(displayName, isCurrentUser);
  });

  useEffect(() => {
    if (customBadges && customBadges.length > 0) {
      setActiveBadges(customBadges);
      return;
    }
    if (isCurrentUser) {
      setActiveBadges(getActiveNametagBadges());
      const unsubscribe = onBadgesUpdated(() => {
        setActiveBadges(getActiveNametagBadges());
      });
      return unsubscribe;
    }
    setActiveBadges(getUserBadges(displayName, isCurrentUser));
  }, [isCurrentUser, customBadges, displayName]);

  const displayBadges = customBadges ?? activeBadges;
  const effectiveBadgeSize = badgeSize ?? (size === 'sm' ? 'xs' : size === 'lg' ? 'sm' : 'xs');

  return (
    <div className={`inline-flex items-center flex-wrap gap-1.5 leading-tight ${className}`}>
      <span
        className={`font-black text-[var(--color-brand-brown)] truncate ${
          size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base sm:text-lg' : 'text-sm'
        }`}
      >
        {displayName}
      </span>

      {showHandle && handle && (
        <span className="text-[11px] text-[var(--color-text-muted)] font-mono">
          @{handle.replace(/^@/, '')}
        </span>
      )}

      {/* Badges beside username (Discord/Reddit style icon row or full chips) */}
      {displayBadges && displayBadges.length > 0 && (
        iconOnly ? (
          <UserBadgesRow
            badges={displayBadges}
            size={effectiveBadgeSize}
            enablePreviewModal={enablePreviewModal}
          />
        ) : (
          <div className="inline-flex items-center flex-wrap gap-1.5">
            {displayBadges.map((badge) => (
              <UserBadgeChip
                key={badge.id}
                badge={badge}
                size={size === 'sm' ? 'xs' : 'sm'}
                enablePreviewModal={enablePreviewModal}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
};

// ========================================================================
// 5. Destination / Post Badge Chip
// ========================================================================

export interface DestinationBadgeChipProps {
  badge: DestinationBadge;
  size?: 'xs' | 'sm';
  iconOnly?: boolean;
  enablePreviewModal?: boolean;
  className?: string;
}

export const DestinationBadgeChip: React.FC<DestinationBadgeChipProps> = ({
  badge,
  size = 'xs',
  iconOnly = false,
  enablePreviewModal = true,
  className = '',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const handleModalChange = (active: ActiveModalInfo) => {
      if (active?.id === badge.id) {
        setAnchorRect(active.anchorRect);
        setIsModalOpen(true);
      } else {
        setIsModalOpen(false);
      }
    };
    modalListeners.add(handleModalChange);
    return () => {
      modalListeners.delete(handleModalChange);
    };
  }, [badge.id]);

  const openPreview = () => {
    if (!enablePreviewModal) return;
    const rect = triggerRef.current ? triggerRef.current.getBoundingClientRect() : null;
    openBadgeModal(badge.id, badge, rect, 'destination');
  };

  const scheduleClose = () => {
    scheduleCloseBadgeModal(badge.id, 120);
  };

  const cancelClose = () => {
    cancelCloseBadgeModal();
  };

  const handleClick = (e: React.MouseEvent) => {
    if (enablePreviewModal) {
      e.preventDefault();
      e.stopPropagation();
      openPreview();
    }
  };

  const isXs = size === 'xs';

  if (iconOnly) {
    const dimensionClasses = isXs
      ? 'w-4.5 h-4.5 text-[10.5px] rounded-sm'
      : 'w-5.5 h-5.5 text-[12px] rounded-md';

    return (
      <>
        <span
          ref={triggerRef}
          role="button"
          tabIndex={0}
          aria-label={badge.name}
          onClick={handleClick}
          onMouseEnter={openPreview}
          onMouseLeave={scheduleClose}
          onFocus={openPreview}
          onBlur={scheduleClose}
          className={`inline-flex items-center justify-center border shrink-0 transition-transform duration-150 select-none hover:scale-115 active:scale-95 cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-amber-500/60 ${dimensionClasses} ${
            badge.themeColor.bg
          } ${badge.themeColor.border} ${badge.themeColor.text} shadow-2xs ${className}`}
        >
          <span className="leading-none">{badge.icon}</span>
        </span>

        {isModalOpen && (
          <BadgePreviewModal
            badge={badge}
            kind="destination"
            isOpen={isModalOpen}
            onClose={closeBadgeModalImmediately}
            anchorRect={anchorRect}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          />
        )}
      </>
    );
  }

  return (
    <>
      <span
        ref={triggerRef}
        tabIndex={0}
        onClick={handleClick}
        onMouseEnter={openPreview}
        onMouseLeave={scheduleClose}
        onFocus={openPreview}
        onBlur={scheduleClose}
        className={`inline-flex items-center font-bold rounded-full border transition-transform select-none cursor-pointer hover:shadow-xs active:scale-95 focus:outline-hidden focus:ring-1 focus:ring-amber-500/60 ${
          badge.themeColor.bg
        } ${badge.themeColor.text} ${badge.themeColor.border} ${
          isXs ? 'text-[9px] px-2 py-0.5 gap-1' : 'text-[10px] px-2.5 py-0.5 gap-1.5'
        } ${className}`}
      >
        <span className="shrink-0 text-[11px] leading-none" role="img" aria-label={badge.name}>
          {badge.icon}
        </span>
        <span className="truncate tracking-tight">{badge.name}</span>
      </span>

      {isModalOpen && (
        <BadgePreviewModal
          badge={badge}
          kind="destination"
          isOpen={isModalOpen}
          onClose={closeBadgeModalImmediately}
          anchorRect={anchorRect}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        />
      )}
    </>
  );
};

// ========================================================================
// 6. Destination Badge List
// ========================================================================

export interface DestinationBadgeListProps {
  badges: DestinationBadge[];
  maxDisplay?: number;
  size?: 'xs' | 'sm';
  iconOnly?: boolean;
  className?: string;
}

export const DestinationBadgeList: React.FC<DestinationBadgeListProps> = ({
  badges,
  maxDisplay = 3,
  size = 'xs',
  iconOnly = false,
  className = '',
}) => {
  if (!badges || badges.length === 0) return null;

  const visible = badges.slice(0, maxDisplay);
  const remainingCount = badges.length - maxDisplay;

  return (
    <div className={`flex flex-wrap items-center ${iconOnly ? 'gap-1.5' : 'gap-1.5'} ${className}`}>
      {visible.map((b) => (
        <DestinationBadgeChip key={b.id} badge={b} size={size} iconOnly={iconOnly} />
      ))}
      {remainingCount > 0 && (
        <span
          className={`font-black select-none cursor-default ${
            iconOnly
              ? 'inline-flex items-center justify-center text-[9px] px-1 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200'
              : 'text-[9px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200'
          }`}
          aria-label={`${remainingCount} more badges`}
        >
          +{remainingCount}
        </span>
      )}
    </div>
  );
};
