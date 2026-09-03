/**
 * Forest-Themed, Flat-Matte Vector Map Markers for JuanDerQuest
 * Grounded in the Pangasinan nature & expedition aesthetic:
 * - Deep Pine Green (#1B4332)
 * - Forest Green (#2D6A4F)
 * - Warm Timber Bark (#935610 / #582F0E)
 * - Warm Sun Gold (#FFB703)
 * - Natural Stone / Cream (#FAF9F5)
 *
 * 100% free of glossy gradients, shiny glassmorphism, or raw Unicode emojis.
 */

function savedBadgeHtml(isSaved: boolean): string {
  if (!isSaved) return '';
  return `<span aria-hidden="true" style="position:absolute;right:-7px;top:-7px;z-index:2;display:flex;width:18px;height:18px;align-items:center;justify-content:center;border-radius:9999px;border:2px solid #FAF9F5;background:#FFB703;color:#582F0E;box-shadow:0 2px 5px rgba(0,0,0,.25)">
    <svg width="9" height="11" viewBox="0 0 12 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M2 1.5h8a.5.5 0 0 1 .5.5v10.65a.5.5 0 0 1-.78.414L6 10.56l-3.72 2.504a.5.5 0 0 1-.78-.414V2a.5.5 0 0 1 .5-.5Z"/></svg>
  </span>`;
}

export function createQuestPinHtml(isSelected: boolean = false, isSaved: boolean = false): string {
  const scale = isSelected ? 'scale-115 -translate-y-1' : 'hover:scale-110 hover:-translate-y-0.5';
  const strokeColor = isSelected ? '#FFB703' : '#FAF9F5';
  const shadow = isSelected
    ? 'drop-shadow(0 6px 12px rgba(0,0,0,0.38))'
    : 'drop-shadow(0 3px 6px rgba(0,0,0,0.24))';

  return `
    <div class="group relative flex flex-col items-center cursor-pointer transition-transform duration-200 ease-out transform ${scale}" style="width: 36px; height: 46px;">
      ${savedBadgeHtml(isSaved)}
      <svg width="36" height="46" viewBox="0 0 36 46" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: ${shadow};">
        <!-- Matte Trail Pin Body (Warm Timber Bark) -->
        <path d="M18 1C8.611 1 1 8.611 1 18C1 28.5 15.6 42.5 16.9 43.8C17.5 44.4 18.5 44.4 19.1 43.8C20.4 42.5 35 28.5 35 18C35 8.611 27.389 1 18 1Z" 
              fill="#935610" 
              stroke="${strokeColor}" 
              stroke-width="2.5" 
              stroke-linejoin="round"/>
        
        <!-- Matte Inner Disc (Deep Forest Pine) -->
        <circle cx="18" cy="18" r="11" fill="#1B4332" />
        
        <!-- 4-Point Expedition Compass Rose (Gold & Cream) -->
        <!-- North needle -->
        <path d="M18 10L19.8 18L18 19.5L16.2 18L18 10Z" fill="#FFB703"/>
        <!-- South needle -->
        <path d="M18 26L16.2 18L18 16.5L19.8 18L18 26Z" fill="#E09F00"/>
        <!-- East needle -->
        <path d="M26 18L18 19.8L16.5 18L18 16.2L26 18Z" fill="#FFC933"/>
        <!-- West needle -->
        <path d="M10 18L18 16.2L19.5 18L18 19.8L10 18Z" fill="#D48B00"/>
        <!-- Center compass pivot point -->
        <circle cx="18" cy="18" r="2.2" fill="#FAF9F5" />
      </svg>
      <!-- Ground contact shadow -->
      <div class="w-3 h-1.5 bg-black/30 rounded-full blur-[0.5px] -mt-1"></div>
    </div>
  `.trim();
}

