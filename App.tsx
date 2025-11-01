
import React, { useState, useCallback, useMemo } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { ImageImporter } from './components/ImageImporter';
import { SettingsPanel } from './components/SettingsPanel';
import { ImageGrid } from './components/ImageGrid';
import { HueHistogram } from './components/HueHistogram';
import { useImageProcessor } from './hooks/useImageProcessor';
import { AppLogo } from './components/Icons';
import type { Settings } from './types';

export default function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [settings, setSettings] = useState<Settings>({
    template: '{index}_{basename}',
  });

  const { images, isProcessing, progress, processImages, reorderImages } = useImageProcessor();

  const handleFilesAdded = useCallback((newFiles: File[]) => {
    const uniqueNewFiles = newFiles.filter(
      (newFile) => !files.some((existingFile) => existingFile.name === newFile.name && existingFile.size === newFile.size)
    );
    setFiles((prevFiles) => [...prevFiles, ...uniqueNewFiles]);
  }, [files]);

  const handleProcess = useCallback(() => {
    processImages(files, settings);
  }, [files, settings, processImages]);

  const hasFiles = files.length > 0;
  const hasProcessedImages = images.length > 0;

  const memoizedHistogram = useMemo(() => {
    return hasProcessedImages ? <HueHistogram images={images} /> : null;
  }, [images, hasProcessedImages]);

  return (
    <>
      <Analytics />
      <div className="min-h-screen bg-slate-900 text-slate-300 font-sans">
        <main className="flex flex-col lg:flex-row min-h-screen">
          <aside className="w-full lg:w-96 bg-slate-950/50 border-r border-slate-800 p-6 flex flex-col gap-8 sticky top-0 h-auto lg:h-screen">
            <header className="flex items-center gap-3">
              <AppLogo />
              <div>
                <h1 className="text-xl font-bold text-white">HueSort</h1>
                <p className="text-sm text-slate-400">Image Organizer</p>
              </div>
            </header>
            <SettingsPanel
              settings={settings}
              onSettingsChange={setSettings}
              onProcess={handleProcess}
              isProcessing={isProcessing}
              progress={progress}
              hasFiles={hasFiles}
              processedImages={images}
            />
            <div className="flex-grow flex flex-col justify-end">
              {memoizedHistogram}
            </div>
          </aside>

          <div className="flex-1 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
              {!hasFiles ? (
                <ImageImporter onFilesAdded={handleFilesAdded} />
              ) : (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold text-white">Image Preview ({images.length > 0 ? images.length : files.length} files)</h2>
                    {hasProcessedImages && (
                      <p className="text-sm text-slate-400">Sorted by Hue</p>
                    )}
                  </div>
                  <ImageGrid
                    images={images}
                    initialFiles={files}
                    onReorder={reorderImages}
                    canReorder={images.length > 0}
                  />
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
