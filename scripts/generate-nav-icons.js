const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const icons = {
  // 1. Overview: Pixel Art AC-Style Green Leaf
  'nav-overview.png': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36" shape-rendering="crispEdges">
    <!-- Leaf Outline -->
    <path d="M16 6h5v2h3v2h2v3h2v4h-1v3h-1v3h-2v3h-2v2h-3v2h-2v2h-2v-2h2v-2h2v-2h-2v-1h-3v-1h-3v-2h-2v-2h-2v-4h1v-3h2v-2h3v-2h4v-2h3V6z" fill="#14301C" />
    <!-- Leaf Base Emerald Green -->
    <path d="M16 8h4v2h2v2h2v3h1v3h-1v3h-2v2h-2v2h-2v1h-3v-1h2v-2h2v-2h-1v-2h-2v-1h-2v-2h-1v-3h1v-2h2v-2h3V8z" fill="#2E8B4E" />
    <!-- Leaf Bright Highlight -->
    <path d="M16 9h3v2h2v2h1v3h-1v-2h-2v-2h-3V9z" fill="#6EE88D" />
    <path d="M17 10h2v1h2v2h-1v-1h-2v-1h-1v-1z" fill="#B9FCD0" />
    <!-- Shading & Center Vein -->
    <path d="M13 15h3v2h2v2h2v2h-2v-1h-2v-2h-3v-3z" fill="#1E5C34" />
    <path d="M12 17h2v2h2v2h-2v-2h-2v-2z" fill="#246F3F" />
    <!-- Classic AC Leaf Cutout (hole in leaf) -->
    <rect x="20" y="16" width="3" height="3" fill="#14301C" />
    <!-- Stem -->
    <rect x="11" y="27" width="2" height="2" fill="#14301C" />
    <rect x="12" y="25" width="2" height="2" fill="#246F3F" />
  </svg>`,

  // 2. Interactive Map: Pixel Map Scroll with Compass/Islands
  'nav-map.png': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36" shape-rendering="crispEdges">
    <!-- Map Parchment Outline -->
    <path d="M5 6h24v2h2v20h-2v2H5v-2H3V8h2V6z" fill="#40240E" />
    <!-- Map Parchment Background -->
    <rect x="5" y="8" width="24" height="20" fill="#F4E4BA" />
    <rect x="5" y="8" width="24" height="3" fill="#FFF3D6" />
    <!-- Parchment Texture / Folds -->
    <rect x="12" y="8" width="2" height="20" fill="#E5D09D" />
    <rect x="20" y="8" width="2" height="20" fill="#E5D09D" />
    <!-- Green Island Landmasses -->
    <path d="M8 12h5v2h2v3h-4v-1H9v-2H8v-2z" fill="#3E8E41" />
    <rect x="9" y="13" width="3" height="2" fill="#62B565" />
    <path d="M18 19h6v2h1v3h-4v-1h-2v-2h-1v-2z" fill="#3E8E41" />
    <rect x="20" y="20" width="3" height="2" fill="#62B565" />
    <!-- Red "X" Marks the Spot -->
    <path d="M23 11h2v2h-2zm2 2h2v2h-2zm0-4h2v2h-2zm-4 0h2v2h-2zm0 4h2v2h-2z" fill="#C1292E" />
    <rect x="24" y="12" width="2" height="2" fill="#E84855" />
    <!-- Compass Rose Micro Star -->
    <path d="M10 22h3v1h-1v2h-1v-2h-1v-1z" fill="#9C5B23" />
    <!-- Map Edge Curl Shadow -->
    <rect x="5" y="27" width="24" height="1" fill="#D2BC87" />
  </svg>`,

  // 3. Quest: Pixel Quest Scroll with Red Ribbon & Star
  'nav-quest.png': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36" shape-rendering="crispEdges">
    <!-- Scroll Outline -->
    <path d="M7 6h20v2h2v3h-2v1h2v14h-2v2h-1v2H6v-2H4v-3h2v-1H4V8h2V6h1z" fill="#38200B" />
    <!-- Rolled Parchment Ends -->
    <rect x="6" y="8" width="20" height="18" fill="#F7E9C8" />
    <rect x="5" y="7" width="22" height="2" fill="#FFF6DF" />
    <rect x="5" y="25" width="22" height="2" fill="#DFCA9D" />
    <rect x="4" y="8" width="2" height="4" fill="#D2BC8B" />
    <rect x="26" y="22" width="2" height="4" fill="#D2BC8B" />
    <!-- Red Ribbon Wrap -->
    <rect x="15" y="7" width="4" height="20" fill="#C82A35" />
    <rect x="16" y="7" width="2" height="20" fill="#E84550" />
    <!-- Golden Star Wax Seal -->
    <path d="M14 14h6v6h-6v-6z" fill="#5A3B05" />
    <rect x="15" y="15" width="4" height="4" fill="#FFC72C" />
    <rect x="16" y="16" width="2" height="2" fill="#FFF1A8" />
    <rect x="17" y="13" width="1" height="2" fill="#FFC72C" />
    <rect x="17" y="19" width="1" height="2" fill="#FFC72C" />
    <rect x="13" y="16" width="2" height="1" fill="#FFC72C" />
    <rect x="19" y="16" width="2" height="1" fill="#FFC72C" />
  </svg>`,

  // 4. Shop: Pixel Animal Crossing Bell Bag with Star
  'nav-shop.png': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36" shape-rendering="crispEdges">
    <!-- Bell Bag Outline -->
    <path d="M14 5h8v2h-2v2h3v2h3v3h2v11h-2v3h-3v2H11v-2H8v-3H6V14h2v-3h3V9h3V7h-2V5h2z" fill="#331B08" />
    <!-- Bell Bag Body -->
    <path d="M11 12h14v2h2v10h-2v3h-3v1H14v-1h-3v-3H9V14h2v-2z" fill="#C89B3C" />
    <path d="M12 13h12v2h2v8h-2v2h-2v1H14v-1h-2v-2h-2v-8h2v-2z" fill="#E0B85C" />
    <rect x="12" y="14" width="10" height="3" fill="#F3D58C" />
    <!-- Tied Knot Top -->
    <rect x="14" y="7" width="8" height="3" fill="#B0842D" />
    <rect x="15" y="7" width="6" height="2" fill="#D9AC4D" />
    <!-- Red Drawstring Ribbon -->
    <rect x="12" y="10" width="12" height="2" fill="#BC242D" />
    <rect x="13" y="10" width="10" height="1" fill="#E0434C" />
    <rect x="11" y="12" width="2" height="3" fill="#BC242D" />
    <rect x="12" y="13" width="2" height="3" fill="#BC242D" />
    <!-- Brown Star Symbol in Center (AC Bell Pouch Star) -->
    <path d="M17 17h2v2h-2zm2 2h2v2h-2zm-4 0h2v2h-2zm2 2h2v2h-2zm0-4h2v-2h-2z" fill="#693B14" />
    <rect x="17" y="19" width="2" height="2" fill="#8B521E" />
  </svg>`,

  // 5. About: Pixel Explorer's Field Journal
  'nav-about.png': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36" shape-rendering="crispEdges">
    <!-- Journal Outline -->
    <path d="M8 5h19v2h2v22h-2v2H8v-2H6V7h2V5z" fill="#22170D" />
    <!-- Leather Cover Base -->
    <rect x="8" y="7" width="19" height="22" fill="#2B613D" />
    <rect x="10" y="7" width="17" height="20" fill="#387D4E" />
    <!-- Gold Corner Bumpers -->
    <path d="M8 7h4v2h-2v2H8V7zm17 0h4v4h-2V9h-2V7z" fill="#E5B239" />
    <!-- Spine -->
    <rect x="8" y="7" width="3" height="22" fill="#1E4A2E" />
    <rect x="7" y="10" width="2" height="2" fill="#E5B239" />
    <rect x="7" y="22" width="2" height="2" fill="#E5B239" />
    <!-- White / Cream Pages Strip on Right Edge -->
    <rect x="26" y="8" width="2" height="20" fill="#FFF7E6" />
    <rect x="27" y="9" width="1" height="18" fill="#DEC9A3" />
    <!-- Golden Compass Emblem on Cover -->
    <path d="M17 14h3v3h-3v-3z" fill="#F3D06D" />
    <rect x="18" y="12" width="1" height="7" fill="#E5B239" />
    <rect x="15" y="15" width="7" height="1" fill="#E5B239" />
    <!-- Red Ribbon Bookmark protruding from bottom -->
    <rect x="16" y="27" width="2" height="4" fill="#C1292E" />
    <rect x="17" y="28" width="1" height="3" fill="#E84855" />
  </svg>`,

  // 6. Settings: Pixel Brass Gear / Cog
  'nav-settings.png': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36" shape-rendering="crispEdges">
    <!-- Gear Outline -->
    <path d="M15 4h6v4h2v-2h4v4h-2v2h4v6h-4v2h2v4h-4v-2h-2v4h-6v-4h-2v2H9v-4h2v-2H7v-6h4v-2H9V8h4v2h2V4z" fill="#2A2113" />
    <!-- Gear Metallic Body -->
    <path d="M16 6h4v3h3v-1h2v2h-1v3h3v4h-3v3h1v2h-2v-1h-3v3h-4v-3h-3v1h-2v-2h1v-3H9v-4h3V9h-1V7h2v1h3V6z" fill="#9C762B" />
    <path d="M16 7h4v3h3v1h2v1h-1v3h3v2h-3v3h1v1h-2v-1h-3v3h-4v-3h-3v1h-2v-1h1v-3H9v-2h3v-3h-1V9h2v-1h3V7z" fill="#CFA342" />
    <!-- Highlights -->
    <rect x="16" y="7" width="4" height="2" fill="#FCE082" />
    <rect x="23" y="10" width="2" height="2" fill="#FCE082" />
    <rect x="10" y="14" width="2" height="4" fill="#FCE082" />
    <!-- Center Hole -->
    <rect x="15" y="15" width="6" height="6" fill="#2A2113" />
    <rect x="16" y="16" width="4" height="4" fill="#1B3822" />
  </svg>`
};

async function run() {
  const targetDir = path.resolve(__dirname, '../public/icons');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  for (const [filename, svg] of Object.entries(icons)) {
    const dest = path.join(targetDir, filename);
    await sharp(Buffer.from(svg))
      .resize(36, 36)
      .png()
      .toFile(dest);
    console.log('Successfully created:', dest);
  }

  // Ensure nav-explore.png exists
  const searchSrc = path.join(targetDir, 'search.png');
  const navExploreDest = path.join(targetDir, 'nav-explore.png');
  if (fs.existsSync(searchSrc)) {
    fs.copyFileSync(searchSrc, navExploreDest);
    console.log('Copied nav-explore.png from search.png');
  }
}

run().catch((err) => {
  console.error('Error creating icons:', err);
  process.exit(1);
});
