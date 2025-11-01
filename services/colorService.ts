
import type { Settings, HueStats } from '../types';
import { ColorAnalysisMode } from '../types';

const DOWNSAMPLE_DIMENSION = 200; // Balanced for speed and accuracy

// Math mode constants
const MIN_CHROMA_THRESHOLD = 8; // Fixed threshold in LCH space
const SAMPLE_SIZE = 500; // Limit pixels for consistent performance

// Visual mode constants
const NEUTRAL_CHROMA_MIN = 7; // Start of neutral fade
const NEUTRAL_CHROMA_MAX = 15; // End of neutral fade
const NEUTRAL_COVERAGE_THRESHOLD = 0.8; // 80% neutral = classify as neutral
const POP_COLOR_WEIGHT_THRESHOLD = 0.12; // 12% weight for pop color override
const POP_COLOR_CHROMA_THRESHOLD = 28; // Minimum chroma for pop color
const HUE_BIN_SIZE = 20; // Degrees per bin
const HUE_BIN_COUNT = 18; // 360 / 20

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
  // Choose algorithm based on mode
  if (settings.analysisMode === ColorAnalysisMode.Visual) {
    return calculateHueStatsVisual(pixels);
  } else {
    return calculateHueStatsMath(pixels);
  }
}

// MATH MODE: Original simple histogram approach
function calculateHueStatsMath(pixels: Uint8ClampedArray): HueStats {
  const dominantColor = findDominantColorIntelligent(pixels);
  
  if (!dominantColor) {
    const avgLightness = calculateAverageLightness(pixels);
    return { 
      hue: 0, 
      chroma: 0, 
      lightness: avgLightness, 
      confidence: 0.1 
    };
  }

  const lab = rgbToLab(dominantColor.r, dominantColor.g, dominantColor.b);
  const [l, c, h] = labToLch(lab[0], lab[1], lab[2]);
  
  return {
    hue: h,
    chroma: Math.min(c / 100, 1),
    lightness: l / 100,
    confidence: dominantColor.confidence
  };
}

