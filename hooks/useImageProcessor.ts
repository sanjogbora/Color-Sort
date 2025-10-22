
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
    
    const imagePromises = files.map(async (file, index) => {
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
      
      setProgress(prev => ({ ...prev, current: prev.current + 1 }));
      return imageFile;
    });

    const processedImages = await Promise.all(imagePromises);

    const sortedImages = processedImages
      .filter(img => img.hueStats)
      .sort((a, b) => {
        const statsA = a.hueStats!;
        const statsB = b.hueStats!;
        if (statsA.hue !== statsB.hue) {
          return statsA.hue - statsB.hue;
        }
        if (statsA.chroma !== statsB.chroma) {
          return statsB.chroma - statsA.chroma; // Higher chroma first
        }
        return statsB.lightness - statsA.lightness; // Higher lightness first
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

  return { images, isProcessing, progress, processImages };
};
