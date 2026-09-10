/**
 * JuanDerQuest — Central Theme & UI Configuration
 *
 * Single Source of Truth for the global look and feel of the web application.
 * Modify values here or switch the active preset to transform the entire app's visual style.
 */

export interface ThemeColors {
  // Brand Identity
  brand: {
    primary: string;         // Pine Green / Emerald
    primaryHover: string;    // Darker Pine Green
    primaryLight: string;    // Soft mint background tint
    primaryMuted: string;    // Medium pine
    accent: string;          // Sun Gold / Amber
    accentHover: string;     // Deep Sun Gold
    accentLight: string;     // Soft gold background tint
    accentDark: string;      // Amber-brown text
    brown: string;           // Heritage Wood Brown
    brownDark: string;       // Deep Espresso
    brownLight: string;      // Caramel Brown
  };
  // Background & Surfaces
  background: {
    canvas: string;          // Page body background (Warm Sand/Paper)
    surface: string;         // Card & modal background (Pure White)
    surfaceSubtle: string;   // Nested containers, pills, search bars
    surfaceHover: string;    // Subtle hover state
    overlay: string;         // Modal backdrop
  };
  // Typography Colors
  text: {
    primary: string;         // High-contrast primary text
    secondary: string;       // Body text / descriptions
    muted: string;           // Captions, timestamps, metadata
    inverse: string;         // Light text on dark surfaces
  };
  // Borders & Dividers
  border: {
    default: string;         // Standard card and container border
    subtle: string;          // Subtle divider / table border
    focus: string;           // Keyboard and input focus ring
  };
  // Feedback & Statuses
  status: {
    success: string;
    successBg: string;
    warning: string;
    warningBg: string;
    danger: string;
    dangerBg: string;
    info: string;
    infoBg: string;
  };
  // Tourism Crowd Density
  crowd: {
    quiet: string;
    quietBg: string;
    moderate: string;
    moderateBg: string;
    busy: string;
    busyBg: string;
    surging: string;
    surgingBg: string;
  };
}

export interface ThemeConfig {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
  typography: {
    fontHeading: string;
    fontBody: string;
    fontMono: string;
  };
  radius: {
    none: string;
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    full: string;
  };
  shadows: {
    card: string;
    cardHover: string;
    dropdown: string;
    modal: string;
    glow: string;
  };
}

/**
 * Default Theme: Pangasinan Emerald & Golden Sun
 * Reflects Pangasinan's lush coastal flora, sunny beaches, and cultural heritage.
 */
