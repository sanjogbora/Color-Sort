
import React from 'react';
import type { ImageFile } from '../types';
import { ErrorIcon } from './Icons';

interface ImageGridProps {
  images: ImageFile[];
  initialFiles: File[];
}

export const ImageGrid: React.FC<ImageGridProps> = ({ images, initialFiles }) => {
  const displayItems = images.length > 0 ? images : initialFiles.map(file => ({
    id: `${file.name}-${file.size}`,
    file,
    originalName: file.name,
    previewUrl: URL.createObjectURL(file),
  }));

  if (displayItems.length === 0) {
    return <p className="text-center text-slate-500">No images to display.</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {displayItems.map((item) => (
        <ImageCard key={item.id} image={item} />
      ))}
    </div>
  );
};

interface ImageCardProps {
  image: ImageFile;
}

const ImageCard: React.FC<ImageCardProps> = ({ image }) => {
  const { previewUrl, originalName, newName, hueStats, error } = image;
  
  const cardColor = hueStats ? `hsl(${hueStats.hue}, 80%, 20%)` : '#1E293B'; // slate-800

  return (
    <div className="group relative aspect-square bg-slate-800 rounded-lg overflow-hidden shadow-lg border-2 border-transparent transition-all hover:border-sky-500 hover:scale-105">
      <img src={previewUrl} alt={originalName} className="w-full h-full object-cover" loading="lazy" />
      <div 
        className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent text-white text-xs"
        style={{ borderBottomColor: hueStats ? `hsl(${hueStats.hue}, 60%, 50%)` : 'transparent' }}
      >
        <p className="font-bold truncate">{newName || originalName}</p>
        {newName && <p className="text-slate-400 truncate opacity-0 group-hover:opacity-100 transition-opacity">{originalName}</p>}
      </div>
      {hueStats && (
        <div 
          className="absolute top-2 right-2 w-5 h-5 rounded-full border-2 border-slate-900 shadow-md"
          style={{ backgroundColor: `hsl(${hueStats.hue}, ${hueStats.chroma * 100}%, ${hueStats.lightness * 80 + 10}%)` }}
        ></div>
      )}
       {error && (
        <div className="absolute inset-0 bg-red-900/80 flex flex-col items-center justify-center p-2 text-center text-white">
          <ErrorIcon className="w-8 h-8 text-red-300 mb-2"/>
          <p className="text-xs font-semibold">Processing Failed</p>
        </div>
      )}
    </div>
  );
};
