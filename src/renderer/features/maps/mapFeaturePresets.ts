import type { FeatureRole, MapFeature, MapStyle, ThemePreset } from '@shared/map';

export type FeatureKind = MapFeature['featureKind'];
export type MapTool = 'select' | 'pan' | 'anchor' | FeatureRole;

export const FEATURE_ROLE_ORDER: FeatureRole[] = [
  'custom',
  'settlement',
  'river',
  'road',
  'mountainRange',
  'forest',
  'regionBorder',
];

export const toolLabels: Record<MapTool, string> = {
  select: 'Select',
  pan: 'Pan',
  custom: 'Custom',
  settlement: 'Settlement',
  river: 'River',
  road: 'Road',
  mountainRange: 'Mountain Range',
  forest: 'Forest',
  regionBorder: 'Region Border',
  anchor: 'Place Link',
};

export const themePresetLabels: Record<ThemePreset, string> = {
  parchment: 'Parchment',
  terrain: 'Terrain',
  political: 'Political',
};

export type ThemeVisuals = {
  canvasFill: string;
  canvasOverlay: string;
  frameStroke: string;
  gridStroke: string;
  gridFill: string;
};

const themeVisuals: Record<ThemePreset, ThemeVisuals> = {
  parchment: {
    canvasFill: '#e8d7b2',
    canvasOverlay: 'rgba(120, 86, 43, 0.08)',
    frameStroke: 'rgba(92, 68, 43, 0.32)',
    gridStroke: 'rgba(92, 68, 43, 0.12)',
    gridFill: 'rgba(255, 248, 230, 0.38)',
  },
  terrain: {
    canvasFill: '#d8e3c8',
    canvasOverlay: 'rgba(60, 91, 65, 0.08)',
    frameStroke: 'rgba(44, 66, 49, 0.28)',
    gridStroke: 'rgba(34, 76, 48, 0.14)',
    gridFill: 'rgba(244, 250, 239, 0.28)',
  },
  political: {
    canvasFill: '#e6dfd3',
    canvasOverlay: 'rgba(80, 53, 43, 0.06)',
    frameStroke: 'rgba(74, 51, 43, 0.3)',
    gridStroke: 'rgba(91, 66, 58, 0.12)',
    gridFill: 'rgba(250, 246, 240, 0.24)',
  },
};

const rolePresets: Record<ThemePreset, Record<FeatureRole, MapStyle>> = {
  parchment: {
    custom: {
      stroke: '#8e6b43',
      fill: '#c99b4e22',
      strokeWidth: 120,
      opacity: 0.92,
      markerSize: 260,
    },
    settlement: {
      stroke: '#5a4030',
      fill: '#f5efe0',
      strokeWidth: 90,
      opacity: 0.98,
      markerSize: 300,
    },
    river: {
      stroke: '#557b91',
      fill: '#557b911a',
      strokeWidth: 90,
      opacity: 0.94,
      markerSize: 260,
    },
    road: {
      stroke: '#8b6742',
      fill: '#8b674218',
      strokeWidth: 60,
      opacity: 0.92,
      markerSize: 260,
    },
    mountainRange: {
      stroke: '#6c5844',
      fill: '#6c584414',
      strokeWidth: 48,
      opacity: 0.98,
      markerSize: 260,
    },
    forest: {
      stroke: '#55704c',
      fill: '#55704c26',
      strokeWidth: 70,
      opacity: 0.9,
      markerSize: 260,
    },
    regionBorder: {
      stroke: '#734d39',
      fill: '#734d3908',
      strokeWidth: 70,
      opacity: 0.95,
      markerSize: 260,
    },
  },
  terrain: {
    custom: {
      stroke: '#55734d',
      fill: '#7fb17722',
      strokeWidth: 120,
      opacity: 0.92,
      markerSize: 260,
    },
    settlement: {
      stroke: '#4b3b2e',
      fill: '#efe7cc',
      strokeWidth: 90,
      opacity: 0.98,
      markerSize: 300,
    },
    river: {
      stroke: '#3d7ea0',
      fill: '#3d7ea01a',
      strokeWidth: 100,
      opacity: 0.96,
      markerSize: 260,
    },
    road: {
      stroke: '#8c6a47',
      fill: '#8c6a4718',
      strokeWidth: 65,
      opacity: 0.9,
      markerSize: 260,
    },
    mountainRange: {
      stroke: '#6d645a',
      fill: '#6d645a10',
      strokeWidth: 52,
      opacity: 0.98,
      markerSize: 260,
    },
    forest: {
      stroke: '#48704c',
      fill: '#48704c2e',
      strokeWidth: 75,
      opacity: 0.9,
      markerSize: 260,
    },
    regionBorder: {
      stroke: '#7b4f3d',
      fill: '#7b4f3d08',
      strokeWidth: 70,
      opacity: 0.95,
      markerSize: 260,
    },
  },
  political: {
    custom: {
      stroke: '#9e7055',
      fill: '#d7a46b20',
      strokeWidth: 120,
      opacity: 0.92,
      markerSize: 260,
    },
    settlement: {
      stroke: '#51372d',
      fill: '#f6edda',
      strokeWidth: 90,
      opacity: 0.98,
      markerSize: 300,
    },
    river: {
      stroke: '#477f9f',
      fill: '#477f9f1a',
      strokeWidth: 90,
      opacity: 0.94,
      markerSize: 260,
    },
    road: {
      stroke: '#a2744e',
      fill: '#a2744e14',
      strokeWidth: 60,
      opacity: 0.9,
      markerSize: 260,
    },
    mountainRange: {
      stroke: '#78685a',
      fill: '#78685a10',
      strokeWidth: 48,
      opacity: 0.98,
      markerSize: 260,
    },
    forest: {
      stroke: '#517256',
      fill: '#51725628',
      strokeWidth: 75,
      opacity: 0.88,
      markerSize: 260,
    },
    regionBorder: {
      stroke: '#9f453d',
      fill: '#9f453d08',
      strokeWidth: 78,
      opacity: 0.97,
      markerSize: 260,
    },
  },
};

export function getThemeVisuals(themePreset: ThemePreset): ThemeVisuals {
  return themeVisuals[themePreset];
}

export function getFeatureKindForRole(
  featureRole: FeatureRole,
  fallbackKind: FeatureKind = 'marker',
): FeatureKind {
  switch (featureRole) {
    case 'settlement':
      return 'marker';
    case 'river':
    case 'road':
    case 'mountainRange':
      return 'path';
    case 'forest':
      return 'polygon';
    case 'regionBorder':
      return 'border';
    case 'custom':
    default:
      return fallbackKind;
  }
}

export function getCompatibleFeatureRoles(featureKind: FeatureKind): FeatureRole[] {
  return FEATURE_ROLE_ORDER.filter((featureRole) => {
    if (featureRole === 'custom') {
      return true;
    }

    return getFeatureKindForRole(featureRole) === featureKind;
  });
}

export function getDefaultFeatureStyle(
  featureRole: FeatureRole,
  themePreset: ThemePreset,
  fallbackKind: FeatureKind = 'marker',
): MapStyle {
  if (featureRole === 'custom') {
    const preset = rolePresets[themePreset].custom;

    if (fallbackKind === 'path') {
      return { ...preset, fill: 'none', strokeWidth: 100 };
    }

    if (fallbackKind === 'polygon' || fallbackKind === 'border') {
      return {
        ...preset,
        fill: '#c99b4e18',
        strokeWidth: 90,
      };
    }

    return preset;
  }

  return rolePresets[themePreset][featureRole];
}
