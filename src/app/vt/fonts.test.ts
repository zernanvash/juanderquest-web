import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Map Fonts & Glyphs Integrity', () => {
  const fontsDir = path.resolve(__dirname, '../../../public/map/fonts');

  it('contains font directories with valid binary protobuf PBF files', () => {
    expect(fs.existsSync(fontsDir)).toBe(true);

    const getFiles = (dir: string): string[] => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const files: string[] = [];
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...getFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.pbf')) {
          files.push(fullPath);
        }
      }
      return files;
    };

    const pbfFiles = getFiles(fontsDir);
    expect(pbfFiles.length).toBeGreaterThanOrEqual(2);

    for (const file of pbfFiles) {
      const buffer = fs.readFileSync(file);
      expect(buffer.length).toBeGreaterThan(1000);

      // Verify file does not start with ASCII HTML tags like '<!DOCTYPE' or '<html'
      const firstChar = String.fromCharCode(buffer[0]);
      expect(firstChar).not.toBe('<');

      // First few bytes check
      const headerStr = buffer.subarray(0, 10).toString('utf8');
      expect(headerStr).not.toContain('<!DOCTYPE');
      expect(headerStr).not.toContain('<html');
    }
  });
});