export const PANGASINAN_EMERALD_THEME: ThemeConfig = {
  id: 'pangasinan-emerald',
  name: 'Pangasinan Emerald & Sun',
  description: 'Authentic warm coastal palette with pine green and sun gold accents',
  colors: {
    brand: {
      primary: '#2D6A4F',
      primaryHover: '#1B4332',
      primaryLight: '#E8F5E9',
      primaryMuted: '#3F6653',
      accent: '#FFB703',
      accentHover: '#F77F00',
      accentLight: '#FFF8E1',
      accentDark: '#B45309',
      brown: '#582F0E',
      brownDark: '#3E1F0A',
      brownLight: '#7B4B27',
    },
    background: {
      canvas: '#FAF9F5',
      surface: '#FFFFFF',
      surfaceSubtle: '#F5F3ED',
      surfaceHover: '#EFECE3',
      overlay: 'rgba(43, 35, 25, 0.45)',
    },
    text: {
      primary: '#2C221E',
      secondary: '#514532',
      muted: '#837560',
      inverse: '#FFFFFF',
    },
    border: {
      default: '#E3DFD5',
      subtle: '#ECE9E2',
      focus: '#2D6A4F',
    },
    status: {
      success: '#2D6A4F',
      successBg: '#D8F3DC',
      warning: '#D97706',
      warningBg: '#FEF3C7',
      danger: '#BC4749',
      dangerBg: '#FDE8E8',
      info: '#2563EB',
      infoBg: '#DBEAFE',
    },
    crowd: {
      quiet: '#2D6A4F',
      quietBg: '#D8F3DC',
      moderate: '#D97706',
      moderateBg: '#FEF3C7',
      busy: '#BC4749',
      busyBg: '#FDE8E8',
      surging: '#991B1B',
      surgingBg: '#FEE2E2',
    },
  },
  typography: {
    fontHeading: "'Epilogue', Georgia, serif",
    fontBody: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontMono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
  radius: {
    none: '0px',
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    full: '9999px',
  },
  shadows: {
    card: '0 1px 3px rgba(43, 35, 25, 0.05), 0 1px 2px rgba(43, 35, 25, 0.03)',
    cardHover: '0 8px 24px rgba(45, 106, 79, 0.10), 0 2px 8px rgba(43, 35, 25, 0.04)',
    dropdown: '0 10px 25px -3px rgba(43, 35, 25, 0.12), 0 4px 6px -2px rgba(43, 35, 25, 0.05)',
    modal: '0 20px 40px -5px rgba(43, 35, 25, 0.20), 0 8px 16px -4px rgba(43, 35, 25, 0.10)',
    glow: '0 0 20px rgba(255, 183, 3, 0.35)',
  },
};

/**
 * Alternative Preset 1: Coastal Azure
 * Vibrant sea blue and coral gold for an oceanic marine theme.
 */
export const COASTAL_AZURE_THEME: ThemeConfig = {
  ...PANGASINAN_EMERALD_THEME,
  id: 'coastal-azure',
  name: 'Lingayen Gulf Azure',
  description: 'Deep gulf blue with golden sunshine accents',
  colors: {
    ...PANGASINAN_EMERALD_THEME.colors,
    brand: {
      ...PANGASINAN_EMERALD_THEME.colors.brand,
      primary: '#0369A1',
      primaryHover: '#0C4A6E',
      primaryLight: '#E0F2FE',
      primaryMuted: '#0284C7',
    },
    border: {
      ...PANGASINAN_EMERALD_THEME.colors.border,
      focus: '#0369A1',
    },
  },
};

/**
 * Alternative Preset 2: Sunset Terracotta
 * Warm sunset hues inspired by Bolinao lighthouse twilights.
 */
export const SUNSET_TERRACOTTA_THEME: ThemeConfig = {
  ...PANGASINAN_EMERALD_THEME,
  id: 'sunset-terracotta',
  name: 'Bolinao Sunset Terracotta',
  description: 'Warm terracotta and sunset glow for twilight touring',
  colors: {
    ...PANGASINAN_EMERALD_THEME.colors,
    brand: {
      ...PANGASINAN_EMERALD_THEME.colors.brand,
      primary: '#C2410C',
      primaryHover: '#9A3412',
      primaryLight: '#FFEDD5',
      primaryMuted: '#EA580C',
    },
    border: {
      ...PANGASINAN_EMERALD_THEME.colors.border,
      focus: '#C2410C',
    },
  },
};

/**
 * Available Theme Presets
 */
export const THEME_PRESETS: Record<string, ThemeConfig> = {
  'pangasinan-emerald': PANGASINAN_EMERALD_THEME,
  'coastal-azure': COASTAL_AZURE_THEME,
  'sunset-terracotta': SUNSET_TERRACOTTA_THEME,
};

/**
 * 👑 ACTIVE THEME CONFIGURATION
 * Changing this single export changes the design tokens across the entire application.
 */
export const theme: ThemeConfig = PANGASINAN_EMERALD_THEME;

/**
 * Generates a CSS variables map string from a ThemeConfig object.
 */
export function generateCssVariableMap(cfg: ThemeConfig = theme): Record<string, string> {
  return {
    '--color-brand-primary': cfg.colors.brand.primary,
    '--color-brand-primary-hover': cfg.colors.brand.primaryHover,
    '--color-brand-primary-light': cfg.colors.brand.primaryLight,
    '--color-brand-primary-muted': cfg.colors.brand.primaryMuted,
    '--color-brand-accent': cfg.colors.brand.accent,
    '--color-brand-accent-hover': cfg.colors.brand.accentHover,
    '--color-brand-accent-light': cfg.colors.brand.accentLight,
    '--color-brand-accent-dark': cfg.colors.brand.accentDark,
    '--color-brand-brown': cfg.colors.brand.brown,
    '--color-brand-brown-dark': cfg.colors.brand.brownDark,
    '--color-brand-brown-light': cfg.colors.brand.brownLight,

    '--color-bg-canvas': cfg.colors.background.canvas,
    '--color-bg-surface': cfg.colors.background.surface,
    '--color-bg-subtle': cfg.colors.background.surfaceSubtle,
    '--color-bg-hover': cfg.colors.background.surfaceHover,

    '--color-text-primary': cfg.colors.text.primary,
    '--color-text-secondary': cfg.colors.text.secondary,
    '--color-text-muted': cfg.colors.text.muted,
    '--color-text-inverse': cfg.colors.text.inverse,

    '--color-border-default': cfg.colors.border.default,
    '--color-border-subtle': cfg.colors.border.subtle,
    '--color-border-focus': cfg.colors.border.focus,

    '--color-status-success': cfg.colors.status.success,
    '--color-status-success-bg': cfg.colors.status.successBg,
    '--color-status-warning': cfg.colors.status.warning,
    '--color-status-warning-bg': cfg.colors.status.warningBg,
    '--color-status-danger': cfg.colors.status.danger,
    '--color-status-danger-bg': cfg.colors.status.dangerBg,
    '--color-status-info': cfg.colors.status.info,
    '--color-status-info-bg': cfg.colors.status.infoBg,

    '--color-crowd-quiet': cfg.colors.crowd.quiet,
    '--color-crowd-quiet-bg': cfg.colors.crowd.quietBg,
    '--color-crowd-moderate': cfg.colors.crowd.moderate,
    '--color-crowd-moderate-bg': cfg.colors.crowd.moderateBg,
    '--color-crowd-busy': cfg.colors.crowd.busy,
    '--color-crowd-busy-bg': cfg.colors.crowd.busyBg,
    '--color-crowd-surging': cfg.colors.crowd.surging,
    '--color-crowd-surging-bg': cfg.colors.crowd.surgingBg,

    '--font-heading': cfg.typography.fontHeading,
    '--font-body': cfg.typography.fontBody,
    '--font-mono': cfg.typography.fontMono,

    '--radius-sm': cfg.radius.sm,
    '--radius-md': cfg.radius.md,
    '--radius-lg': cfg.radius.lg,
    '--radius-xl': cfg.radius.xl,
    '--radius-2xl': cfg.radius['2xl'],
    '--radius-full': cfg.radius.full,

    '--shadow-card': cfg.shadows.card,
    '--shadow-card-hover': cfg.shadows.cardHover,
    '--shadow-dropdown': cfg.shadows.dropdown,
    '--shadow-modal': cfg.shadows.modal,
    '--shadow-glow': cfg.shadows.glow,
  };
}
