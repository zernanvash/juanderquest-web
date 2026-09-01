/**
 * Seamless, SVG-based Map Pin Icons for JuanDerQuest
 * Designed following Heritage Explorer design tokens (Warm Gold #FFB703, Lush Emerald #2D6A4F, Wood Brown #582F0E).
 * Eliminates raw emojis and floating circles in favor of grounded, vector-crisp map pins.
 */

export function createQuestPinHtml(isSelected: boolean = false): string {
  const scale = isSelected ? 'scale-115 -translate-y-1' : 'hover:scale-110 hover:-translate-y-0.5';
  const ring = isSelected ? 'filter drop-shadow(0 0 8px rgba(255,183,3,0.7))' : '';

  return `
    <div class="group relative flex flex-col items-center cursor-pointer transition-all duration-200 ease-out transform ${scale} ${ring}" style="width: 38px; height: 46px;">
      <svg width="38" height="46" viewBox="0 0 38 46" fill="none" xmlns="http://www.w3.org/2000/svg" class="drop-shadow-md">
        <!-- Pin Base with Gradient -->
        <defs>
          <linearGradient id="questGrad${isSelected ? 'Active' : ''}" x1="19" y1="0" x2="19" y2="46" gradientUnits="userSpaceOnUse">
            <stop stop-color="#FFD166" />
            <stop offset="0.6" stop-color="#FFB703" />
            <stop offset="1" stop-color="#F77F00" />
          </linearGradient>
          <filter id="pinShadow" x="0" y="0" width="38" height="46" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.25"/>
          </filter>
        </defs>
        
        <!-- Teardrop Pin Shape -->
        <path d="M19 1C9.05888 1 1 9.05888 1 19C1 29.8 16.5 44.1 17.8 45.3C18.5 45.9 19.5 45.9 20.2 45.3C21.5 44.1 37 29.8 37 19C37 9.05888 28.9411 1 19 1Z" 
              fill="url(#questGrad${isSelected ? 'Active' : ''})" 
              stroke="#FFFFFF" 
              stroke-width="2.5" 
              stroke-linejoin="round"/>
        
        <!-- Inner Badge Disc -->
        <circle cx="19" cy="18" r="12" fill="#FFFFFF" fill-opacity="0.95" />
        
        <!-- Trophy / Quest Icon (Vector) -->
        <path d="M15 13H23V17C23 19.2091 21.2091 21 19 21C16.7909 21 15 19.2091 15 17V13Z" fill="#D48B00"/>
        <path d="M13 14H15V16H13C12.4477 16 12 15.5523 12 15C12 14.4477 12.4477 14 13 14Z" fill="#D48B00"/>
        <path d="M23 14H25C25.5523 14 26 14.4477 26 15C26 15.5523 25.5523 16 25 16H23V14Z" fill="#D48B00"/>
        <path d="M18 21H20V23H18V21Z" fill="#D48B00"/>
        <path d="M16 23H22V24H16V23Z" fill="#D48B00"/>
      </svg>
      <!-- Pulse dot shadow beneath pin tip -->
      <div class="w-3.5 h-1.5 bg-black/25 rounded-full blur-[1px] -mt-1"></div>
    </div>
  `.trim();
}

