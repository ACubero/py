import { describe, it, expect } from 'vitest';
import { manifest } from '../src/pwa/manifest.js';

describe('web app manifest', () => {
  it('is installable as a standalone Spanish app', () => {
    expect(manifest.name).toBe('Wegoby');
    expect(manifest.short_name).toBe('Wegoby');
    expect(manifest.lang).toBe('es');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('declares 192 and 512 icons plus a maskable icon', () => {
    const sizes = manifest.icons.map((icon) => icon.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
  });
});
