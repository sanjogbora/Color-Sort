
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { ImageFile } from '../types';

interface HueHistogramProps {
  images: ImageFile[];
}

const BINS = 24; // 360 / 15 degrees per bin

export const HueHistogram: React.FC<HueHistogramProps> = ({ images }) => {
  const data = useMemo(() => {
    const bins = Array.from({ length: BINS }, (_, i) => ({
      name: `${i * (360 / BINS)}°`,
      hue: i * (360 / BINS) + (360 / BINS / 2),
      count: 0,
    }));

    images.forEach(image => {
      if (image.hueStats && image.hueStats.chroma > 0) { // Only count non-grayscale
        const binIndex = Math.floor(image.hueStats.hue / (360 / BINS));
        if (bins[binIndex]) {
          bins[binIndex].count++;
        }
      }
    });

    return bins;
  }, [images]);

  if (images.length === 0) return null;

  return (
    <div className="w-full h-48 mt-auto">
        <h3 className="text-sm font-semibold text-white mb-2 text-center font-serif">Hue Distribution</h3>
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fill: '#e2e8f0', fontSize: 11, fontWeight: 600 }} axisLine={{ stroke: '#475569' }} tickLine={false} interval={5} />
                <YAxis tick={{ fill: '#e2e8f0', fontSize: 11, fontWeight: 600 }} axisLine={{ stroke: '#475569' }} tickLine={false} />
                <Tooltip
                    contentStyle={{
                        backgroundColor: '#1e293b',
                        borderColor: '#334155',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem'
                    }}
                    labelStyle={{ color: '#f1f5f9', fontWeight: 600 }}
                    itemStyle={{ fontWeight: 'bold' }}
                    cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                />
                <Bar dataKey="count">
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(${entry.hue}, 70%, 50%)`} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    </div>
  );
};
