import React, { useState, useRef } from 'react';
import { X, Camera, Image as ImageIcon, Trash2, CameraOff, Loader2 } from 'lucide-react';
import { compressImage } from '../utils';

interface AttachmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (images: { file: File; preview: string }[]) => void;
    initialImages?: { file: File; preview: string }[];
}

const AttachmentModal: React.FC<AttachmentModalProps> = ({ isOpen, onClose, onSave, initialImages = [] }) => {
    const [images, setImages] = useState<{ file: File; preview: string }[]>(initialImages);
    const [isCompressing, setIsCompressing] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        if (images.length + files.length > 4) {
            alert('الحد الأقصى 4 صور فقط');
            return;
        }

        setIsCompressing(true);
        try {
            const newImages = await Promise.all(
                files.map(async (file) => {
                    const compressed = await compressImage(file, 150);
                    return {
                        file: compressed,
                        preview: URL.createObjectURL(compressed),
                    };
                })
            );
            setImages((prev) => [...prev, ...newImages].slice(0, 4));
        } catch (error) {
            console.error('Compression failed:', error);
            alert('فشل ضغط الصور');
        } finally {
            setIsCompressing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removeImage = (index: number) => {
        const newImages = [...images];
        URL.revokeObjectURL(newImages[index].preview);
        newImages.splice(index, 1);
        setImages(newImages);
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setShowCamera(true);
            }
        } catch (err) {
            console.error('Camera access denied:', err);
            alert('فشل الوصول للكاميرا');
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setShowCamera(false);
    };

    const capturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(videoRef.current, 0, 0);

            canvas.toBlob(async (blob) => {
                if (blob) {
                    const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
                    setIsCompressing(true);
                    try {
                        const compressed = await compressImage(file, 150);
                        const newImg = {
                            file: compressed,
                            preview: URL.createObjectURL(compressed),
                        };
                        setImages(prev => [...prev, newImg].slice(0, 4));
                        stopCamera();
                    } catch (err) {
                        console.error('Capture compression failed:', err);
                    } finally {
                        setIsCompressing(false);
                    }
                }
            }, 'image/jpeg', 0.9);
        }
    };

    const handleSave = () => {
        onSave(images);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-[2.5rem] w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b flex items-center justify-between bg-gradient-to-r from-[#01404E] to-[#00A6A6] text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                            <ImageIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black">إرفاق صور</h3>
                            <p className="text-white/60 text-[10px] font-bold">يمكنك رفع حتى 4 صور للعملية</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {showCamera ? (
                        <div className="relative aspect-video bg-black rounded-3xl overflow-hidden shadow-inner group">
                            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4">
                                <button
                                    onClick={capturePhoto}
                                    className="w-16 h-16 rounded-full bg-white border-4 border-[#00A6A6] flex items-center justify-center active:scale-90 transition-transform shadow-xl"
                                >
                                    <div className="w-12 h-12 rounded-full bg-[#00A6A6] border-2 border-white"></div>
                                </button>
                                <button
                                    onClick={stopCamera}
                                    className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center active:scale-90 transition-transform shadow-lg"
                                >
                                    <CameraOff className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {images.map((img, index) => (
                                <div key={index} className="relative aspect-video rounded-3xl overflow-hidden border-2 border-[#01404E]/10 group shadow-sm bg-gray-50">
                                    <img src={img.preview} alt={`preview ${index}`} className="w-full h-full object-contain bg-black/5" />
                                    <button
                                        onClick={() => removeImage(index)}
                                        className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                                        <span className="text-xs text-white font-bold ml-2">صورة {index + 1}</span>
                                        <span className="text-[10px] text-white/80 font-bold">{(img.file.size / 1024).toFixed(0)}KB</span>
                                    </div>
                                </div>
                            ))}

                            {images.length < 4 && (
                                <div className="grid grid-cols-2 gap-4 col-span-1 sm:col-span-1">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isCompressing}
                                        className="aspect-square rounded-3xl border-2 border-dashed border-[#01404E]/20 flex flex-col items-center justify-center gap-2 text-[#01404E]/40 hover:text-[#00A6A6] hover:border-[#00A6A6]/40 hover:bg-[#00A6A6]/5 transition-all group active:scale-95"
                                    >
                                        <ImageIcon className="w-10 h-10 group-hover:scale-110 transition-transform" />
                                        <span className="text-xs font-black">رفع صورة من الجهاز</span>
                                    </button>
                                    <button
                                        onClick={startCamera}
                                        disabled={isCompressing}
                                        className="aspect-square rounded-3xl border-2 border-dashed border-[#01404E]/20 flex flex-col items-center justify-center gap-2 text-[#01404E]/40 hover:text-[#00A6A6] hover:border-[#00A6A6]/40 hover:bg-[#00A6A6]/5 transition-all group active:scale-95"
                                    >
                                        <Camera className="w-10 h-10 group-hover:scale-110 transition-transform" />
                                        <span className="text-xs font-black">كاميرا</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {isCompressing && (
                        <div className="flex items-center justify-center gap-3 p-4 bg-[#00A6A6]/10 rounded-2xl text-[#01404E] animate-pulse">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-xs font-black">جاري معالجة الصور وضغطها...</span>
                        </div>
                    )}

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/*"
                        multiple
                        className="hidden"
                    />
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 flex gap-3">
                    <button
                        onClick={handleSave}
                        disabled={images.length === 0 || isCompressing}
                        className="flex-1 bg-[#01404E] hover:bg-[#00A6A6] text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-[#01404E]/10 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        تأكيد الصور ({images.length})
                    </button>
                    <button
                        onClick={onClose}
                        className="px-8 border border-[#01404E]/10 py-4 rounded-2xl font-black text-sm text-[#01404E] hover:bg-white transition-all active:scale-95"
                    >
                        إلغاء
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AttachmentModal;
