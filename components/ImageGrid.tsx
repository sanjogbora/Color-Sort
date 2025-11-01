
import React, { useState } from 'react';
import type { ImageFile } from '../types';
import { ErrorIcon } from './Icons';

interface ImageGridProps {
  images: ImageFile[];
  initialFiles: File[];
  onReorder?: (fromIndex: number, toIndex: number) => void;
  canReorder?: boolean;
  onAddMore?: (files: File[]) => void;
}

export const ImageGrid: React.FC<ImageGridProps> = ({ 
  images, 
  initialFiles, 
  onReorder, 
  canReorder = false,
  onAddMore
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const displayItems = images.length > 0 ? images : initialFiles.map(file => ({
    id: `${file.name}-${file.size}`,
    file,
    originalName: file.name,
    previewUrl: URL.createObjectURL(file),
  }));

  if (displayItems.length === 0) {
    return <p className="text-center text-slate-500">No images to display.</p>;
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!canReorder) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!canReorder || draggedIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    if (!canReorder || draggedIndex === null || !onReorder) return;
    e.preventDefault();
    
    if (draggedIndex !== dropIndex) {
      onReorder(draggedIndex, dropIndex);
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-4">
      {canReorder && (
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
          <p className="text-sm text-slate-300">
            💡 <strong>Tip:</strong> Drag and drop images to reorder them manually if the automatic sorting isn't perfect.
          </p>
        </div>
      )}
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {displayItems.map((item, index) => (
          <ImageCard 
            key={item.id} 
            image={item} 
            index={index}
            canReorder={canReorder}
            isDragging={draggedIndex === index}
            isDragOver={dragOverIndex === index}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
          />
        ))}
        {onAddMore && <AddMoreCard onAddMore={onAddMore} />}
      </div>
    </div>
  );
};

interface ImageCardProps {
  image: ImageFile;
  index: number;
  canReorder: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
}

const ImageCard: React.FC<ImageCardProps> = ({ 
  image, 
  index, 
  canReorder, 
  isDragging, 
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd
}) => {
  const { previewUrl, originalName, newName, hueStats, error } = image;

  const dragClasses = canReorder ? (
    isDragging ? 'opacity-50 scale-95 cursor-grabbing' :
    isDragOver ? 'border-sky-400 scale-105' :
    'cursor-grab hover:cursor-grab'
  ) : '';

  const borderClass = isDragOver ? 'border-sky-400' : 
                     canReorder ? 'border-transparent hover:border-sky-500' : 
                     'border-transparent hover:border-sky-500';

  return (
    <div 
      className={`group relative aspect-square bg-slate-800 rounded-lg overflow-hidden shadow-lg border-2 transition-all hover:scale-105 ${borderClass} ${dragClasses}`}
      draggable={canReorder}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
    >
      <img src={previewUrl} alt={originalName} className="w-full h-full object-cover" loading="lazy" />
      
      {canReorder && (
        <div className="absolute top-2 left-2 bg-slate-900/80 text-white text-xs font-bold px-2 py-1 rounded">
          {index + 1}
        </div>
      )}
      
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

interface AddMoreCardProps {
  onAddMore: (files: File[]) => void;
}

const AddMoreCard: React.FC<AddMoreCardProps> = ({ onAddMore }) => {
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onAddMore(files);
    }
    // Reset input so same files can be selected again
    e.target.value = '';
  };

  return (
    <label className="group relative aspect-square bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-600 hover:border-sky-500 transition-all cursor-pointer flex flex-col items-center justify-center hover:scale-105">
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <div className="text-center p-4">
        <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-slate-700 flex items-center justify-center group-hover:bg-sky-600 transition-colors">
          <svg className="w-6 h-6 text-slate-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-slate-300 group-hover:text-sky-400 transition-colors">Add More</p>
        <p className="text-xs text-slate-500 mt-1">Click to upload</p>
      </div>
    </label>
  );
};
