import React, { useState } from 'react';
import { Upload, Wand2, Sparkles, X, Check, LayoutTemplate } from 'lucide-react';
import { BackgroundCategory, CandleImage, ListingContent } from './types';
import * as GeminiService from './services/geminiService';
import LoadingSpinner from './components/LoadingSpinner';

const App: React.FC = () => {
  const [images, setImages] = useState<CandleImage[]>([]);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [selectedBg, setSelectedBg] = useState<BackgroundCategory>(BackgroundCategory.COZY);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [listing, setListing] = useState<ListingContent | null>(null);
  
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      if (files.length + images.length > 4) {
        setError("Maksymalnie 4 zdjęcia.");
        return;
      }
      
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const newImg: CandleImage = {
            id: Math.random().toString(36).substr(2, 9),
            originalData: reader.result as string
          };
          setImages(prev => {
            const updated = [...prev, newImg];
            // Auto-select new images
            setSelectedImageIds(prevIds => [...prevIds, newImg.id]);
            return updated;
          });
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemoveImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
    setSelectedImageIds(prev => prev.filter(x => x !== id));
  };

  const toggleSelection = (id: string) => {
    setSelectedImageIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleProcess = async () => {
    if (selectedImageIds.length === 0) return;

    setIsProcessing(true);
    setError(null);
    setListing(null);

    try {
      const selectedImgs = images.filter(i => selectedImageIds.includes(i.id));
      
      // 1. Start Listing Generation (using originals for context)
      const listingPromise = GeminiService.generateListingText(selectedImgs.map(i => i.originalData));

      // 2. Start Background Generation (Parallel)
      const bgPromises = selectedImgs.map(async (img) => {
        try {
            const processed = await GeminiService.editCandleBackground(img.originalData, selectedBg);
            return { id: img.id, data: processed };
        } catch (e) {
            console.error(`Failed to process image ${img.id}`, e);
            return { id: img.id, data: null };
        }
      });

      // Wait for all operations
      const [listingResult, bgResults] = await Promise.all([
        listingPromise,
        Promise.all(bgPromises)
      ]);

      // Update State
      setListing(listingResult);
      
      setImages(prev => prev.map(img => {
        const res = bgResults.find(r => r.id === img.id);
        return res && res.data ? { ...img, processedData: res.data } : img;
      }));

    } catch (err: any) {
      setError(err.message || "Wystąpił błąd podczas przetwarzania.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 selection:bg-amber-500 selection:text-white pb-20">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-6 h-6 text-amber-500" />
            <span className="text-xl font-bold bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">
              Candle Studio AI
            </span>
          </div>
          
          <div className="flex items-center gap-4">
              <div className="text-xs text-slate-500 font-mono hidden md:block">Gemini 2.5</div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        
        {/* Error Banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Section 1: Upload & Select */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 font-bold">1</div>
              <h2 className="text-2xl font-semibold">Wybierz Zdjęcia</h2>
            </div>
            {images.length > 0 && (
                <span className="text-sm text-slate-400">
                    Zaznaczono: {selectedImageIds.length}
                </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Upload Button */}
            {images.length < 4 && (
              <label className="aspect-square border-2 border-dashed border-slate-700 rounded-xl hover:border-amber-500 hover:bg-slate-800/50 transition-all cursor-pointer flex flex-col items-center justify-center text-slate-400">
                <Upload className="w-8 h-8 mb-2" />
                <span className="text-sm font-medium">Dodaj zdjęcie</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />
              </label>
            )}

            {/* Image List */}
            {images.map((img) => {
              const isSelected = selectedImageIds.includes(img.id);
              return (
                <div 
                  key={img.id} 
                  onClick={() => toggleSelection(img.id)}
                  className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all group ${isSelected ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-700 opacity-60 hover:opacity-100'}`}
                >
                  <img src={img.processedData || img.originalData} alt="Candle" className="w-full h-full object-cover" />
                  
                  {/* Selection Indicator */}
                  <div className={`absolute top-2 left-2 w-6 h-6 rounded-full border border-white flex items-center justify-center transition-colors ${isSelected ? 'bg-amber-500 border-amber-500' : 'bg-black/30'}`}>
                    {isSelected && <Check className="w-4 h-4 text-white" />}
                  </div>

                  <button 
                    onClick={(e) => { e.stopPropagation(); handleRemoveImage(img.id); }}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  
                  {img.processedData && (
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-amber-500/90 text-black text-[10px] font-bold rounded-full">
                          GOTOWE
                      </div>
                  )}
                  
                  {/* Loading overlay if processing this specific image */}
                  {isProcessing && isSelected && !img.processedData && (
                     <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full"></div>
                     </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 2: Controls & Actions */}
        <section className={images.length === 0 ? 'opacity-30 pointer-events-none' : ''}>
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 font-bold">2</div>
            <h2 className="text-2xl font-semibold">Styl i Generowanie</h2>
          </div>

          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
            <div className="mb-4">
                <label className="text-sm font-medium text-slate-400 mb-2 block">Wybierz styl tła:</label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.values(BackgroundCategory).map((bg) => (
                    <button
                    key={bg}
                    onClick={() => setSelectedBg(bg)}
                    className={`p-3 rounded-lg text-sm font-medium transition-all ${selectedBg === bg ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/20' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                    >
                    {bg}
                    </button>
                ))}
                </div>
            </div>

            <div className="border-t border-slate-700 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
               <div className="text-sm text-slate-400 flex items-center gap-2">
                  <LayoutTemplate className="w-4 h-4" />
                  <span>Generuje tła dla {selectedImageIds.length} zdjęć + opis aukcji</span>
               </div>
              <button 
                onClick={handleProcess}
                disabled={isProcessing || selectedImageIds.length === 0}
                className="w-full md:w-auto flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold py-3 px-8 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-900/20 transform active:scale-95"
              >
                {isProcessing ? (
                     <span className="flex items-center gap-2">
                         <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                         Przetwarzanie...
                     </span>
                ) : (
                    <> <Wand2 className="w-5 h-5" /> <span>Generuj Wszystko</span> </>
                )}
              </button>
            </div>
            
            {isProcessing && <div className="mt-4"><LoadingSpinner message="AI pracuje: zmieniam tła i piszę opis..." /></div>}
          </div>
        </section>

        {/* Section 3: Result - Listing */}
        {listing && (
            <section className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="flex items-center space-x-3 mb-6">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 font-bold">3</div>
                    <h2 className="text-2xl font-semibold">Gotowe Ogłoszenie</h2>
                </div>

                <div className="bg-white text-slate-900 rounded-2xl p-8 shadow-2xl relative border-4 border-slate-800/10">
                    <div className="absolute -top-3 right-8 bg-green-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                        OLX / VINTED READY
                    </div>
                    
                    <div className="space-y-6">
                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                Tytuł
                            </label>
                            <div className="text-xl md:text-2xl font-bold bg-slate-50 p-4 rounded-lg border border-slate-100">
                                {listing.title}
                            </div>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                Opis
                            </label>
                            <div className="whitespace-pre-wrap text-base text-slate-700 leading-relaxed bg-slate-50 p-6 rounded-lg border border-slate-100 font-sans">
                                {listing.description}
                            </div>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                Hashtagi
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {listing.tags.map(tag => (
                                    <span key={tag} className="text-sm bg-slate-100 text-slate-600 px-3 py-1.5 rounded-md font-medium hover:bg-slate-200 transition-colors cursor-default">
                                        #{tag.replace('#','')}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        )}

      </main>
    </div>
  );
};

export default App;