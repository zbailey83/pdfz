import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { PdfFile } from '../types';
import { XIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';

interface PdfCarouselModalProps {
  pdfFile: PdfFile;
  onClose: () => void;
}

const waitForPdfJs = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    const maxRetries = 100; // 100 * 50ms = 5 seconds timeout
    let retries = 0;

    const check = () => {
      if ((window as any).pdfjsLib) {
        resolve((window as any).pdfjsLib);
      } else if (retries < maxRetries) {
        retries++;
        setTimeout(check, 50);
      } else {
        reject(new Error('pdf.js library failed to load after 5 seconds.'));
      }
    };
    check();
  });
};


const PdfCarouselModal: React.FC<PdfCarouselModalProps> = ({ pdfFile, onClose }) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc) return;
    try {
      const page = await pdfDoc.getPage(pageNum);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext('2d');
      if (!context) return;
      
      const viewport = page.getViewport({ scale: 1.5 });
      
      const parentWidth = canvas.parentElement?.clientWidth || viewport.width;
      const scale = parentWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale });

      canvas.height = scaledViewport.height;
      canvas.width = scaledViewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: scaledViewport,
      };
      await page.render(renderContext).promise;
    } catch (e) {
      console.error('Failed to render page', e);
      setError(`Error rendering page ${pageNum}.`);
    }
  }, [pdfDoc]);

  useEffect(() => {
    const loadPdf = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const pdfjsLib = await waitForPdfJs();
        
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

        const loadingTask = pdfjsLib.getDocument(pdfFile.url);
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
      } catch (e: any) {
        console.error('Error loading PDF:', e);
        setError(e.message || 'Failed to load PDF document.');
      } finally {
        setIsLoading(false);
      }
    };
    loadPdf();
  }, [pdfFile]);

  useEffect(() => {
    if (pdfDoc) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, renderPage]);
  
  useEffect(() => {
      const handleResize = () => {
          if(pdfDoc) {
              renderPage(currentPage);
          }
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, [pdfDoc, currentPage, renderPage]);

  const goToPrevPage = useCallback(() => {
    setCurrentPage(prev => (prev > 1 ? prev - 1 : prev));
  }, []);

  const goToNextPage = useCallback(() => {
    setCurrentPage(prev => (prev < totalPages ? prev + 1 : prev));
  }, [totalPages]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'ArrowLeft') {
        goToPrevPage();
      } else if (event.key === 'ArrowRight') {
        goToNextPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, goToPrevPage, goToNextPage]);

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 rounded-lg shadow-2xl w-full h-full max-w-6xl flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-lg font-semibold text-white truncate pr-10" title={pdfFile.file.name}>
            {pdfFile.file.name}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:bg-slate-700 hover:text-white transition-colors"
            aria-label="Close PDF viewer"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </header>

        <main className="flex-grow flex items-center justify-center relative p-2 md:p-4 overflow-hidden">
          {isLoading && <div className="text-white">Loading PDF...</div>}
          {error && <div className="text-red-400 p-4 bg-red-900/50 rounded-lg">{error}</div>}
          
          <div className="w-full h-full flex items-center justify-center">
             <canvas ref={canvasRef} className="max-w-full max-h-full object-contain rounded-md" />
          </div>

          {!isLoading && !error && totalPages > 1 && (
            <>
              <button
                onClick={goToPrevPage}
                disabled={currentPage <= 1}
                className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-slate-900/50 p-2 rounded-full text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                aria-label="Previous page"
              >
                <ChevronLeftIcon className="w-6 h-6" />
              </button>
              <button
                onClick={goToNextPage}
                disabled={currentPage >= totalPages}
                className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-slate-900/50 p-2 rounded-full text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                aria-label="Next page"
              >
                <ChevronRightIcon className="w-6 h-6" />
              </button>
            </>
          )}
        </main>
        
        {!isLoading && !error && totalPages > 0 && (
          <footer className="flex-shrink-0 p-3 text-center border-t border-slate-700">
            <p className="text-sm text-gray-300">
              Page {currentPage} of {totalPages}
            </p>
          </footer>
        )}
      </div>
    </div>
  );
};

export default PdfCarouselModal;