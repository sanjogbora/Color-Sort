
export enum ColorAnalysisMode {
  Math = 'MATH',
  Visual = 'VISUAL',
}

export interface Settings {
  template: string;
  analysisMode: ColorAnalysisMode;
}

export interface GifExportSettings {
  duration: number; // milliseconds per frame
}

export interface HueStats {
  hue: number; // 0-359
  chroma: number; // 0-1, normalized
  lightness: number; // 0-1, normalized
  confidence: number; // 0-1, how confident we are in this color
}

export interface ImageFile {
  id: string;
  file: File;
  originalName: string;
  previewUrl: string;
  hueStats?: HueStats;
  newName?: string;
  error?: string;
}

export interface Progress {
  current: number;
  total: number;
}
