
import type { Settings, HueStats } from '../types';
import { ComputationMode, DominantColorStrategy } from '../types';

const DOWNSAMPLE_DIMENSION = 128;

// --- Main Image Processing Function ---

export function processImage(file: File, settings: Settings): Promise<HueStats> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const pixels = getDownsampledPixels(img);
          const stats = calculateHueStats(pixels, settings);
          resolve(stats);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Image could not be loaded.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('File could not be read.'));
    reader.readAsDataURL(file);
  });
}

function getDownsampledPixels(img: HTMLImageElement): Uint8ClampedArray {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get canvas context');

  let { width, height } = img;
  if (width > height) {
    if (width > DOWNSAMPLE_DIMENSION) {
      height = Math.round(height * (DOWNSAMPLE_DIMENSION / width));
      width = DOWNSAMPLE_DIMENSION;
    }
  } else {
    if (height > DOWNSAMPLE_DIMENSION) {
      width = Math.round(width * (DOWNSAMPLE_DIMENSION / height));
      height = DOWNSAMPLE_DIMENSION;
    }
  }
  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(img, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height).data;
}

function calculateHueStats(pixels: Uint8ClampedArray, settings: Settings): HueStats {
  let relevantPixels: number[][] = [];
  const converter = settings.mode === ComputationMode.Fast ? rgbToHsv : rgbToLab;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];

    if (a < 128) continue; // Skip transparent pixels

    const color = converter(r, g, b);
    
    // In HSV, the 2nd value is Saturation. In LAB->LCH, it's Chroma. Both are at index 1.
    const chromaOrSat = (settings.mode === ComputationMode.Fast) ? color[1] : labToLch(color[0], color[1], color[2])[1];
    if(chromaOrSat > settings.ignoreThreshold) {
      relevantPixels.push([r, g, b]);
    }
  }

  if (relevantPixels.length === 0) { // All pixels were ignored (e.g., grayscale image)
    const avgLightness = getAverageLightness(pixels);
    return { hue: 0, chroma: 0, lightness: avgLightness };
  }
  
  let dominantRgb: number[];
  if (settings.strategy === DominantColorStrategy.Kmeans) {
      dominantRgb = kmeans(relevantPixels, 5);
  } else { // Average
      dominantRgb = getAverageRgb(relevantPixels);
  }
  
  if (settings.mode === ComputationMode.Fast) { // HSV
    const [h, s, v] = rgbToHsv(dominantRgb[0], dominantRgb[1], dominantRgb[2]);
    return { hue: h, chroma: s, lightness: v };
  } else { // Perceptual LCH
    const lab = rgbToLab(dominantRgb[0], dominantRgb[1], dominantRgb[2]);
    const [l, c, h] = labToLch(lab[0], lab[1], lab[2]);
    return { hue: h, chroma: c / 128, lightness: l / 100 }; // Normalize chroma/lightness
  }
}

function getAverageLightness(pixels: Uint8ClampedArray): number {
    let totalLightness = 0;
    let count = 0;
    for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i+3] < 128) continue;
        const [h,s,v] = rgbToHsv(pixels[i], pixels[i+1], pixels[i+2]);
        totalLightness += v;
        count++;
    }
    return count > 0 ? totalLightness / count : 0.5;
}


// --- K-Means Implementation ---
function kmeans(pixels: number[][], k: number): number[] {
  if (pixels.length < k) {
    return getAverageRgb(pixels);
  }

  let centroids: number[][] = [];
  for (let i = 0; i < k; i++) {
    centroids.push(pixels[Math.floor(Math.random() * pixels.length)]);
  }

  let clusters: number[][][] = [];
  for(let iter = 0; iter < 10; iter++) { // 10 iterations are usually enough
      clusters = Array.from({ length: k }, () => []);
      for (const pixel of pixels) {
          let minDist = Infinity;
          let clusterIndex = 0;
          for (let i = 0; i < k; i++) {
              const dist = colorDistance(pixel, centroids[i]);
              if (dist < minDist) {
                  minDist = dist;
                  clusterIndex = i;
              }
          }
          clusters[clusterIndex].push(pixel);
      }
      
      for (let i = 0; i < k; i++) {
          if (clusters[i].length > 0) {
              centroids[i] = getAverageRgb(clusters[i]);
          }
      }
  }

  // Find largest cluster
  let largestClusterIndex = 0;
  for (let i = 1; i < k; i++) {
      if (clusters[i].length > clusters[largestClusterIndex].length) {
          largestClusterIndex = i;
      }
  }

  return centroids[largestClusterIndex];
}

function colorDistance(c1: number[], c2: number[]): number {
  return Math.sqrt(
      Math.pow(c1[0] - c2[0], 2) +
      Math.pow(c1[1] - c2[1], 2) +
      Math.pow(c1[2] - c2[2], 2)
  );
}

function getAverageRgb(pixels: number[][]): number[] {
  const sum = pixels.reduce((acc, pixel) => {
    acc[0] += pixel[0];
    acc[1] += pixel[1];
    acc[2] += pixel[2];
    return acc;
  }, [0, 0, 0]);

  return [
    Math.round(sum[0] / pixels.length),
    Math.round(sum[1] / pixels.length),
    Math.round(sum[2] / pixels.length)
  ];
}


// --- Color Space Conversions ---

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, v = max;
  const d = max - min;
  s = max === 0 ? 0 : d / max;
  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s, v];
}

function rgbToLab(r: number, g: number, b: number): [number, number, number] {
    // RGB to XYZ
    let R = r / 255, G = g / 255, B = b / 255;
    R = R > 0.04045 ? Math.pow((R + 0.055) / 1.055, 2.4) : R / 12.92;
    G = G > 0.04045 ? Math.pow((G + 0.055) / 1.055, 2.4) : G / 12.92;
    B = B > 0.04045 ? Math.pow((B + 0.055) / 1.055, 2.4) : B / 12.92;
    
    const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) * 100;
    const Y = (R * 0.2126 + G * 0.7152 + B * 0.0722) * 100;
    const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) * 100;
    
    // XYZ to LAB (D65 illuminant)
    let x = X / 95.047;
    let y = Y / 100.000;
    let z = Z / 108.883;

    x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + (16/116);
    y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + (16/116);
    z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + (16/116);

    const L = (116 * y) - 16;
    const a = 500 * (x - y);
    const b_ = 200 * (y - z);
    
    return [L, a, b_];
}

function labToLch(l: number, a: number, b: number): [number, number, number] {
  const c = Math.sqrt(a * a + b * b);
  let h = Math.atan2(b, a) * (180 / Math.PI);
  if (h < 0) h += 360;
  return [l, c, h];
}
