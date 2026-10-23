import React, { useState, useRef } from 'react';
import { X, Upload, Link, Image as ImageIcon, Clipboard, Check } from 'lucide-react';

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddImage: (src: string, caption: string) => void;
}

export const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  isOpen,
  onClose,
  onAddImage,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'paste'>('upload');
  const [imageUrl, setImageUrl] = useState('');
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setPreviewSrc(result);
        if (!caption) {
          setCaption(file.name.replace(/\.[^/.]+$/, ''));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const reader = new FileReader();
          reader.onload = (ev) => {
            const result = ev.target?.result as string;
            setPreviewSrc(result);
            if (!caption) setCaption('Panodan Yapıştırılan Görsel');
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
      alert('Panoda görsel bulunamadı. Lütfen bir görsel kopyalayıp tekrar deneyin.');
    } catch {
      alert('Panoya erişilemedi. Lütfen sayfadayken doğrudan Ctrl+V tuşlarına basın.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalSrc = previewSrc || imageUrl.trim();
    if (finalSrc) {
      onAddImage(finalSrc, caption.trim() || 'Fotoğraf Açıklaması');
      setPreviewSrc(null);
      setImageUrl('');
      setCaption('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#18181f] border border-[#2b2b36] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-[#24242e] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon size={16} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-zinc-100">
              Fotoğraf Ekle & Tuvale Yerleştir
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-[#252530] rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-[#24242e] bg-[#141419] p-1 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'upload'
                ? 'bg-[#22222a] text-amber-400 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Dosya Yükle
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'paste'
                ? 'bg-[#22222a] text-amber-400 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Panodan Yapıştır
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'url'
                ? 'bg-[#22222a] text-amber-400 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Web URL
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {activeTab === 'upload' && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#333342] hover:border-amber-500/80 rounded-xl p-6 text-center cursor-pointer transition-colors bg-[#131317]"
              >
                <Upload size={28} className="text-zinc-400 mx-auto mb-2" />
                <p className="text-xs font-medium text-zinc-200 mb-1">
                  Bilgisayarınızdan fotoğraf seçin
                </p>
                <p className="text-[11px] text-zinc-500">
                  PNG, JPG, WebP veya GIF dosyaları
                </p>
              </div>
            </div>
          )}

          {activeTab === 'paste' && (
            <div className="space-y-3">
              <div className="bg-[#131317] border border-[#2b2b36] rounded-xl p-5 text-center">
                <Clipboard size={28} className="text-amber-500 mx-auto mb-2" />
                <p className="text-xs text-zinc-200 mb-2 font-medium">
                  Panodaki görseli doğrudan içe aktarın
                </p>
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="px-3 py-1.5 bg-[#252530] hover:bg-[#30303e] text-xs text-amber-400 font-medium rounded-lg transition-colors"
                >
                  Panodan Oku
                </button>
                <p className="text-[11px] text-zinc-500 mt-2">
                  İpucu: Tuvaldeyken herhangi bir zamanda <kbd className="px-1 bg-[#202028] text-zinc-300 rounded">Ctrl+V</kbd> tuşlarına basarak da yapıştırabilirsiniz.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'url' && (
            <div className="space-y-2">
              <label className="text-xs text-zinc-300 font-medium block">
                Görsel Web Bağlantısı (URL):
              </label>
              <div className="relative">
                <Link size={13} className="absolute left-2.5 top-2.5 text-zinc-500" />
                <input
                  type="url"
                  placeholder="https://example.com/resim.jpg"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setPreviewSrc(e.target.value);
                  }}
                  className="w-full bg-[#131317] border border-[#2b2b36] rounded-lg text-xs text-zinc-100 pl-8 pr-3 py-2 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {/* Image Preview Box */}
          {previewSrc && (
            <div className="border border-[#2b2b36] rounded-xl overflow-hidden bg-black/50 p-2">
              <img
                src={previewSrc}
                alt="Önizleme"
                referrerPolicy="no-referrer"
                className="max-h-36 mx-auto object-contain rounded"
              />
            </div>
          )}

          {/* Caption Input ("Fotoğraf altına yazılan yazı") */}
          <div>
            <label className="text-xs text-zinc-300 font-medium block mb-1">
              Fotoğraf Altı Açıklama Metni:
            </label>
            <input
              type="text"
              placeholder="Örn: iPad Not Referansı, Tasarım Şeması, vb..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full bg-[#131317] border border-[#2b2b36] rounded-lg text-xs text-zinc-100 px-3 py-2 focus:outline-none focus:border-amber-500 placeholder:text-zinc-600"
            />
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#24242e]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-[#202028] rounded-lg transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={!previewSrc && !imageUrl.trim()}
              className="px-4 py-1.5 text-xs font-medium text-black bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:pointer-events-none rounded-lg transition-colors shadow-sm"
            >
              Fotoğrafı Ekle
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
