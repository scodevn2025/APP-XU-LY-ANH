import React from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { InfoIcon } from './icons/InfoIcon';

interface CloudinarySetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudinarySetupModal: React.FC<CloudinarySetupModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-lg border border-gray-700 animate-fade-in-down"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <InfoIcon />
            <h2 className="text-lg font-semibold text-white">Lỗi Cấu hình Cloudinary</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
            aria-label="Đóng"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="p-6 text-gray-300 space-y-4 text-sm">
            <p>
                Không thể tải ảnh lên do chưa thiết lập <strong>"Upload Preset"</strong> trên Cloudinary. Đây là một bước cần thiết để lưu trữ ảnh an toàn mà không cần lộ API Secret của bạn.
            </p>
            <p>Vui lòng làm theo các bước sau:</p>
            <ol className="list-decimal list-inside space-y-2 bg-gray-900/50 p-4 rounded-md border border-gray-700">
                <li>Đăng nhập vào tài khoản Cloudinary của bạn (Cloud Name: <code className="bg-gray-700 px-1 py-0.5 rounded">djsbie5y1</code>).</li>
                <li>Đi đến <span className="font-semibold">Settings</span> (biểu tượng bánh răng) &rarr; <span className="font-semibold">Upload</span>.</li>
                <li>Cuộn xuống phần <span className="font-semibold">Upload presets</span> và nhấn <span className="font-semibold">Add upload preset</span>.</li>
                <li>Trong mục <span className="font-semibold">Signing Mode</span>, chọn <span className="font-semibold text-green-400">Unsigned</span>.</li>
                <li>Nhập chính xác <code className="bg-gray-700 px-1 py-0.5 rounded text-yellow-300">ai_character_studio</code> vào ô <strong>Upload preset name</strong>.</li>
                <li>Nhấn <span className="font-semibold">Save</span> ở dưới cùng.</li>
            </ol>
            <p>
                Sau khi lưu, hãy đóng cửa sổ này và thử lại thao tác trong ứng dụng.
            </p>
             <div className="flex justify-end">
                <button
                    onClick={onClose}
                    className="mt-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                    Đã hiểu
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};