export function createSpotPinHtml(isSelected: boolean = false): string {
  const scale = isSelected ? 'scale-115 -translate-y-1' : 'hover:scale-110 hover:-translate-y-0.5';
  const ring = isSelected ? 'filter drop-shadow(0 0 8px rgba(45,106,79,0.7))' : '';

  return `
    <div class="group relative flex flex-col items-center cursor-pointer transition-all duration-200 ease-out transform ${scale} ${ring}" style="width: 36px; height: 44px;">
      <svg width="36" height="44" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg" class="drop-shadow-md">
        <!-- Pin Base with Gradient -->
        <defs>
          <linearGradient id="spotGrad${isSelected ? 'Active' : ''}" x1="18" y1="0" x2="18" y2="44" gradientUnits="userSpaceOnUse">
            <stop stop-color="#40916C" />
            <stop offset="0.6" stop-color="#2D6A4F" />
            <stop offset="1" stop-color="#1B4332" />
          </linearGradient>
        </defs>
        
        <!-- Teardrop Pin Shape -->
        <path d="M18 1C8.61116 1 1 8.61116 1 18C1 28.3 15.6 42.1 16.9 43.3C17.5 43.9 18.5 43.9 19.1 43.3C20.4 42.1 35 28.3 35 18C35 8.61116 27.3888 1 18 1Z" 
              fill="url(#spotGrad${isSelected ? 'Active' : ''})" 
              stroke="#FFFFFF" 
              stroke-width="2.5" 
              stroke-linejoin="round"/>
        
        <!-- Inner Badge Disc -->
        <circle cx="18" cy="17" r="11" fill="#FFFFFF" fill-opacity="0.95" />
        
        <!-- Landmark / MapPin Vector Icon -->
        <path d="M18 11C15.2386 11 13 13.2386 13 16C13 19.5 18 23 18 23C18 23 23 19.5 23 16C23 13.2386 20.7614 11 18 11ZM18 17.5C17.1716 17.5 16.5 16.8284 16.5 16C16.5 15.1716 17.1716 14.5 18 14.5C18.8284 14.5 19.5 15.1716 19.5 16C19.5 16.8284 18.8284 17.5 18 17.5Z" 
              fill="#2D6A4F"/>
      </svg>
      <!-- Pulse dot shadow beneath pin tip -->
      <div class="w-3 h-1.5 bg-black/25 rounded-full blur-[1px] -mt-1"></div>
    </div>
  `.trim();
}

export function createUserLocationPinHtml(): string {
  return `
    <div class="relative flex items-center justify-center" style="width: 32px; height: 32px;">
      <!-- Outer radar ping -->
      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-60"></span>
      <!-- Pulsing aura ring -->
      <span class="absolute inline-flex rounded-full h-6 w-6 bg-sky-500/20 border border-sky-400"></span>
      <!-- Center core beacon -->
      <div class="relative w-4 h-4 rounded-full bg-[#0284C7] border-2 border-white shadow-md flex items-center justify-center">
        <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
      </div>
    </div>
  `.trim();
}

export function createDestinationPinHtml(isSelected: boolean = false): string {
  const scale = isSelected ? 'scale-115 -translate-y-1' : 'hover:scale-110 hover:-translate-y-0.5';

  return `
    <div class="group relative flex flex-col items-center cursor-pointer transition-all duration-200 ease-out transform ${scale}" style="width: 38px; height: 46px;">
      <svg width="38" height="46" viewBox="0 0 38 46" fill="none" xmlns="http://www.w3.org/2000/svg" class="drop-shadow-lg">
        <defs>
          <linearGradient id="destGrad" x1="19" y1="0" x2="19" y2="46" gradientUnits="userSpaceOnUse">
            <stop stop-color="#E63946" />
            <stop offset="1" stop-color="#9B2226" />
          </linearGradient>
        </defs>
        
        <path d="M19 1C9.05888 1 1 9.05888 1 19C1 29.8 16.5 44.1 17.8 45.3C18.5 45.9 19.5 45.9 20.2 45.3C21.5 44.1 37 29.8 37 19C37 9.05888 28.9411 1 19 1Z" 
              fill="url(#destGrad)" 
              stroke="#FFFFFF" 
              stroke-width="2.5" 
              stroke-linejoin="round"/>
        
        <circle cx="19" cy="18" r="12" fill="#FFFFFF" />
        
        <!-- Flag / Finish Line Icon -->
        <path d="M15 12V24M15 13H22L20.5 16L22 19H15" stroke="#9B2226" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <div class="w-3.5 h-1.5 bg-black/25 rounded-full blur-[1px] -mt-1"></div>
    </div>
  `.trim();
}

export function createStepPinHtml(stepNumber: number): string {
  return `
    <div class="flex items-center justify-center w-7 h-7 rounded-full bg-[#582F0E] text-[#FFD166] font-extrabold text-xs border-2 border-white shadow-md hover:scale-110 transition duration-150">
      ${stepNumber}
    </div>
  `.trim();
}
