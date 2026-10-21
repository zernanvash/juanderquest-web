'use client';

import React from 'react';
import { Printer, ArrowLeft, QrCode } from 'lucide-react';
import { generateQrSvgPath } from '@/lib/qr-svg';

export interface QrSheetTask {
  task_key: string;
  step_order: number;
  title: string;
  marker_code: string;
  qr_payload: string;
  fence?: {
    lat: number;
    lng: number;
    radius_meters: number;
  };
}

export interface QrSheetData {
  quest_id: string;
  quest_title: string;
  location_name: string;
  qr_tasks: QrSheetTask[];
}

interface QrSheetProps {
  data: QrSheetData;
  onBack?: () => void;
}

export function QrSheet({ data, onBack }: QrSheetProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Screen-only Controls */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs print:hidden">
        <div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-800 transition-colors mb-1 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to quest editor
            </button>
          )}
          <h1 className="text-lg font-black text-[#582F0E]">Printable QR Placards</h1>
          <p className="text-xs text-stone-500">
            {data.quest_title} · {data.location_name}
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="px-4 py-2 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Print QR Placards</span>
        </button>
      </div>

      {/* Cards Grid (optimized for desktop view and print CSS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
        {data.qr_tasks.map((task) => {
          const { path, viewBox } = generateQrSvgPath(task.qr_payload);

          return (
            <div
              key={task.task_key || task.step_order}
              className="p-8 rounded-3xl border-2 border-stone-300 bg-white shadow-xs flex flex-col items-center text-center space-y-4 print:border-black print:shadow-none print:break-inside-avoid print:p-6"
              data-testid={`qr-placard-${task.step_order}`}
            >
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#2D6A4F] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 print:border-black print:text-black">
                  JuanDerQuest Challenge Placard
                </span>
                <h2 className="text-base font-black text-stone-900 print:text-black">
                  {task.step_order}. {task.title}
                </h2>
                <p className="text-xs text-stone-500 print:text-stone-700">
                  {data.location_name}
                </p>
              </div>

              {/* Scalable High-Res QR SVG */}
              <div className="p-3 bg-white border border-stone-200 rounded-2xl print:border-black">
                <svg
                  viewBox={viewBox}
                  className="w-48 h-48 md:w-56 md:h-56 fill-current text-stone-950 print:text-black"
                  aria-label={`QR Code for ${task.title}`}
                >
                  <path d={path} />
                </svg>
              </div>

              <div className="space-y-1 text-center">
                <div className="text-[11px] font-mono font-bold tracking-wider text-stone-600 bg-stone-100 px-3 py-1 rounded-lg print:bg-white print:border print:border-stone-300">
                  Code: {task.marker_code}
                </div>
                <p className="text-[10px] text-stone-400 print:text-stone-600 max-w-xs">
                  Scan with the JuanDerQuest mobile app to verify your presence at this checkpoint.
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
