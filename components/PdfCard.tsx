import React from 'react';
import type { PdfFile } from '../types';
import { PdfIcon, XIcon } from './icons';

interface PdfCardProps {
  pdf: PdfFile;
  onView: (pdf: PdfFile) => void;
  onRemove: (id: string) => void;
}

const PdfCard: React.FC<PdfCardProps> = ({ pdf, onView, onRemove }) => {
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering onView when clicking remove
    onRemove(pdf.id);
  };

  return (
    <div
      className="group relative bg-slate-800 rounded-lg p-5 shadow-lg cursor-pointer transition-all duration-300 hover:bg-slate-700 hover:shadow-blue-500/20 hover:-translate-y-1"
      onClick={() => onView(pdf)}
    >
      <div className="flex flex-col items-center text-center">
        <PdfIcon className="w-16 h-16 text-red-400 mb-4" />
        <p
          className="text-gray-200 font-medium break-all"
          title={pdf.file.name}
        >
          {pdf.file.name.length > 30 ? `${pdf.file.name.substring(0, 27)}...` : pdf.file.name}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {(pdf.file.size / 1024 / 1024).toFixed(2)} MB
        </p>
      </div>
      <button
        onClick={handleRemove}
        className="absolute top-2 right-2 p-1 bg-gray-700 rounded-full text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-red-500 hover:text-white"
        aria-label="Remove PDF"
        title="Remove PDF"
      >
        <XIcon className="w-4 h-4" />
      </button>
       <div className="absolute inset-0 bg-brand-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg pointer-events-none"></div>
    </div>
  );
};

export default PdfCard;
