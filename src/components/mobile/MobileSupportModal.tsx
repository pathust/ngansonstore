import React, { useState } from 'react';
import {
  X,
  Phone,
  MessageSquare,
  HelpCircle,
  Send,
  Headphones,
} from 'lucide-react';
import { useToast } from '../../context/slices/ToastContext';
import { useStoreSettings } from '../../context/slices/StoreSettingsContext';
import { useUiShell } from '../../context/slices/UiShellContext';

interface MobileSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'HOTLINE' | 'FEEDBACK';
}

export const MobileSupportModal: React.FC<MobileSupportModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'HOTLINE',
}) => {
  const { showToast } = useToast();
  const { storeSettings } = useStoreSettings();
  const { currentBranch } = useUiShell();
  const [activeTab, setActiveTab] = useState<'HOTLINE' | 'FEEDBACK'>(initialTab);
  const [feedbackCategory, setFeedbackCategory] = useState('FEATURE');
  const [feedbackContent, setFeedbackContent] = useState('');
  const supportPhone = currentBranch.phone || storeSettings.phone || '';
  const supportPhoneHref = supportPhone.replace(/[^\d+]/g, '');

  if (!isOpen) return null;

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackContent.trim()) {
      showToast('Vui lòng nhập nội dung góp ý!', 'warning');
      return;
    }
    showToast('Chưa cấu hình kênh nhận góp ý nên nội dung chưa được gửi.', 'info');
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end animate-in fade-in" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-[#0066FF] flex items-center justify-center">
              <Headphones className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Trung tâm Hỗ trợ</h3>
              <span className="text-xs text-slate-400 font-medium">
                Cửa hàng Ngân Sơn - {currentBranch.address || currentBranch.name}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-100 px-5 pt-2">
          <button
            onClick={() => setActiveTab('HOTLINE')}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 text-center transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'HOTLINE'
                ? 'border-[#0066FF] text-[#0066FF]'
                : 'border-transparent text-slate-500'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Gọi hỗ trợ</span>
          </button>
          <button
            onClick={() => setActiveTab('FEEDBACK')}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 text-center transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'FEEDBACK'
                ? 'border-[#0066FF] text-[#0066FF]'
                : 'border-transparent text-slate-500'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Góp ý & Tin nhắn</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'HOTLINE' ? (
            <div className="flex flex-col gap-3">
              {supportPhone ? (
                <a
                  href={`tel:${supportPhoneHref}`}
                  className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-between active:scale-98 transition-transform"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0066FF] text-white flex items-center justify-center shadow-sm">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 font-medium block">Số liên hệ của chi nhánh</span>
                      <span className="text-base font-black text-slate-900 tracking-tight">{supportPhone}</span>
                    </div>
                  </div>
                  <span className="px-3 py-1.5 rounded-xl bg-[#0066FF] text-white text-xs font-bold shadow-2xs">
                    Gọi ngay
                  </span>
                </a>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  Chưa cấu hình số điện thoại hỗ trợ cho chi nhánh này. Có thể bổ sung trong Cài đặt cửa hàng.
                </div>
              )}

              {/* Help Center */}
              <div className="mt-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs text-slate-600 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <HelpCircle className="w-4 h-4 text-[#0066FF]" />
                  <span>Kênh hỗ trợ</span>
                </div>
                <p className="text-slate-500 leading-relaxed">
                  Hiện ứng dụng chỉ sử dụng số liên hệ đã cấu hình của cửa hàng. Chưa có hotline, Zalo OA hoặc lịch trực hỗ trợ riêng được kết nối vào hệ thống.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitFeedback} className="flex flex-col gap-3">
              <>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Loại yêu cầu</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'FEATURE', label: 'Tính năng mới' },
                        { id: 'BUG', label: 'Báo lỗi' },
                        { id: 'OTHER', label: 'Ý kiến khác' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setFeedbackCategory(item.id)}
                          className={`py-2 px-1 rounded-xl text-xs font-bold border transition-colors ${
                            feedbackCategory === item.id
                              ? 'bg-[#EAF2FF] border-[#0066FF] text-[#0066FF]'
                              : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Nội dung góp ý / thắc mắc</label>
                    <textarea
                      rows={4}
                      value={feedbackContent}
                      onChange={(e) => setFeedbackContent(e.target.value)}
                      placeholder="Mô tả chi tiết câu hỏi hoặc tính năng bạn muốn bổ sung..."
                      className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-[#0066FF] resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="mt-2 py-3 rounded-xl bg-[#0066FF] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>Gửi góp ý</span>
                  </button>
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                    Kênh nhận góp ý chưa được kết nối backend; nút gửi sẽ không báo thành công giả.
                  </p>
                </>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
