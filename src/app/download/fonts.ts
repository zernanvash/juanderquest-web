import localFont from 'next/font/local';

/** The mobile pixel UI fonts (SIL OFL 1.1, licences next to the files). */
export const pixelTitle = localFont({
  src: './fonts/Silkscreen-Regular.ttf',
  variable: '--font-pixel-title',
  display: 'swap',
});

export const pixelBody = localFont({
  src: './fonts/Monocraft.ttf',
  variable: '--font-pixel-body',
  display: 'swap',
});
