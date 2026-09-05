import React, { useState, useRef } from 'react';
import { Camera, Upload, Trash2, Link, Loader2, User } from 'lucide-react';
import { compressAndCropAvatar } from '../../utils/imageHelper';

interface AvatarUploaderProps {
  currentAvatar?: string;
  userName?: string;
  onAvatarChange: (newAvatarUrlOrBase64: string) => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  editable?: boolean;
  className?: string;
}

export const AvatarUploader: React.FC<AvatarUploaderProps> = ({
  currentAvatar,
  userName = 'Người dùng',
  onAvatarChange,
  size = 'md',
  editable = true,
  className = '',
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'w-12 h-12 text-sm',
    md: 'w-16 h-16 text-base',
    lg: 'w-20 h-20 text-lg',
    xl: 'w-24 h-24 text-xl',
  }[size];

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6',
  }[size];

  const getInitials = (name: string) => {
    if (!name) return 'NS';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage('');

    try {
      // Compress and crop to 256x256 square WebP/JPEG
      const base64Avatar = await compressAndCropAvatar(file, 256, 0.85);
      onAvatarChange(base64Avatar);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Không thể xử lý tệp ảnh!');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleTriggerUpload = () => {
    if (!editable || isProcessing) return;
    fileInputRef.current?.click();
  };

  const handleApplyUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = urlInputValue.trim();
    if (cleanUrl) {
      onAvatarChange(cleanUrl);
      setShowUrlInput(false);
      setUrlInputValue('');
    }
  };

  const handleRemoveAvatar = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAvatarChange('');
  };

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {/* Avatar Container */}
      <div className="relative group select-none">
        <div
          onClick={handleTriggerUpload}
          className={`${sizeClasses} rounded-2xl overflow-hidden border-2 border-white shadow-md bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 flex items-center justify-center text-white font-black relative ${
            editable ? 'cursor-pointer hover:ring-3 hover:ring-blue-400/50 active:scale-95 transition-all' : ''
          }`}
          title={editable ? 'Nhấn để thay đổi ảnh đại diện' : userName}
        >
          {currentAvatar ? (
            <img
              src={currentAvatar}
              alt={userName}
              className="w-full h-full object-cover"
              onError={(e) => {
                // If image fails to load, fallback to initials
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center tracking-wider">
              {getInitials(userName)}
            </div>
          )}

          {/* Processing Loading Spinner */}
          {isProcessing && (
            <div className="absolute inset-0 bg-slate-900/70 flex flex-col items-center justify-center text-white backdrop-blur-xs">
              <Loader2 className="w-5 h-5 animate-spin text-white" />
              <span className="text-[9px] font-bold mt-1">Đang nén...</span>
            </div>
          )}

          {/* Hover Camera Overlay on Desktop */}
          {editable && !isProcessing && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              <Camera className={iconSizes} />
            </div>
          )}
        </div>

        {/* Action Badge - Bottom Right Camera Button */}
        {editable && (
          <button
            type="button"
            onClick={handleTriggerUpload}
            disabled={isProcessing}
            className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md border-2 border-white transition-all active:scale-90 cursor-pointer"
            title="Đổi ảnh đại diện (Chụp ảnh hoặc tải tệp)"
            aria-label="Tải ảnh đại diện"
          >
            <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        )}

        {/* Invisible Native File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={handleFileSelect}
          className="hidden"
          aria-hidden="true"
        />
      </div>

      {/* Auxiliary Controls (URL input & Remove) */}
      {editable && (
        <div className="flex items-center gap-2 text-[11px]">
          <button
            type="button"
            onClick={handleTriggerUpload}
            className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
          >
            <Upload className="w-3 h-3" />
            <span>Tải ảnh lên</span>
          </button>

          <span className="text-slate-300">|</span>

          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 hover:underline cursor-pointer"
          >
            <Link className="w-3 h-3" />
            <span>Link URL</span>
          </button>

          {currentAvatar && (
            <>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="text-rose-600 hover:text-rose-800 font-medium flex items-center gap-1 hover:underline cursor-pointer"
                title="Quay về avatar chữ cái mặc định"
              >
                <Trash2 className="w-3 h-3" />
                <span>Mặc định</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Direct Image URL input modal/box */}
      {showUrlInput && (
        <form onSubmit={handleApplyUrl} className="flex items-center gap-1.5 w-full max-w-xs mt-1 animate-in fade-in">
          <input
            type="url"
            value={urlInputValue}
            onChange={(e) => setUrlInputValue(e.target.value)}
            placeholder="Dán link ảnh (https://...)"
            className="flex-1 px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            autoFocus
          />
          <button
            type="submit"
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
          >
            Áp dụng
          </button>
          <button
            type="button"
            onClick={() => setShowUrlInput(false)}
            className="px-2 py-1 text-slate-500 hover:text-slate-700 text-xs cursor-pointer"
          >
            Đóng
          </button>
        </form>
      )}

      {/* Error notification */}
      {errorMessage && (
        <p className="text-[11px] text-rose-600 font-medium text-center max-w-xs animate-in fade-in">
          {errorMessage}
        </p>
      )}
    </div>
  );
};