// VISUAL MODE: Perceptual weighted analysis
function calculateHueStatsVisual(pixels: Uint8ClampedArray): HueStats {
  const width = Math.sqrt(pixels.length / 4);
  const height = width;
  const centerX = width / 2;
  const centerY = height / 2;
  const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
  
  // Build weighted histogram
  const hueBins: number[] = new Array(HUE_BIN_COUNT).fill(0);
  const binPixels: { a: number, b: number, l: number, weight: number }[][] = Array.from(
    { length: HUE_BIN_COUNT }, 
    () => []
  );
  
  let totalWeight = 0;
  let neutralWeight = 0;
  
  for (let i = 0; i < pixels.length; i += 4) {
    const a = pixels[i + 3];
    if (a < 128) continue;
    
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    
    const lab = rgbToLab(r, g, b);
    const [l, c, h] = labToLch(lab[0], lab[1], lab[2]);
    
    // Calculate neutral weight (soft ramp)
    const neutralMask = Math.max(0, Math.min(1, (c - NEUTRAL_CHROMA_MIN) / (NEUTRAL_CHROMA_MAX - NEUTRAL_CHROMA_MIN)));
    
    if (neutralMask < 0.1) {
      neutralWeight += 1;
      continue;
    }
    
    // Calculate pixel position
    const pixelIndex = Math.floor(i / 4);
    const y = Math.floor(pixelIndex / width);
    const x = pixelIndex % width;
    
    // Center weighting (Gaussian falloff)
    const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)) / maxDistance;
    const centerWeight = Math.exp(-distance * distance / 0.5);
    
    // Lightness weighting (prefer mid-tones)
    const normalizedL = l / 100;
    const lightnessWeight = 0.7 + 0.3 * (1 - Math.abs(normalizedL - 0.5) / 0.5);
    
    // Chroma² weighting (vibrant colors matter more)
    const chromaWeight = c * c / 100; // Normalize
    
    // Combined weight
    const weight = neutralMask * centerWeight * lightnessWeight * chromaWeight;
    
    if (weight > 0) {
      const binIndex = Math.floor(h / HUE_BIN_SIZE) % HUE_BIN_COUNT;
      hueBins[binIndex] += weight;
      binPixels[binIndex].push({ a: lab[1], b: lab[2], l: lab[0], weight });
      totalWeight += weight;
    }
  }
  
  // Check if image is neutral
  const neutralRatio = neutralWeight / (pixels.length / 4);
  
  // Apply Gaussian smoothing to bins (reduces boundary jitter)
  const smoothedBins = smoothHistogram(hueBins);
  
  // Find dominant bin
  let maxBinWeight = 0;
  let maxBinIndex = 0;
  
  for (let i = 0; i < HUE_BIN_COUNT; i++) {
    if (smoothedBins[i] > maxBinWeight) {
      maxBinWeight = smoothedBins[i];
      maxBinIndex = i;
    }
  }
  
  const dominantBinRatio = totalWeight > 0 ? maxBinWeight / totalWeight : 0;
  
  // Pop color override: strong accent color can override neutral classification
  const hasPopColor = dominantBinRatio > POP_COLOR_WEIGHT_THRESHOLD;
  const popColorChroma = hasPopColor ? getAverageChromaForBin(binPixels[maxBinIndex]) : 0;
  const isPopColor = hasPopColor && popColorChroma > POP_COLOR_CHROMA_THRESHOLD;
  
  // Classify as neutral if mostly neutral and no pop color
  if (neutralRatio > NEUTRAL_COVERAGE_THRESHOLD && !isPopColor) {
    const avgLightness = calculateAverageLightness(pixels);
    return {
      hue: 999, // Sort neutrals to end
      chroma: 0,
      lightness: avgLightness,
      confidence: 0.2
    };
  }
  
  // Calculate representative color using centroid in a*b* space
  const binData = binPixels[maxBinIndex];
  if (binData.length === 0) {
    const avgLightness = calculateAverageLightness(pixels);
    return {
      hue: 0,
      chroma: 0,
      lightness: avgLightness,
      confidence: 0.1
    };
  }
  
  let sumA = 0, sumB = 0, sumL = 0, sumWeight = 0;
  
  for (const pixel of binData) {
    sumA += pixel.a * pixel.weight;
    sumB += pixel.b * pixel.weight;
    sumL += pixel.l * pixel.weight;
    sumWeight += pixel.weight;
  }
  
  const centroidA = sumA / sumWeight;
  const centroidB = sumB / sumWeight;
  const centroidL = sumL / sumWeight;
  
  // Convert centroid back to LCH
  const [finalL, finalC, finalH] = labToLch(centroidL, centroidA, centroidB);
  
  return {
    hue: finalH,
    chroma: Math.min(finalC / 100, 1),
    lightness: finalL / 100,
    confidence: Math.min(dominantBinRatio * 2, 1)
  };
}

function smoothHistogram(bins: number[]): number[] {
  const smoothed = new Array(bins.length);
  const kernel = [0.25, 0.5, 0.25]; // 3-tap Gaussian
  
  for (let i = 0; i < bins.length; i++) {
    const prev = (i - 1 + bins.length) % bins.length;
    const next = (i + 1) % bins.length;
    smoothed[i] = bins[prev] * kernel[0] + bins[i] * kernel[1] + bins[next] * kernel[2];
  }
  
  return smoothed;
}

function getAverageChromaForBin(binData: { a: number, b: number, l: number, weight: number }[]): number {
  if (binData.length === 0) return 0;
  
  let sumChroma = 0;
  let sumWeight = 0;
  
  for (const pixel of binData) {
    const chroma = Math.sqrt(pixel.a * pixel.a + pixel.b * pixel.b);
    sumChroma += chroma * pixel.weight;
    sumWeight += pixel.weight;
  }
  
  return sumWeight > 0 ? sumChroma / sumWeight : 0;
}

