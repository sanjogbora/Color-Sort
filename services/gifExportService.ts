import GIF from 'gif.js';
import type { ImageFile, GifExportSettings } from '../types';

export async function createGifFromImages(
  images: ImageFile[], 
  settings: GifExportSettings
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const validImages = images.filter(img => !img.error);
    if (validImages.length === 0) {
      reject(new Error('No valid images to create GIF'));
      return;
    }

    console.log('Starting GIF creation with', validImages.length, 'images');

    // First pass: determine the maximum dimensions after scaling
    let maxWidth = 0;
    let maxHeight = 0;
    let loadedCount = 0;
    const MAX_HEIGHT = 1000;

    const imageData: { width: number; height: number; element: HTMLImageElement }[] = [];

    // Load all images first to determine final GIF dimensions
    validImages.forEach((imageFile, index) => {
      const img = new Image();
      
      img.onload = () => {
        let finalWidth = img.width;
        let finalHeight = img.height;

        // Scale down if height exceeds 1000px, maintaining aspect ratio
        if (finalHeight > MAX_HEIGHT) {
          const scale = MAX_HEIGHT / finalHeight;
          finalWidth = Math.round(finalWidth * scale);
          finalHeight = MAX_HEIGHT;
        }

        imageData[index] = { width: finalWidth, height: finalHeight, element: img };
        maxWidth = Math.max(maxWidth, finalWidth);
        maxHeight = Math.max(maxHeight, finalHeight);

        loadedCount++;
        if (loadedCount === validImages.length) {
          createGifWithDimensions();
        }
      };

      img.onerror = () => {
        console.error('Error loading image:', imageFile.originalName);
        reject(new Error(`Failed to load image: ${imageFile.originalName}`));
      };

      img.crossOrigin = 'anonymous';
      img.src = imageFile.previewUrl;
    });

    function createGifWithDimensions() {
      console.log(`Creating GIF with dimensions: ${maxWidth}x${maxHeight}`);

      try {
        const gif = new GIF({
          workers: 1,
          quality: 15,
          width: maxWidth,
          height: maxHeight,
          repeat: 0,
          transparent: 0x000000, // Set black as transparent
          debug: false
        });

        // Set up event handlers
        gif.on('finished', (blob: Blob) => {
          console.log('GIF creation finished, size:', blob.size, 'bytes');
          resolve(blob);
        });

        gif.on('progress', (progress: number) => {
          console.log('GIF rendering progress:', Math.round(progress * 100) + '%');
        });

        gif.on('abort', () => {
          console.error('GIF creation aborted');
          reject(new Error('GIF creation was aborted'));
        });

        // Process each image
        imageData.forEach((data, index) => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Could not get canvas context');
          }

          canvas.width = maxWidth;
          canvas.height = maxHeight;

          // No background - leave transparent
          // Center the image in the canvas
          const offsetX = (maxWidth - data.width) / 2;
          const offsetY = (maxHeight - data.height) / 2;

          // Draw image at its calculated size, centered
          ctx.drawImage(data.element, offsetX, offsetY, data.width, data.height);

          // Add frame to GIF
          gif.addFrame(canvas, { delay: settings.duration });

          console.log(`Added frame ${index + 1}/${imageData.length} (${data.width}x${data.height})`);
        });

        console.log('All frames added, rendering GIF...');
        gif.render();

      } catch (error) {
        console.error('Error creating GIF:', error);
        reject(error);
      }
    }
  });
}

export function downloadGif(blob: Blob, filename: string = 'color-sorted-images.gif') {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}