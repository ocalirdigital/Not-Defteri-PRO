import React, { useState, useEffect } from 'react';
import {
  FileText,
  LayoutGrid,
  Columns,
  Plus,
  Image as ImageIcon,
  Download,
  Search,
  PanelLeftClose,
  PanelLeft,
  Pin,
  Trash2,
  Share2,
  Monitor,
  Laptop,
  X,
  Minus,
  Maximize2,
  Minimize2,
  Check,
  Copy,
  ExternalLink,
  Keyboard,
  HelpCircle,
  Coffee,
  Heart
} from 'lucide-react';
import { Note } from '../types';

interface DesktopHeaderProps {
  activeNote?: Note;
  activeFolderId?: string;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onNewNote: () => void;
  onViewModeChange: (mode: 'document' | 'canvas' | 'split') => void;
  onPasteImageClick: () => void;
  onExport: () => void;
  onTogglePin: () => void;
  onDeleteNote: () => void;
  onEmptyTrash?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onCloseActiveTab?: () => void;
  onToggleFocusMode?: () => void;
  isFocusMode?: boolean;
  onOpenShortcuts?: () => void;
}

export const DesktopHeader: React.FC<DesktopHeaderProps> = ({
  activeNote,
  activeFolderId,
  isSidebarOpen,
  onToggleSidebar,
  onNewNote,
  onViewModeChange,
  onPasteImageClick,
  onExport,
  onTogglePin,
  onDeleteNote,
  onEmptyTrash,
  searchQuery,
  onSearchChange,
  onCloseActiveTab,
  onToggleFocusMode,
  isFocusMode = false,
  onOpenShortcuts,
}) => {
  const isTrash = activeFolderId === 'trash';
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleNativeInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowInstallModal(false);
      }
    } else {
      setShowInstallModal(true);
    }
  };
  return (
    <header className="h-12 bg-[#121215] border-b border-[#24242b] px-3 flex items-center justify-between select-none shrink-0 z-30">
      {/* Zone 1: Window Controls + Brand + Sidebar toggle */}
      <div className="flex items-center gap-3">
        {/* macOS traffic light window dots - fully functional */}
        <div className="flex items-center gap-1.5 mr-1 group/dots">
          {/* 1. Red Dot: Close Active Tab */}
          <button
            type="button"
            onClick={onCloseActiveTab}
            disabled={!activeNote}
            className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] flex items-center justify-center transition-all hover:scale-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed group/btn focus:outline-none"
            title={activeNote ? `Aktif Sekmeyi Kapat ("${activeNote.title}")` : "Kapatılacak açık sekme yok"}
            aria-label="Aktif Sekmeyi Kapat"
          >
            <X
              size={7}
              strokeWidth={3.5}
              className="text-[#450505] opacity-0 group-hover/dots:opacity-100 transition-opacity"
            />
          </button>

          {/* 2. Yellow Dot: Minimize / Odak Modu (Hide Sidebars for Distraction-free Focus) */}
          <button
            type="button"
            onClick={onToggleFocusMode}
            className={`w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] flex items-center justify-center transition-all hover:scale-110 active:scale-95 group/btn focus:outline-none ${
              isFocusMode ? 'ring-2 ring-amber-400/60 ring-offset-1 ring-offset-[#121215]' : ''
            }`}
            title={
              isFocusMode
                ? "Odak Modundan Çık (Yan Panelleri Geri Getir)"
                : "Odak Modu (Yan Panelleri Gizle, Çalışma Alanını Genişlet)"
            }
            aria-label="Odak Modunu Aç/Kapat"
          >
            <Minus
              size={7}
              strokeWidth={3.5}
              className="text-[#4e3200] opacity-0 group-hover/dots:opacity-100 transition-opacity"
            />
          </button>

          {/* 3. Green Dot: Real Fullscreen Mode (previously grey) */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className={`w-3 h-3 rounded-full ${
              isFullscreen ? 'bg-[#27c93f] border-[#1aab29]' : 'bg-[#27c93f] border-[#1aab29]'
            } flex items-center justify-center transition-all hover:scale-110 active:scale-95 group/btn focus:outline-none`}
            title={isFullscreen ? "Tam Ekrandan Çık (Esc)" : "Uygulamayı Tam Ekran Yap (F11)"}
            aria-label="Tam Ekran Yap"
          >
            {isFullscreen ? (
              <Minimize2
                size={7}
                strokeWidth={3}
                className="text-[#083b12] opacity-0 group-hover/dots:opacity-100 transition-opacity"
              />
            ) : (
              <Maximize2
                size={7}
                strokeWidth={3}
                className="text-[#083b12] opacity-0 group-hover/dots:opacity-100 transition-opacity"
              />
            )}
          </button>
        </div>

        <button
          onClick={onToggleSidebar}
          className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-[#202026] rounded-md transition-colors"
          title={isSidebarOpen ? "Klasör Panelini Gizle" : "Klasör Panelini Göster"}
        >
          {isSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
        </button>

        <div className="hidden sm:flex items-center gap-2">
          <span className="font-semibold text-sm tracking-tight text-zinc-200">
            Not Defteri Pro
          </span>
          <span className="text-[10px] font-mono tracking-wider font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded select-none">
            ocalir labs
          </span>
          {isFocusMode ? (
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
              Odak Modu
            </span>
          ) : (
            <>
              <span className="text-zinc-600">/</span>
              <span className="text-xs text-zinc-400 max-w-[120px] md:max-w-[180px] truncate">
                {activeNote ? activeNote.title : 'Not Seçilmedi'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Zone 2: View Mode Switcher (Interactive Segmented Control) */}
      {activeNote && (
        <div className="flex items-center bg-[#1a1a20] p-0.5 rounded-lg border border-[#2b2b34] shrink-0">
          <button
            onClick={() => onViewModeChange('document')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              activeNote.viewMode === 'document'
                ? 'bg-[#272731] text-amber-400 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Metin Belgesi Görünümü"
          >
            <FileText size={14} />
            <span className="hidden xl:inline">Belge</span>
          </button>

          <button
            onClick={() => onViewModeChange('canvas')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              activeNote.viewMode === 'canvas'
                ? 'bg-[#272731] text-amber-400 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Serbest Tuval / Görsel Pano Görünümü"
          >
            <LayoutGrid size={14} />
            <span className="hidden xl:inline">Serbest Tuval</span>
          </button>

          <button
            onClick={() => onViewModeChange('split')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              activeNote.viewMode === 'split'
                ? 'bg-[#272731] text-amber-400 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Bölünmüş İkili Görünüm"
          >
            <Columns size={14} />
            <span className="hidden xl:inline">İkili</span>
          </button>
        </div>
      )}

      {/* Zone 3: Primary Action & Quick Tools */}
      <div className="flex items-center gap-1 shrink-0">
        {isTrash ? (
          onEmptyTrash && (
            <button
              onClick={onEmptyTrash}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-md transition-colors"
              title="Çöp Kutusundaki Tüm Notları Kalıcı Olarak Sil"
            >
              <Trash2 size={13} />
              <span>Çöpü Boşalt</span>
            </button>
          )
        ) : (
          <>
            {activeNote && (
              <>
                {/* Fotoğraf Ekle Icon Button - Sadece açık not varken görünür */}
                <button
                  onClick={onPasteImageClick}
                  className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-[#1f1f26] border border-transparent hover:border-[#2e2e38] rounded-md transition-colors"
                  title="Fotoğraf Ekle veya Yapıştır (Ctrl+V)"
                  aria-label="Fotoğraf Ekle"
                >
                  <ImageIcon size={15} className="text-amber-400" />
                </button>

                <button
                  onClick={onTogglePin}
                  className={`p-1.5 rounded-md transition-colors ${
                    activeNote.isPinned
                      ? 'text-amber-400 bg-amber-500/15'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#202026]'
                  }`}
                  title={activeNote.isPinned ? "İğneyi Kaldır" : "Üste İğnele"}
                  aria-label="İğnele"
                >
                  <Pin size={15} />
                </button>

                <button
                  onClick={onExport}
                  className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-[#202026] rounded-md transition-colors"
                  title="Notu Dışa Aktar (.md / PDF)"
                  aria-label="Dışa Aktar"
                >
                  <Download size={15} />
                </button>

                <button
                  onClick={onDeleteNote}
                  className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-[#261c1e] rounded-md transition-colors"
                  title="Notu Sil"
                  aria-label="Notu Sil"
                >
                  <Trash2 size={15} />
                </button>
              </>
            )}

            <button
              onClick={onOpenShortcuts}
              className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-[#1c1c22] border border-transparent hover:border-[#2b2b36] rounded-md transition-colors"
              title="Klavye Kısayolları ve Yardım Rehberi (Ctrl+/)"
              aria-label="Kısayollar"
            >
              <Keyboard size={15} className="text-amber-400" />
            </button>

            <button
              onClick={handleNativeInstall}
              className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-[#1c1c22] border border-transparent hover:border-[#2b2b36] rounded-md transition-colors"
              title="Masaüstü Uygulaması Olarak Kur"
              aria-label="Masaüstüne Kur"
            >
              <Monitor size={15} className="text-amber-400" />
            </button>

            {/* Bağış / Kahve Ismarla (Dodo Payments) */}
            <a
              href="https://checkout.dodopayments.com/buy/pdt_0NqNaai72jdmYgFMZLV0j?quantity=1"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-md transition-all hover:scale-105 active:scale-95 shadow-xs"
              title="Geliştiriciye bir kahve ısmarla (Dodo Payments)"
            >
              <Coffee size={13} className="text-rose-400" />
              <span className="hidden lg:inline">Kahve Ismarla</span>
            </a>

            <button
              onClick={onNewNote}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-black bg-amber-500 hover:bg-amber-400 rounded-md shadow-sm transition-all active:scale-95 ml-0.5"
              title="Yeni Not Oluştur (Ctrl+N)"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span className="hidden md:inline">Yeni Not</span>
            </button>
          </>
        )}
      </div>

      {/* Desktop App Installation Guide Modal */}
      {showInstallModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowInstallModal(false)}
        >
          <div
            className="bg-[#141418] border border-[#2d2d38] rounded-2xl w-full max-w-lg shadow-2xl p-6 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#24242f] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Laptop size={17} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">
                    Masaüstü Uygulaması Kurulumu
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Not Defteri Pro'yu bilgisayarınızda yerel program gibi çalıştırın
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInstallModal(false)}
                className="text-zinc-500 hover:text-zinc-200 p-1 rounded-lg hover:bg-[#202028] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Methods */}
            <div className="space-y-4 text-xs text-zinc-300">
              {/* Method 1: 1-Click PWA Native Desktop App */}
              <div className="p-3.5 rounded-xl bg-[#1a1a22] border border-[#2b2b38]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[11px] font-mono font-bold">1</span>
                    En Kolayı: Tarayıcıdan 1-Tıkla Masaüstü Kurulumu (PWA)
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">Tavsiye Edilen</span>
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed mb-2.5">
                  Google Chrome veya Microsoft Edge kullanıyorsanız, adres çubuğunun sağındaki <strong className="text-zinc-200">"Yükle" (⊕ simgesi)</strong> butonuna tıklayarak doğrudan masaüstünüze ve Başlat Menünüze / Dock'a bağımsız pencere olarak yükleyebilirsiniz.
                </p>
                {deferredPrompt ? (
                  <button
                    onClick={handleNativeInstall}
                    className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors text-xs"
                  >
                    <Download size={14} />
                    <span>Şimdi Masaüstüne Yükle</span>
                  </button>
                ) : (
                  <div className="text-[11px] bg-[#121217] p-2 rounded-lg border border-[#242430] text-zinc-400">
                    💡 <strong>Nasıl yapılır:</strong> Tarayıcınızın sağ üstündeki <strong>3 Nokta (Menü)</strong> ➔ <strong>"Kaydet ve Paylaş"</strong> veya <strong>"Uygulamalar"</strong> ➔ <strong>"Not Defteri Pro Uygulamasını Yükle"</strong> butonuna basın.
                  </div>
                )}
              </div>

              {/* Method 2: Offline / Node.js Local Run */}
              <div className="p-3.5 rounded-xl bg-[#1a1a22] border border-[#2b2b38]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center text-[11px] font-mono font-bold">2</span>
                    İndirilen Kodları Bilgisayarda Açma (baslat.bat veya Terminal)
                  </span>
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed mb-2">
                  İndirdiğiniz klasördeki <strong className="text-amber-400">baslat.bat</strong> dosyasına çift tıklayarak otomatik başlatabilirsiniz. Veya terminalden:
                </p>
                <div className="relative bg-[#0d0d10] p-2.5 rounded-lg border border-[#22222b] font-mono text-[11px] text-amber-300 flex items-center justify-between">
                  <code>npm install &amp;&amp; npm run dev</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('npm install && npm run dev');
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="p-1 hover:bg-[#1f1f28] rounded text-zinc-400 hover:text-zinc-200 transition-colors ml-2 shrink-0"
                    title="Kopyala"
                  >
                    {copiedCode ? <Check size={13} className="text-amber-400" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#23232c] flex justify-end">
              <button
                onClick={() => setShowInstallModal(false)}
                className="px-4 py-1.5 bg-[#252530] hover:bg-[#30303c] text-zinc-200 font-medium rounded-lg text-xs transition-colors"
              >
                Anladım, Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
