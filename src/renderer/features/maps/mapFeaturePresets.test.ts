import { describe, expect, it } from 'vitest';
import {
  getCompatibleFeatureRoles,
  getDefaultFeatureStyle,
  getFeatureKindForRole,
  getThemeVisuals,
} from './mapFeaturePresets';

describe('mapFeaturePresets', () => {
  it('maps fantasy roles to the expected geometry kinds', () => {
    expect(getFeatureKindForRole('settlement')).toBe('marker');
    expect(getFeatureKindForRole('river')).toBe('path');
    expect(getFeatureKindForRole('road')).toBe('path');
    expect(getFeatureKindForRole('mountainRange')).toBe('path');
    expect(getFeatureKindForRole('forest')).toBe('polygon');
    expect(getFeatureKindForRole('regionBorder')).toBe('border');
    expect(getFeatureKindForRole('custom', 'polygon')).toBe('polygon');
  });

  it('returns geometry-compatible role options for each feature kind', () => {
    expect(getCompatibleFeatureRoles('marker')).toEqual(['custom', 'settlement']);
    expect(getCompatibleFeatureRoles('path')).toEqual([
      'custom',
      'river',
      'road',
      'mountainRange',
    ]);
    expect(getCompatibleFeatureRoles('polygon')).toEqual(['custom', 'forest']);
    expect(getCompatibleFeatureRoles('border')).toEqual(['custom', 'regionBorder']);
  });

  it('provides preset styles and theme visuals for atlas themes', () => {
    expect(getDefaultFeatureStyle('river', 'terrain')).toMatchObject({
      stroke: '#3d7ea0',
      strokeWidth: 100,
    });
    expect(getDefaultFeatureStyle('settlement', 'parchment')).toMatchObject({
      markerSize: 300,
      fill: '#f5efe0',
    });
    expect(getThemeVisuals('political')).toMatchObject({
      canvasFill: '#e6dfd3',
      gridStroke: 'rgba(91, 66, 58, 0.12)',
    });
  });
});
