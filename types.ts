
export enum ComputationMode {
  Fast = 'FAST_HSV',
  Perceptual = 'PERCEPTUAL_LCH',
}

export enum DominantColorStrategy {
  Average = 'AVERAGE',
  Kmeans = 'KMEANS',
}

export interface Settings {
  mode: ComputationMode;
  strategy: DominantColorStrategy;
  template: string;
  ignoreThreshold: number; // 0-1, for saturation/chroma
}

export interface HueStats {
  hue: number; // 0-359
  chroma: number; // 0-1
  lightness: number; // 0-1
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
