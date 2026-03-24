import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Download } from 'lucide-react';

interface ImageViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    images: string[];
}

const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ isOpen, onClose, images }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [imageError, setImageError] = useState(false);

    // Reset error state when image changes
    React.useEffect(() => {
        setImageError(false);
    }, [currentIndex, images]);

    if (!isOpen || images.length === 0) return null;

    // Helper to extract file ID from a Google Drive URL
    const getDriveImageSrc = (url: string) => {
        const fileIdMatch = url.match(/[-\w]{25,}/);
        if (fileIdMatch) {
            // Use the thumbnail API which is more reliable for direct embedding
            return `https://drive.google.com/thumbnail?id=${fileIdMatch[0]}&sz=w1200`;
        }
        return url;
    };

    const nextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Create an invisible link to trigger download
        const link = document.createElement('a');
        link.href = images[currentIndex];
        link.target = '_blank';
        link.download = `attachment_${currentIndex + 1}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fadeIn"
            onClick={onClose}
        >
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-10">
                <div className="text-white font-bold tracking-widest text-sm bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                    صورة {currentIndex + 1} من {images.length}
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={handleDownload}
                        className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all hover:scale-110 active:scale-95"
                        title="تحميل الصورة"
                    >
                        <Download className="w-5 h-5" />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-3 bg-red-500/80 hover:bg-red-500 text-white rounded-full transition-all hover:scale-110 active:scale-95"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Main Image Container */}
            <div className="relative w-full max-w-5xl h-[80vh] flex items-center justify-center group">
                {/* Navigation Buttons */}
                {images.length > 1 && (
                    <>
                        <button
                            onClick={prevImage}
                            className="absolute right-4 p-4 bg-black/50 hover:bg-black/80 text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 z-10"
                        >
                            <ChevronRight className="w-8 h-8" />
                        </button>

                        <button
                            onClick={nextImage}
                            className="absolute left-4 p-4 bg-black/50 hover:bg-black/80 text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 z-10"
                        >
                            <ChevronLeft className="w-8 h-8" />
                        </button>
                    </>
                )}

                {/* The Image */}
                {imageError ? (
                    <div className="flex flex-col items-center justify-center gap-6 p-8 bg-black/40 rounded-3xl backdrop-blur-sm border border-white/5">
                        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-400">
                            <X className="w-10 h-10" />
                        </div>
                        <div className="text-center space-y-2">
                            <p className="text-white font-bold text-lg">تعذر تحميل الصورة مباشرة</p>
                            <p className="text-white/60 text-sm">قد يكون ذلك بسبب إعدادات الخصوصية الخاصة بـ Google Drive</p>
                        </div>
                        <a
                            href={images[currentIndex]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-6 py-3 bg-[#00A6A6] text-white rounded-xl font-bold hover:bg-[#008f8f] transition-colors"
                            onClick={(e) => e.stopPropagation()}
                        >
                            فتح الصورة في نافذة جديدة
                        </a>
                    </div>
                ) : (
                    <img
                        src={getDriveImageSrc(images[currentIndex])}
                        alt={`Attachment ${currentIndex + 1}`}
                        className="max-w-full max-h-full object-contain drop-shadow-2xl transition-all duration-300"
                        onClick={(e) => e.stopPropagation()}
                        onError={() => setImageError(true)}
                    />
                )}

            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
                <div
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 p-3 bg-white/10 rounded-3xl backdrop-blur-sm"
                    onClick={(e) => e.stopPropagation()}
                >
                    {images.map((img, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            className={`relative w-16 h-16 rounded-xl overflow-hidden transition-all duration-300 ${currentIndex === idx
                                ? 'ring-4 ring-[#00A6A6] scale-110 z-10'
                                : 'opacity-50 hover:opacity-100'
                                }`}
                        >
                            <img
                                src={getDriveImageSrc(img).replace('w1200', 'w200')}
                                alt={`Thumb ${idx + 1}`}
                                className="w-full h-full object-cover"
                            />
                        </button>

                    ))}
                </div>
            )}
        </div>
    );
};

export default ImageViewerModal;