interface ColorCandidate {
  r: number;
  g: number;
  b: number;
  hue: number;
  chroma: number;
  lightness: number;
  weight: number;
  confidence: number;
}

function findDominantColorIntelligent(pixels: Uint8ClampedArray): ColorCandidate | null {
  // Simple, robust approach: analyze all pixels and find the most common hue
  const coloredPixels: { r: number, g: number, b: number, hue: number, chroma: number, lightness: number }[] = [];
  
  // Extract all colored pixels
  for (let i = 0; i < pixels.length; i += 4) {
    const a = pixels[i + 3];
    if (a < 128) continue; // Skip transparent pixels
    
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    
    // Convert to LCH for perceptual analysis
    const lab = rgbToLab(r, g, b);
    const [l, c, h] = labToLch(lab[0], lab[1], lab[2]);
    
    // Only consider pixels with sufficient chroma (avoid grays)
    if (c > MIN_CHROMA_THRESHOLD) {
      coloredPixels.push({ r, g, b, hue: h, chroma: c, lightness: l });
    }
  }
  
  if (coloredPixels.length === 0) {
    return null; // No colored pixels found
  }
  
  // Find the most frequent hue range
  const hueHistogram: { [key: number]: { pixels: typeof coloredPixels, totalChroma: number } } = {};
  const HUE_BIN_SIZE = 20; // 20-degree bins for stability
  
  for (const pixel of coloredPixels) {
    const binIndex = Math.floor(pixel.hue / HUE_BIN_SIZE);
    
    if (!hueHistogram[binIndex]) {
      hueHistogram[binIndex] = { pixels: [], totalChroma: 0 };
    }
    
    hueHistogram[binIndex].pixels.push(pixel);
    hueHistogram[binIndex].totalChroma += pixel.chroma;
  }
  
  // Find the bin with the highest chroma-weighted count
  let dominantBin = 0;
  let maxScore = 0;
  
  for (const [binIndex, data] of Object.entries(hueHistogram)) {
    // Score = pixel count * average chroma (prioritizes both frequency and saturation)
    const score = data.pixels.length * (data.totalChroma / data.pixels.length);
    if (score > maxScore) {
      maxScore = score;
      dominantBin = parseInt(binIndex);
    }
  }
  
  // Calculate the average color from the dominant bin
  const dominantPixels = hueHistogram[dominantBin].pixels;
  const avgR = Math.round(dominantPixels.reduce((sum, p) => sum + p.r, 0) / dominantPixels.length);
  const avgG = Math.round(dominantPixels.reduce((sum, p) => sum + p.g, 0) / dominantPixels.length);
  const avgB = Math.round(dominantPixels.reduce((sum, p) => sum + p.b, 0) / dominantPixels.length);
  
  // Recalculate LCH for the average color
  const avgLab = rgbToLab(avgR, avgG, avgB);
  const [avgL, avgC, avgH] = labToLch(avgLab[0], avgLab[1], avgLab[2]);
  
  // Calculate confidence based on how dominant this hue is
  const confidence = Math.min(1, dominantPixels.length / coloredPixels.length * 2);
  
  return {
    r: avgR,
    g: avgG,
    b: avgB,
    hue: avgH,
    chroma: avgC,
    lightness: avgL,
    weight: dominantPixels.length,
    confidence
  };
}



function calculateAverageLightness(pixels: Uint8ClampedArray): number {
  let totalLightness = 0;
  let count = 0;
  
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue;
    
    const lab = rgbToLab(pixels[i], pixels[i + 1], pixels[i + 2]);
    totalLightness += lab[0];
    count++;
  }
  
  return count > 0 ? totalLightness / count / 100 : 0.5;
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
