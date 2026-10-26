import React, { useState } from 'react';
import { GripVertical, X, Image as ImageIcon, Video, ArrowLeft, ArrowRight, Film } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export interface DraggableMediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  file?: File;
  name?: string;
}

interface DraggableMediaReorderProps {
  items: DraggableMediaItem[];
  onReorder: (items: DraggableMediaItem[]) => void;
  onRemove: (index: number) => void;
  className?: string;
}

/**
 * Reusable Drag-and-Drop Media Reordering Component.
 * Supports touch & pointer drag-and-drop, visible drag handle (⋮⋮),
 * quick move controls for mobile, and delete triggers.
 */
export const DraggableMediaReorder: React.FC<DraggableMediaReorderProps> = ({
  items,
  onReorder,
  onRemove,
  className = '',
}) => {
  const { language, isRTL } = useApp();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (!items || items.length === 0) return null;

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', String(index));
    } catch {}
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const reordered = [...items];
    const [movedItem] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, movedItem);

    onReorder(reordered);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleMove = (fromIndex: number, direction: 'prev' | 'next') => {
    const toIndex = direction === 'prev' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= items.length) return;

    const reordered = [...items];
    const [movedItem] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, movedItem);
    onReorder(reordered);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-0.5">
        <span className="flex items-center gap-1">
          <GripVertical className="w-3.5 h-3.5 text-orange-500" />
          <span>{language === 'ar' ? 'اسحب العناصر لإعادة ترتيبها (⋮⋮)' : 'Drag items to reorder (⋮⋮)'}</span>
        </span>
        <span className="font-mono text-[10px]">
          {items.length} {language === 'ar' ? 'عناصر' : 'items'}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {items.map((item, index) => {
          const isDragging = draggedIndex === index;
          const isOver = dragOverIndex === index;

          return (
            <div
              key={item.id || `${item.url}-${index}`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={() => {
                setDraggedIndex(null);
                setDragOverIndex(null);
              }}
              className={`relative aspect-video rounded-xl overflow-hidden border transition-all duration-150 bg-slate-900 group select-none ${
                isDragging
                  ? 'opacity-40 scale-95 ring-2 ring-orange-500 border-orange-500'
                  : isOver
                  ? 'ring-2 ring-orange-500 scale-102 border-orange-500'
                  : 'border-slate-200 dark:border-[#2A384C] hover:border-orange-400 dark:hover:border-orange-500/60'
              }`}
            >
              {/* Media Thumbnail */}
              {item.type === 'video' ? (
                <div className="w-full h-full flex items-center justify-center bg-black/90">
                  <video
                    src={item.url}
                    preload="metadata"
                    className="w-full h-full object-cover pointer-events-none"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
                    <Film className="w-5 h-5 text-white/90" />
                  </div>
                </div>
              ) : (
                <img
                  src={item.url}
                  alt={item.name || `Attachment ${index + 1}`}
                  className="w-full h-full object-cover pointer-events-none"
                  referrerPolicy="no-referrer"
                />
              )}

              {/* Drag Handle (⋮⋮) Top Corner */}
              <div
                title={language === 'ar' ? 'اسحب لإعادة الترتيب' : 'Drag to reorder'}
                className="absolute top-1.5 start-1.5 p-1 rounded-md bg-black/75 backdrop-blur-xs text-white/90 cursor-grab active:cursor-grabbing border border-white/10 shadow-xs flex items-center gap-1"
              >
                <GripVertical className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-[10px] font-mono font-bold leading-none pe-0.5">
                  #{index + 1}
                </span>
              </div>

              {/* Remove Button (X) Top-End Corner */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(index);
                }}
                title={language === 'ar' ? 'حذف العنصر' : 'Remove item'}
                className="absolute top-1.5 end-1.5 p-1 rounded-md bg-black/75 hover:bg-rose-600 text-white transition-colors cursor-pointer border border-white/10 shadow-xs z-10"
              >
                <X className="w-3 h-3" />
              </button>

              {/* Bottom Quick-Reorder Action Bar (Mobile & Precision) */}
              <div className="absolute bottom-0 inset-x-0 p-1 bg-gradient-to-t from-black/85 via-black/50 to-transparent flex items-center justify-between opacity-85 group-hover:opacity-100 transition-opacity">
                {/* Media Type Badge */}
                <span className="text-[9px] font-medium text-slate-300 px-1 py-0.2 rounded bg-black/50 backdrop-blur-xs flex items-center gap-1">
                  {item.type === 'video' ? (
                    <>
                      <Video className="w-2.5 h-2.5 text-purple-400" />
                      <span>{language === 'ar' ? 'فيديو' : 'Video'}</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-2.5 h-2.5 text-orange-400" />
                      <span>{language === 'ar' ? 'صورة' : 'Photo'}</span>
                    </>
                  )}
                </span>

                {/* Left/Right Quick Move Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMove(index, 'prev');
                    }}
                    disabled={index === 0}
                    title={language === 'ar' ? 'تحريك للسابق' : 'Move previous'}
                    className="p-1 rounded bg-black/60 hover:bg-orange-500 text-white disabled:opacity-30 disabled:hover:bg-black/60 cursor-pointer transition-colors"
                  >
                    {isRTL ? <ArrowRight className="w-2.5 h-2.5" /> : <ArrowLeft className="w-2.5 h-2.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMove(index, 'next');
                    }}
                    disabled={index === items.length - 1}
                    title={language === 'ar' ? 'تحريك للتالي' : 'Move next'}
                    className="p-1 rounded bg-black/60 hover:bg-orange-500 text-white disabled:opacity-30 disabled:hover:bg-black/60 cursor-pointer transition-colors"
                  >
                    {isRTL ? <ArrowLeft className="w-2.5 h-2.5" /> : <ArrowRight className="w-2.5 h-2.5" />}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
