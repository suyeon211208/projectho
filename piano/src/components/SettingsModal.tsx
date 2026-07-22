import React from 'react';
import { X, Keyboard, Smartphone, Zap, Music, Info } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">피아노 사용 방법 및 조작 가이드</h3>
            <p className="text-xs text-slate-400">PC 키보드 및 모바일 터치 연주 팁</p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-slate-300">
          {/* Keyboard mapping guide */}
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
            <h4 className="font-bold text-indigo-300 flex items-center gap-1.5">
              <Keyboard className="w-4 h-4" />
              <span>PC 키보드 연주 방법</span>
            </h4>
            <p className="text-slate-400 leading-relaxed">
              컴퓨터 키보드로 바로 피아노를 연주할 수 있습니다.
            </p>
            <div className="bg-slate-900/80 p-2.5 rounded-lg font-mono text-[11px] space-y-1 border border-slate-700/50">
              <div>• <strong>흰 건반:</strong> A S D F G H J K L ; ' (또는 Z X C V B N M)</div>
              <div>• <strong>검은 건반:</strong> W E T Y U O P (또는 S D G H J)</div>
              <div>• <strong>옥타브 조절:</strong> 좌우 방향키 (← / →)</div>
            </div>
          </div>

          {/* Touch & Mobile guide */}
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
            <h4 className="font-bold text-emerald-300 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4" />
              <span>모바일 터치 및 글리산도 연주</span>
            </h4>
            <p className="text-slate-400 leading-relaxed">
              스마트폰 및 태블릿 모바일 화면에서 동시에 여러 손가락으로 화음을 누르거나, 손가락을 옆으로 쓸어 넘기며 글리산도(Glissando) 연주가 가능합니다.
            </p>
          </div>

          {/* Low latency design */}
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
            <h4 className="font-bold text-amber-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4" />
              <span>초저지연 오디오 합성 설계</span>
            </h4>
            <p className="text-slate-400 leading-relaxed">
              외부 음원 파일 로딩 대기시간 없이 Web Audio API 실시간 가상 음원 합성기를 사용하여 네트워크 지연 없는 즉각적인 키 반응 속도를 제공합니다.
            </p>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};
