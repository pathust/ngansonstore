import React, { useState } from 'react';
import {
  X,
  Phone,
  MessageSquare,
  HelpCircle,
  ExternalLink,
  Send,
  Headphones,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

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
  const { showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'HOTLINE' | 'FEEDBACK'>(initialTab);
  const [feedbackCategory, setFeedbackCategory] = useState('FEATURE');
  const [feedbackContent, setFeedbackContent] = useState('');
  const [isSent, setIsSent] = useState(false);

  if (!isOpen) return null;

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackContent.trim()) {
      showToast('Vui lòng nhập nội dung góp ý!', 'warning');
      return;
    }
    setIsSent(true);
    showToast('Đã gửi góp ý thành công! Chúng tôi sẽ phản hồi sớm nhất.', 'success');
    setTimeout(() => {
      setIsSent(false);
      setFeedbackContent('');
      onClose();
    }, 1200);
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
              <span className="text-xs text-slate-400 font-medium">Cửa hàng Ngân Sơn - 318 Vũ Quang</span>
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
              {/* Call Hotline 1 */}
              <a
                href="tel:19006522"
                className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-between active:scale-98 transition-transform"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0066FF] text-white flex items-center justify-center shadow-sm">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium block">Tổng đài CSKH KiotViet</span>
                    <span className="text-base font-black text-slate-900 tracking-tight">1900 6522</span>
                  </div>
                </div>
                <span className="px-3 py-1.5 rounded-xl bg-[#0066FF] text-white text-xs font-bold shadow-2xs">
                  Gọi ngay
                </span>
              </a>

              {/* Call Hotline 2: Chi nhánh */}
              <a
                href="tel:0988318234"
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between active:scale-98 transition-transform"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium block">Kỹ thuật viên Chi nhánh Vũ Quang</span>
                    <span className="text-base font-black text-slate-900 tracking-tight">0988 318 234</span>
                  </div>
                </div>
                <span className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-2xs">
                  Gọi ngay
                </span>
              </a>

              {/* Zalo OA */}
              <a
                href="https://zalo.me"
                target="_blank"
                rel="noreferrer"
                className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-center justify-between text-xs text-slate-700 font-medium hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#0068FF] text-white font-black text-xs flex items-center justify-center">
                    Z
                  </div>
                  <span>Nhắn tin Zalo Hỗ trợ trực tuyến (24/7)</span>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </a>

              {/* Help Center */}
              <div className="mt-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs text-slate-600 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <HelpCircle className="w-4 h-4 text-[#0066FF]" />
                  <span>Thời gian phục vụ</span>
                </div>
                <p className="text-slate-500 leading-relaxed">
                  Đội ngũ hỗ trợ kỹ thuật và vận hành sẵn sàng từ 07:00 đến 21:30 tất cả các ngày trong tuần (kể cả Thứ 7, Chủ Nhật và ngày lễ).
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitFeedback} className="flex flex-col gap-3">
              {isSent ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-2" />
                  <span className="font-bold text-sm text-slate-900">Gửi góp ý thành công!</span>
                  <span className="text-xs text-slate-500 mt-1">Cảm ơn bạn đã đóng góp để hoàn thiện phần mềm.</span>
                </div>
              ) : (
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
                    <span>Gửi tin nhắn ngay</span>
                  </button>
                </>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
