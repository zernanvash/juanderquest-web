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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getCategoryIconSvg(category?: string, subcategory?: string): string {
  const cat = (category || '').toLowerCase();
  const sub = (subcategory || '').toLowerCase();

  // Beach / Coastal / Island
  if (cat.includes('beach') || sub.includes('beach') || cat.includes('coastal') || cat.includes('island')) {
    return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FAF9F5" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
      <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
      <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
    </svg>`;
  }

  // Culture / Heritage / Church / Pilgrimage
  if (cat.includes('cultur') || cat.includes('herit') || sub.includes('church') || sub.includes('temple') || sub.includes('pilgrim')) {
    return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FAF9F5" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2v20M4 22h16M7 7h10M6 10l6-6 6 6v12H6V10z"/>
    </svg>`;
  }

  // Food / Dining / Market
  if (cat.includes('food') || cat.includes('eat') || cat.includes('drink') || cat.includes('culinary') || sub.includes('market') || sub.includes('street_food')) {
    return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FAF9F5" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2M15 11v11M6 2v20M6 2c2 0 4 2 4 5s-2 5-4 5"/>
    </svg>`;
  }

  // Nature / Park / Waterfall / Default Spot (Evergreen Pine Tree)
  return `<svg width="15" height="15" viewBox="0 0 24 24" fill="#FAF9F5" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L8 8h2l-3 4h2.5L6 17h4.5v3h3v-3H18l-3.5-5h2.5l-3-4h2L12 2z"/>
  </svg>`;
}

function getCategoryBadgeBg(category?: string, subcategory?: string): string {
  const cat = (category || '').toLowerCase();
  const sub = (subcategory || '').toLowerCase();
  if (cat.includes('beach') || sub.includes('beach') || cat.includes('coastal') || cat.includes('island')) {
    return '#0E5E6F';
  }
  if (cat.includes('cultur') || cat.includes('herit') || sub.includes('church') || sub.includes('pilgrim')) {
    return '#6A2E35';
  }
  if (cat.includes('food') || cat.includes('eat') || cat.includes('drink') || sub.includes('market')) {
    return '#935610';
  }
  return '#1B4332'; // Deep Forest Pine
}

export function createQuestPinHtml(
  isSelected: boolean = false,
  isSaved: boolean = false,
  title?: string,
  category?: string
): string {
  // If title is omitted (e.g. mini map preview), render classic standalone pin
  if (!title) {
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
          <path d="M18 10L19.8 18L18 19.5L16.2 18L18 10Z" fill="#FFB703"/>
          <path d="M18 26L16.2 18L18 16.5L19.8 18L18 26Z" fill="#E09F00"/>
          <path d="M26 18L18 19.8L16.5 18L18 16.2L26 18Z" fill="#FFC933"/>
          <path d="M10 18L18 16.2L19.5 18L18 19.8L10 18Z" fill="#D48B00"/>
          <circle cx="18" cy="18" r="2.2" fill="#FAF9F5" />
        </svg>
        <div class="w-3 h-1.5 bg-black/30 rounded-full blur-[0.5px] -mt-1"></div>
      </div>
    `.trim();
  }

  // Google Maps Style Interactive POI Marker for Quests
  const safeTitle = escapeHtml(title);
  const selectedRing = isSelected
    ? 'box-shadow: 0 0 0 3px #FFB703, 0 4px 10px rgba(0,0,0,0.35);'
    : 'box-shadow: 0 2px 6px rgba(0,0,0,0.28);';

  return `
    <div class="leaflet-poi-marker group cursor-pointer inline-flex items-center select-none ${isSelected ? 'is-selected z-50' : 'z-10'}" style="pointer-events: auto;">
      <!-- Circular Expedition Compass Badge -->
      <div class="relative shrink-0 flex items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-110 ${isSelected ? 'scale-115' : ''}" style="width: 28px; height: 28px; background: #935610; border: 2px solid #FAF9F5; ${selectedRing}">
        ${savedBadgeHtml(isSaved)}
        <svg width="18" height="18" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="18" cy="18" r="16" fill="#1B4332"/>
          <path d="M18 6L20.5 18L18 20L15.5 18L18 6Z" fill="#FFB703"/>
          <path d="M18 30L15.5 18L18 16L20.5 18L18 30Z" fill="#E09F00"/>
          <path d="M30 18L18 20.5L16 18L18 15.5L30 18Z" fill="#FFC933"/>
          <path d="M6 18L18 15.5L20 18L18 20.5L6 18Z" fill="#D48B00"/>
          <circle cx="18" cy="18" r="3" fill="#FAF9F5"/>
        </svg>
      </div>

      <!-- Visible Place Name Label (Google Maps style) -->
      <div class="poi-label-wrap ml-1.5 flex items-center pointer-events-auto">
        <span class="poi-label-text poi-label-text-quest transition-all duration-150 ${isSelected ? 'poi-label-selected' : ''}">
          ${safeTitle}
        </span>
      </div>
    </div>
  `.trim();
}

