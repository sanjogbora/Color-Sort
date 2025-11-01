
import React, { useCallback, useState } from 'react';
import JSZip from 'jszip';
import type { Settings, Progress, ImageFile, GifExportSettings } from '../types';
import { ColorAnalysisMode } from '../types';
import { createGifFromImages, downloadGif } from '../services/gifExportService';
import { ProcessIcon, ExportIcon, HelpIcon } from './Icons';

interface SettingsPanelProps {
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
  onProcess: () => void;
  isProcessing: boolean;
  progress: Progress;
  hasFiles: boolean;
  processedImages: ImageFile[];
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onSettingsChange,
  onProcess,
  isProcessing,
  progress,
  hasFiles,
  processedImages,
}) => {
  const [isExportingGif, setIsExportingGif] = useState(false);
  const [gifSettings, setGifSettings] = useState<GifExportSettings>({
    duration: 500 // 0.5 seconds per frame
  });
    
  const handleExportZip = useCallback(async () => {
    const zip = new JSZip();
    const validImages = processedImages.filter(img => img.newName && !img.error);

    for (const image of validImages) {
      zip.file(image.newName!, image.file);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(zipBlob);
    link.download = 'color-sorted-images.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [processedImages]);

  const handleExportGif = useCallback(async () => {
    setIsExportingGif(true);
    try {
      const validImages = processedImages.filter(img => !img.error);
      if (validImages.length === 0) {
        alert('No valid images to create GIF');
        return;
      }

      console.log('Starting GIF export with settings:', gifSettings);
      console.log('Valid images for GIF:', validImages.length);
      
      const gifBlob = await createGifFromImages(validImages, gifSettings);
      console.log('GIF created successfully, size:', gifBlob.size, 'bytes');
      
      downloadGif(gifBlob, 'color-sorted-animation.gif');
      console.log('GIF download initiated');
    } catch (error) {
      console.error('Error creating GIF:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to create GIF: ${errorMessage}\n\nPlease check the console for more details.`);
    } finally {
      setIsExportingGif(false);
    }
  }, [processedImages, gifSettings]);


  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <label className="font-semibold text-slate-200 block">Analysis Mode</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onSettingsChange({ ...settings, analysisMode: ColorAnalysisMode.Math })}
            className={`p-3 text-left rounded-lg border-2 transition-all ${
              settings.analysisMode === ColorAnalysisMode.Math
                ? 'bg-sky-900/50 border-sky-500'
                : 'bg-slate-800 border-slate-700 hover:border-slate-600'
            }`}
          >
            <span className="font-semibold text-sm text-white block">Math</span>
            <span className="text-xs text-slate-400">Simple histogram</span>
          </button>
          <button
            onClick={() => onSettingsChange({ ...settings, analysisMode: ColorAnalysisMode.Visual })}
            className={`p-3 text-left rounded-lg border-2 transition-all ${
              settings.analysisMode === ColorAnalysisMode.Visual
                ? 'bg-sky-900/50 border-sky-500'
                : 'bg-slate-800 border-slate-700 hover:border-slate-600'
            }`}
          >
            <span className="font-semibold text-sm text-white block">Visual</span>
            <span className="text-xs text-slate-400">Perceptual weighting</span>
          </button>
        </div>
        <p className="text-xs text-slate-500">
          {settings.analysisMode === ColorAnalysisMode.Math 
            ? 'Fast pixel counting - good for most images'
            : 'Smart weighting - better for grey backgrounds & text'}
        </p>
      </div>

      <div className="space-y-3">
        <label htmlFor="template" className="font-semibold text-slate-200 flex items-center gap-2">
          Filename Format
          <div className="group relative">
            <HelpIcon className="w-4 h-4 text-slate-500" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 bg-slate-800 text-slate-300 text-xs rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                <strong className="block text-white">Simple tokens:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                    <li><code className="bg-slate-700 px-1 rounded">{'{index}'}</code> - Sort order (1, 2, 3...)</li>
                    <li><code className="bg-slate-700 px-1 rounded">{'{basename}'}</code> - Original name</li>
                </ul>
                <p className="mt-2 text-slate-400">Example: "sorted_&#123;index&#125;_&#123;basename&#125;" → "sorted_1_photo.jpg"</p>
            </div>
          </div>
        </label>
        <div className="space-y-2">
          <input
            type="text"
            id="template"
            value={settings.template}
            onChange={(e) => onSettingsChange({ ...settings, template: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
            placeholder="e.g., {index}_{basename}"
          />
          <div className="flex gap-2">
            <button
              onClick={() => onSettingsChange({ ...settings, template: '{index}_{basename}' })}
              className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded transition"
            >
              Simple
            </button>
            <button
              onClick={() => onSettingsChange({ ...settings, template: 'sorted_{index}' })}
              className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded transition"
            >
              Clean
            </button>
          </div>
        </div>
      </div>

      {processedImages.length > 0 && (
        <div className="space-y-3 border-t border-slate-700 pt-4">
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-2">GIF Animation Speed</label>
            <select
              value={gifSettings.duration}
              onChange={(e) => setGifSettings({...gifSettings, duration: parseInt(e.target.value)})}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-200 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            >
              <option value={200}>Fast (0.2s per image)</option>
              <option value={500}>Normal (0.5s per image)</option>
              <option value={1000}>Slow (1s per image)</option>
              <option value={2000}>Very Slow (2s per image)</option>
            </select>
          </div>
        </div>
      )}

      <div className="pt-4 space-y-3">
        {isProcessing ? (
          <div className="space-y-2">
            <p className="text-sm text-center text-sky-400">
              Processing... ({progress.current}/{progress.total})
            </p>
            <div className="w-full bg-slate-700 rounded-full h-2.5">
              <div 
                className="bg-sky-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
              ></div>
            </div>
            <p className="text-xs text-center text-slate-500">
              {progress.current > 0 ? `${Math.round((progress.current / progress.total) * 100)}% complete` : 'Starting...'}
            </p>
          </div>
        ) : (
          <button
            onClick={onProcess}
            disabled={!hasFiles || isProcessing}
            className="w-full flex items-center justify-center gap-2 bg-sky-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-500 disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed transition-all transform active:scale-95"
          >
            <ProcessIcon className="w-5 h-5" />
            Sort Images by Color
          </button>
        )}
        
        {processedImages.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleExportZip}
              disabled={isProcessing || processedImages.length === 0}
              className="flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold py-2 px-3 rounded-lg hover:bg-emerald-500 disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed transition-all text-sm"
            >
              <ExportIcon className="w-4 h-4" />
              Export ZIP
            </button>
            
            <button
              onClick={handleExportGif}
              disabled={isProcessing || processedImages.length === 0 || isExportingGif}
              className="flex items-center justify-center gap-2 border-2 border-slate-400 text-slate-300 font-semibold py-2 px-3 rounded-lg hover:border-slate-300 hover:text-slate-200 disabled:border-slate-600 disabled:text-slate-500 disabled:cursor-not-allowed transition-all text-sm"
            >
              {isExportingGif ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                  Creating...
                </>
              ) : (
                <>
                  🎬
                  Export GIF
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface ModeButtonProps {
    label: string;
    description: string;
    isActive: boolean;
    onClick: () => void;
}

const ModeButton: React.FC<ModeButtonProps> = ({ label, description, isActive, onClick }) => (
    <button 
        onClick={onClick}
        className={`p-3 text-left rounded-lg border-2 transition-all ${isActive ? 'bg-sky-900/50 border-sky-500' : 'bg-slate-800 border-slate-700 hover:border-slate-600'}`}
    >
        <span className="font-semibold text-sm text-white">{label}</span>
        <span className="block text-xs text-slate-400">{description}</span>
    </button>
);
