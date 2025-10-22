
import React, { useCallback } from 'react';
import JSZip from 'jszip';
import type { Settings, Progress, ImageFile } from '../types';
import { ComputationMode, DominantColorStrategy } from '../types';
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
    
  const handleExport = useCallback(async () => {
    const zip = new JSZip();
    const validImages = processedImages.filter(img => img.newName && !img.error);

    for (const image of validImages) {
      zip.file(image.newName!, image.file);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(zipBlob);
    link.download = 'HueSorted_Images.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [processedImages]);


  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <label className="font-semibold text-slate-200 block">Computation Mode</label>
        <div className="grid grid-cols-2 gap-2">
            <ModeButton
                label="Fast"
                description="HSV"
                isActive={settings.mode === ComputationMode.Fast}
                onClick={() => onSettingsChange({ ...settings, mode: ComputationMode.Fast })}
            />
            <ModeButton
                label="Perceptual"
                description="LCh"
                isActive={settings.mode === ComputationMode.Perceptual}
                onClick={() => onSettingsChange({ ...settings, mode: ComputationMode.Perceptual })}
            />
        </div>
      </div>

      <div className="space-y-3">
        <label className="font-semibold text-slate-200 block">Dominant Color Strategy</label>
        <div className="grid grid-cols-2 gap-2">
            <ModeButton
                label="Average"
                description="Fastest"
                isActive={settings.strategy === DominantColorStrategy.Average}
                onClick={() => onSettingsChange({ ...settings, strategy: DominantColorStrategy.Average })}
            />
            <ModeButton
                label="K-Means"
                description="More Accurate"
                isActive={settings.strategy === DominantColorStrategy.Kmeans}
                onClick={() => onSettingsChange({ ...settings, strategy: DominantColorStrategy.Kmeans })}
            />
        </div>
      </div>

      <div className="space-y-3">
        <label htmlFor="template" className="font-semibold text-slate-200 flex items-center gap-2">
          Filename Template
          <div className="group relative">
            <HelpIcon className="w-4 h-4 text-slate-500" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 bg-slate-800 text-slate-300 text-xs rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                <strong className="block text-white">Available Tokens:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                    <li><code className="bg-slate-700 px-1 rounded">{'{index:04}'}</code> - Sort index (padded)</li>
                    <li><code className="bg-slate-700 px-1 rounded">{'{hue:03}'}</code> - Hue value (0-359)</li>
                    <li><code className="bg-slate-700 px-1 rounded">{'{basename}'}</code> - Original name</li>
                </ul>
            </div>
          </div>
        </label>
        <input
          type="text"
          id="template"
          value={settings.template}
          onChange={(e) => onSettingsChange({ ...settings, template: e.target.value })}
          className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
        />
      </div>

      <div className="pt-4 space-y-4">
        {isProcessing ? (
          <div className="space-y-2">
            <p className="text-sm text-center text-sky-400">Processing... ({progress.current}/{progress.total})</p>
            <div className="w-full bg-slate-700 rounded-full h-2.5">
              <div 
                className="bg-sky-600 h-2.5 rounded-full transition-all duration-500 ease-out" 
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              ></div>
            </div>
          </div>
        ) : (
          <button
            onClick={onProcess}
            disabled={!hasFiles || isProcessing}
            className="w-full flex items-center justify-center gap-2 bg-sky-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-500 disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed transition-all transform active:scale-95"
          >
            <ProcessIcon className="w-5 h-5" />
            Process Images
          </button>
        )}
         <button
            onClick={handleExport}
            disabled={isProcessing || processedImages.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-500 disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed transition-all transform active:scale-95"
          >
            <ExportIcon className="w-5 h-5" />
            Export as ZIP
          </button>
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