export function createSpotPinHtml(
  isSelected: boolean = false,
  isSaved: boolean = false,
  title?: string,
  imageUrl?: string,
  category?: string,
  subcategory?: string
): string {
  // If title is omitted (e.g. mini map preview), render classic standalone pin
  if (!title) {
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
        <div class="w-3 h-1.5 bg-black/30 rounded-full blur-[0.5px] -mt-1"></div>
      </div>
    `.trim();
  }

  // Google Maps Style Interactive POI Marker with Visible Place Name
  const safeTitle = escapeHtml(title);
  const badgeBg = getCategoryBadgeBg(category, subcategory);
  const iconSvg = getCategoryIconSvg(category, subcategory);
  const selectedRing = isSelected
    ? 'box-shadow: 0 0 0 3px #FFB703, 0 4px 10px rgba(0,0,0,0.35);'
    : 'box-shadow: 0 2px 6px rgba(0,0,0,0.28);';

  const innerContent = imageUrl
    ? `<img src="${escapeHtml(imageUrl)}" alt="${safeTitle}" class="w-full h-full rounded-full object-cover" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" />
       <div class="w-full h-full items-center justify-center" style="display:none;">${iconSvg}</div>`
    : `<div class="w-full h-full flex items-center justify-center">${iconSvg}</div>`;

  return `
    <div class="leaflet-poi-marker group cursor-pointer inline-flex items-center select-none ${isSelected ? 'is-selected z-50' : 'z-10'}" style="pointer-events: auto;">
      <!-- Circular POI Badge (Photo thumbnail or category icon) -->
      <div class="relative shrink-0 flex items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-110 ${isSelected ? 'scale-115' : ''}" style="width: 28px; height: 28px; background: ${badgeBg}; border: 2px solid #FAF9F5; ${selectedRing} overflow: hidden;">
        ${savedBadgeHtml(isSaved)}
        ${innerContent}
      </div>

      <!-- Visible Place Name Label (Google Maps style) -->
      <div class="poi-label-wrap ml-1.5 flex items-center pointer-events-auto">
        <span class="poi-label-text transition-all duration-150 ${isSelected ? 'poi-label-selected' : ''}">
          ${safeTitle}
        </span>
      </div>
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

export function createRegionalBeaconHtml(count: number, regionName: string = 'Pangasinan'): string {
  return `
    <div class="group relative flex flex-col items-center cursor-pointer select-none transition-transform duration-200 ease-out hover:scale-105 active:scale-95" style="width: 190px; height: 76px;">
      <!-- Glowing radar pulse wave -->
      <span class="animate-ping absolute top-3 inline-flex h-10 w-10 rounded-full bg-[#2D6A4F] opacity-35"></span>

      <!-- Interactive Regional Pill Badge -->
      <div class="relative z-10 flex items-center gap-2.5 bg-[#1B4332] text-white px-3.5 py-2 rounded-2xl border-2 border-[#FFB703] shadow-xl hover:bg-[#2D6A4F] transition-colors">
        <div class="w-7 h-7 rounded-xl bg-[#FFB703] text-[#582F0E] flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
          📍
        </div>
        <div class="flex flex-col text-left leading-tight pr-1">
          <span class="text-xs font-black tracking-wide text-white flex items-center gap-1">
            <span>${regionName}</span>
            <span class="text-[9px] bg-[#FFB703] text-[#582F0E] px-1.5 py-0.2 rounded-full font-black">
              ${count}
            </span>
          </span>
          <span class="text-[10px] text-amber-200 font-semibold flex items-center gap-0.5 mt-0.5">
            <span>Click to zoom in</span>
            <span>→</span>
          </span>
        </div>
      </div>

      <!-- Stem needle pointing down to province center -->
      <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-[#FFB703] -mt-0.5"></div>
      <!-- Ground contact soft shadow -->
      <div class="w-12 h-2.5 bg-black/35 rounded-full blur-[1px] mt-0.5"></div>
    </div>
  `.trim();
}