export function createSpotPinHtml(isSelected: boolean = false, isSaved: boolean = false): string {
  const scale = isSelected ? 'scale-115 -translate-y-1' : 'hover:scale-110 hover:-translate-y-0.5';
  const strokeColor = isSelected ? '#52B788' : '#FAF9F5';
  const shadow = isSelected
    ? 'drop-shadow(0 6px 12px rgba(0,0,0,0.38))'
    : 'drop-shadow(0 3px 6px rgba(0,0,0,0.24))';

  return `
    <div class="group relative flex flex-col items-center cursor-pointer transition-transform duration-200 ease-out transform ${scale}" style="width: 36px; height: 46px;">
      ${savedBadgeHtml(isSaved)}
      <svg width="36" height="46" viewBox="0 0 36 46" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: ${shadow};">
        <!-- Matte Pine Green Pin Body -->
        <path d="M18 1C8.611 1 1 8.611 1 18C1 28.5 15.6 42.5 16.9 43.8C17.5 44.4 18.5 44.4 19.1 43.8C20.4 42.5 35 28.5 35 18C35 8.611 27.389 1 18 1Z" 
              fill="#1B4332" 
              stroke="${strokeColor}" 
              stroke-width="2.5" 
              stroke-linejoin="round"/>
        
        <!-- Matte Inner Cream Disc -->
        <circle cx="18" cy="18" r="11" fill="#FAF9F5" />
        
        <!-- Evergreen Pine Tree Silhouette (Deep Forest Pine) -->
        <path d="M18 10L14 15.5H15.8L12.8 19.5H15L11.5 24.5H16.8V26.5H19.2V24.5H24.5L21 19.5H23.2L20.2 15.5H22L18 10Z" 
              fill="#1B4332" 
              fill-rule="evenodd"/>
      </svg>
      <!-- Ground contact shadow -->
      <div class="w-3 h-1.5 bg-black/30 rounded-full blur-[0.5px] -mt-1"></div>
    </div>
  `.trim();
}

export function createUserLocationPinHtml(): string {
  return `
    <div class="relative flex items-center justify-center" style="width: 34px; height: 34px;">
      <!-- Forest scout radar pulse -->
      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2D6A4F] opacity-40"></span>
      <!-- Concentric moss ring -->
      <span class="absolute inline-flex rounded-full h-7 w-7 bg-[#2D6A4F]/20 border border-[#2D6A4F]/50"></span>
      <!-- Center scout beacon -->
      <div class="relative w-4 h-4 rounded-full bg-[#1B4332] border-2 border-[#FAF9F5] shadow-md flex items-center justify-center">
        <div class="w-1.5 h-1.5 rounded-full bg-[#FFB703]"></div>
      </div>
    </div>
  `.trim();
}

export function createDestinationPinHtml(isSelected: boolean = false): string {
  const scale = isSelected ? 'scale-115 -translate-y-1' : 'hover:scale-110 hover:-translate-y-0.5';
  const shadow = isSelected
    ? 'drop-shadow(0 6px 12px rgba(0,0,0,0.38))'
    : 'drop-shadow(0 3px 6px rgba(0,0,0,0.24))';

  return `
    <div class="group relative flex flex-col items-center cursor-pointer transition-transform duration-200 ease-out transform ${scale}" style="width: 36px; height: 46px;">
      <svg width="36" height="46" viewBox="0 0 36 46" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: ${shadow};">
        <!-- Matte Terra Cotta Destination Pin Body -->
        <path d="M18 1C8.611 1 1 8.611 1 18C1 28.5 15.6 42.5 16.9 43.8C17.5 44.4 18.5 44.4 19.1 43.8C20.4 42.5 35 28.5 35 18C35 8.611 27.389 1 18 1Z" 
              fill="#8B3A2B" 
              stroke="#FAF9F5" 
              stroke-width="2.5" 
              stroke-linejoin="round"/>
        
        <!-- Matte Inner Cream Disc -->
        <circle cx="18" cy="18" r="11" fill="#FAF9F5" />
        
        <!-- Summit Flag / Finish Marker -->
        <path d="M14 12V25M14 13H22L20.5 16L22 19H14" stroke="#8B3A2B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <div class="w-3 h-1.5 bg-black/30 rounded-full blur-[0.5px] -mt-1"></div>
    </div>
  `.trim();
}

export function createStepPinHtml(stepNumber: number): string {
  return `
    <div class="flex items-center justify-center w-7 h-7 rounded-full bg-[#582F0E] text-[#FAF9F5] font-black text-xs border-2 border-[#FAF9F5] shadow-md hover:scale-110 transition duration-150">
      ${stepNumber}
    </div>
  `.trim();
}
