
import React, { useCallback, useState } from 'react';
import { UploadIcon } from './Icons';

interface ImageImporterProps {
  onFilesAdded: (files: File[]) => void;
}

export const ImageImporter: React.FC<ImageImporterProps> = ({ onFilesAdded }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesAdded(Array.from(e.dataTransfer.files));
    }
  }, [onFilesAdded]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesAdded(Array.from(e.target.files));
    }
  };
  
  const openFileDialog = () => {
    document.getElementById('file-input')?.click();
  };

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-center">
        <div 
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={openFileDialog}
          className={`w-full max-w-2xl p-12 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 ease-in-out ${isDragging ? 'border-sky-500 bg-sky-900/20 scale-105' : 'border-slate-700 hover:border-sky-600 hover:bg-slate-800/50'}`}
        >
          <div className="flex flex-col items-center gap-4 text-slate-400">
              <div className="bg-slate-800 p-4 rounded-full">
                <UploadIcon className="w-10 h-10 text-sky-500" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-200">Drag & Drop Your Images</h2>
              <p>or <span className="text-sky-400 font-semibold">click to browse</span></p>
              <p className="text-xs text-slate-500 mt-2">Supports JPG, PNG, WebP, TIFF</p>
          </div>
          <input 
            type="file"
            id="file-input"
            className="hidden"
            multiple
            accept="image/jpeg,image/png,image/webp,image/tiff"
            onChange={handleFileChange}
          />
        </div>
    </div>
  );
};
