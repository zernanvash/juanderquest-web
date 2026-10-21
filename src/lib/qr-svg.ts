/**
 * Ultra-lightweight standalone QR Code SVG Generator (Model 2, Byte Mode)
 * Zero external dependencies. Generates clean scalable SVG path for QR print sheets.
 */

// Galois Field GF(256) math tables with primitive polynomial 0x11d
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
let x = 1;
for (let i = 0; i < 255; i++) {
  EXP[i] = x;
  EXP[i + 255] = x;
  LOG[x] = i;
  x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
}

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

// Reed-Solomon generator polynomial cache
function getGeneratorPoly(degree: number): Uint8Array {
  let g = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(g.length + 1);
    for (let j = 0; j < g.length; j++) {
      next[j] ^= gfMul(g[j], EXP[i]);
      next[j + 1] ^= g[j];
    }
    g = next;
  }
  return g;
}

function computeErrorCorrection(data: Uint8Array, ecCount: number): Uint8Array {
  const gen = getGeneratorPoly(ecCount);
  const res = new Uint8Array(data.length + ecCount);
  res.set(data);

  for (let i = 0; i < data.length; i++) {
    const factor = res[i];
    if (factor !== 0) {
      for (let j = 0; j < gen.length; j++) {
        res[i + j] ^= gfMul(gen[j], factor);
      }
    }
  }
  return res.slice(data.length);
}

// Version capacities (Medium EC level)
const VERSION_CAPACITIES_M = [
  { version: 1, totalDataBytes: 16, ecBytes: 10, totalBytes: 26, size: 21 },
  { version: 2, totalDataBytes: 28, ecBytes: 16, totalBytes: 44, size: 25 },
  { version: 3, totalDataBytes: 44, ecBytes: 26, totalBytes: 70, size: 29 },
  { version: 4, totalDataBytes: 64, ecBytes: 36, totalBytes: 100, size: 33 },
];

export function generateQrMatrix(text: string): boolean[][] {
  const encodedText = new TextEncoder().encode(text);
  let vInfo = VERSION_CAPACITIES_M.find((v) => v.totalDataBytes >= encodedText.length + 3);
  if (!vInfo) {
    vInfo = VERSION_CAPACITIES_M[VERSION_CAPACITIES_M.length - 1];
  }

  const { version, totalDataBytes, ecBytes, size } = vInfo;

  // Build bitstream: Mode (0100 = 8-bit byte), Char count indicator (8 bits for V1-V9), Data, Terminator (0000)
  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  };

  pushBits(0b0100, 4); // Byte mode
  pushBits(encodedText.length, 8); // 8 bits count for V1-V9
  for (const b of encodedText) {
    pushBits(b, 8);
  }

  // Terminator
  const maxBits = totalDataBytes * 8;
  const termBits = Math.min(4, maxBits - bits.length);
  pushBits(0, termBits);

  // Pad to byte boundary
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  // Pad bytes (0xEC, 0x11)
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < maxBits) {
    pushBits(padBytes[padIdx % 2], 8);
    padIdx++;
  }

  // Convert bits to data buffer
  const dataBytes = new Uint8Array(totalDataBytes);
  for (let i = 0; i < totalDataBytes; i++) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | bits[i * 8 + j];
    }
    dataBytes[i] = b;
  }

  // Compute Reed-Solomon EC
  const ecData = computeErrorCorrection(dataBytes, ecBytes);
  const allCodewords = new Uint8Array(totalDataBytes + ecBytes);
  allCodewords.set(dataBytes);
  allCodewords.set(ecData, totalDataBytes);

  // Initialize matrix and reserved flags
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isReserved: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const setModule = (r: number, c: number, val: boolean, reserved = true) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val;
      if (reserved) isReserved[r][c] = true;
    }
  };

  // 1. Finder patterns (7x7) + Separators
  const placeFinder = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          const isBlack =
            (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
            (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4);
          setModule(nr, nc, isBlack);
        }
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // 2. Alignment pattern for Version 2+ (at row/col size-7)
  if (version >= 2) {
    const alignPos = size - 7;
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const isBlack = r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0);
        setModule(alignPos + r, alignPos + c, isBlack);
      }
    }
  }

  // 3. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    setModule(6, i, i % 2 === 0);
    setModule(i, 6, i % 2 === 0);
  }

  // 4. Dark module
  setModule(size - 8, 8, true);

  // Reserve format info area
  for (let i = 0; i < 9; i++) {
    isReserved[8][i] = true;
    isReserved[i][8] = true;
  }
  for (let i = 0; i < 8; i++) {
    isReserved[8][size - 1 - i] = true;
    isReserved[size - 1 - i][8] = true;
  }

  // 5. Layout data bits with standard upward/downward zigzag
  let bitIdx = 0;
  const totalBits = allCodewords.length * 8;
  const getBit = (idx: number) => {
    if (idx >= totalBits) return false;
    const byte = allCodewords[Math.floor(idx / 8)];
    const shift = 7 - (idx % 8);
    return ((byte >> shift) & 1) === 1;
  };

  let upwards = true;
  for (let c = size - 1; c > 0; c -= 2) {
    if (c === 6) c--; // Skip vertical timing column
    const rows = upwards ? Array.from({ length: size }, (_, i) => size - 1 - i) : Array.from({ length: size }, (_, i) => i);
    for (const r of rows) {
      for (let colOffset = 0; colOffset < 2; colOffset++) {
        const col = c - colOffset;
        if (!isReserved[r][col]) {
          const bitVal = bitIdx < totalBits ? getBit(bitIdx++) : false;
          // Apply Mask 0: (row + col) % 2 == 0
          const mask = (r + col) % 2 === 0;
          matrix[r][col] = bitVal !== mask;
        }
      }
    }
    upwards = !upwards;
  }

  // 6. Format info bits (Medium EC, Mask 0) -> 0x5412 XOR 0x5412 = 0b000000000000000 (pre-computed standard: 0x5412)
  const formatBits = 0x5412 ^ 0x5412; // Formatted with standard masking
  const fmtStr = '101010000010010'; // 15 bits for M level + Mask pattern 000
  for (let i = 0; i < 15; i++) {
    const bit = fmtStr[i] === '1';
    // Top-left
    if (i <= 5) setModule(8, i, bit);
    else if (i === 6) setModule(8, 7, bit);
    else if (i === 7) setModule(8, 8, bit);
    else if (i === 8) setModule(7, 8, bit);
    else setModule(14 - i, 8, bit);

    // Split across top-right and bottom-left
    if (i < 8) setModule(size - 1 - i, 8, bit);
    else setModule(8, size - 15 + i, bit);
  }

  return matrix;
}

export function generateQrSvgPath(text: string, moduleSize = 8, margin = 4): { path: string; viewBox: string } {
  const matrix = generateQrMatrix(text);
  const size = matrix.length;
  const totalDim = (size + margin * 2) * moduleSize;

  let path = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) {
        const x = (c + margin) * moduleSize;
        const y = (r + margin) * moduleSize;
        path += `M${x},${y}h${moduleSize}v${moduleSize}h-${moduleSize}z `;
      }
    }
  }

  return {
    path,
    viewBox: `0 0 ${totalDim} ${totalDim}`,
  };
}
