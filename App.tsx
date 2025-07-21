import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { PdfFile } from './types';
import Header from './components/Header';
import PdfCard from './components/PdfCard';
import PdfCarouselModal from './components/PdfViewerModal';
import { UploadIcon } from './components/icons';

const App: React.FC = () => {
  const [pdfs, setPdfs] = useState<PdfFile[]>([]);
  const [selectedPdf, setSelectedPdf] = useState<PdfFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newPdfs: PdfFile[] = Array.from(files)
      .filter((file: File) => file.type === 'application/pdf')
      .map((file: File) => ({
        id: `${file.name}-${file.lastModified}-${file.size}`,
        file: file,
        url: URL.createObjectURL(file),
      }));
      
    setPdfs(prevPdfs => {
        const existingIds = new Set(prevPdfs.map(p => p.id));
        const trulyNewPdfs = newPdfs.filter(p => !existingIds.has(p.id));
        return [...prevPdfs, ...trulyNewPdfs];
    });

    // Reset file input to allow selecting the same file again after removal
    if (event.target) {
        event.target.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleViewPdf = useCallback((pdf: PdfFile) => {
    setSelectedPdf(pdf);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedPdf(null);
  }, []);

  const handleRemovePdf = useCallback((id: string) => {
    setPdfs(prevPdfs => {
      const pdfToRemove = prevPdfs.find(pdf => pdf.id === id);
      if (pdfToRemove) {
        URL.revokeObjectURL(pdfToRemove.url); // Clean up memory
      }
      return prevPdfs.filter(pdf => pdf.id !== id);
    });
  }, []);
  
  // Effect for cleaning up all object URLs on component unmount
  useEffect(() => {
    return () => {
        pdfs.forEach(pdf => URL.revokeObjectURL(pdf.url));
    }
  }, [pdfs]);

  return (
    <div className="min-h-screen text-white font-sans">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-200">My Digital Guides</h1>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="application/pdf"
            multiple
            className="hidden"
          />
          <button
            onClick={handleUploadClick}
            className="flex items-center gap-2 bg-brand-secondary text-white font-semibold py-2 px-5 rounded-lg shadow-md hover:bg-blue-500 transition-all duration-300 transform hover:scale-105"
          >
            <UploadIcon className="w-5 h-5" />
            Add PDF
          </button>
        </div>

        {pdfs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {pdfs.map(pdf => (
              <PdfCard
                key={pdf.id}
                pdf={pdf}
                onView={handleViewPdf}
                onRemove={handleRemovePdf}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 px-6 bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-700">
            <h2 className="text-2xl font-semibold text-gray-300">Your Showcase is Empty</h2>
            <p className="mt-2 text-gray-400">Click the "Add PDF" button to upload your digital products and guides.</p>
          </div>
        )}
      </main>

      {selectedPdf && (
        <PdfCarouselModal
          pdfFile={selectedPdf}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default App;
