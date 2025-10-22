
import { useState, useCallback } from 'react';
import type { ImageFile, Settings, HueStats, Progress } from '../types';
import { processImage } from '../services/colorService';

export const useImageProcessor = () => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<Progress>({ current: 0, total: 0 });

  const processImages = useCallback(async (files: File[], settings: Settings) => {
    setIsProcessing(true);
    setProgress({ current: 0, total: files.length });
    
    const processedImages: ImageFile[] = [];
    
    // Process images sequentially for real-time progress updates
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const id = `${file.name}-${file.size}-${file.lastModified}`;
      const imageFile: ImageFile = {
        id,
        file,
        originalName: file.name,
        previewUrl: URL.createObjectURL(file),
      };

      try {
        const stats = await processImage(file, settings);
        imageFile.hueStats = stats;
      } catch (error) {
        console.error('Error processing image:', file.name, error);
        imageFile.error = (error instanceof Error) ? error.message : 'Unknown error';
      }
      
      processedImages.push(imageFile);
      
      // Update progress after each image
      setProgress({ current: index + 1, total: files.length });
      
      // Small delay to ensure UI updates
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const sortedImages = processedImages
      .filter(img => img.hueStats)
      .sort((a, b) => {
        const statsA = a.hueStats!;
        const statsB = b.hueStats!;
        
        // STRICT hue-only sorting - no tolerance, no overrides
        const hueA = statsA.hue;
        const hueB = statsB.hue;
        
        // Simple linear hue sort (0° to 360°)
        if (Math.abs(hueA - hueB) > 0.1) {
          return hueA - hueB;
        }
        
        // Only if hues are virtually identical, then sort by saturation
        if (Math.abs(statsA.chroma - statsB.chroma) > 0.01) {
          return statsB.chroma - statsA.chroma; // Higher chroma first
        }
        
        // Finally by lightness
        return statsB.lightness - statsA.lightness;
      });
    
    const namedImages = generateNewNames(sortedImages, settings.template);

    const erroredImages = processedImages.filter(img => img.error);

    setImages([...namedImages, ...erroredImages]);
    setIsProcessing(false);
  }, []);



  const generateNewNames = (sortedImages: ImageFile[], template: string): ImageFile[] => {
    return sortedImages.map((image, index) => {
      if (!image.hueStats) return image;

      const basename = image.originalName.substring(0, image.originalName.lastIndexOf('.'));
      const ext = image.originalName.substring(image.originalName.lastIndexOf('.'));

      let newName = template;
      
      const indexMatch = newName.match(/{index:(\d+)}/);
      if (indexMatch) {
          const padding = parseInt(indexMatch[1], 10);
          newName = newName.replace(indexMatch[0], String(index + 1).padStart(padding, '0'));
      } else {
          newName = newName.replace('{index}', String(index + 1));
      }
      
      const hueMatch = newName.match(/{hue:(\d+)}/);
      if (hueMatch) {
          const padding = parseInt(hueMatch[1], 10);
          newName = newName.replace(hueMatch[0], String(Math.round(image.hueStats.hue)).padStart(padding, '0'));
      } else {
          newName = newName.replace('{hue}', String(Math.round(image.hueStats.hue)));
      }

      newName = newName.replace('{basename}', basename);
      newName += ext;

      return { ...image, newName };
    });
  };

  const reorderImages = useCallback((fromIndex: number, toIndex: number) => {
    setImages(prevImages => {
      const newImages = [...prevImages];
      const [movedImage] = newImages.splice(fromIndex, 1);
      newImages.splice(toIndex, 0, movedImage);
      
      // Regenerate names with new order
      const renamedImages = newImages.map((image, index) => {
        if (!image.hueStats) return image;
        
        const basename = image.originalName.substring(0, image.originalName.lastIndexOf('.'));
        const ext = image.originalName.substring(image.originalName.lastIndexOf('.'));
        
        // Use simple template for reordering
        const newName = `${index + 1}_${basename}${ext}`;
        
        return { ...image, newName };
      });
      
      return renamedImages;
    });
  }, []);

  return { images, isProcessing, progress, processImages, reorderImages };
};
