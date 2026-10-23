import React, { useState } from 'react';
import { Key, ShieldCheck, ExternalLink, X, Check } from 'lucide-react';
import { ApiKeys } from '../types';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKeys: ApiKeys;
  onSave: (keys: ApiKeys) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  apiKeys,
  onSave,
}) => {
  const [keys, setKeys] = useState<ApiKeys>(apiKeys);
  const [savedNotice, setSavedNotice] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(keys);
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">AI API 키 설정 (BYOK)</h3>
              <p className="text-xs text-slate-500">100% 브라우저 로컬 저장 · 외부 유출 없음</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* 보안 알림 */}
          <div className="flex items-start gap-3 p-3.5 bg-blue-50/70 rounded-xl border border-blue-100 text-blue-900 text-xs leading-relaxed">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              입력하신 API 키는 <strong>오직 사용자 본인의 브라우저에만 저장</strong>되며, 분석 시 구글/OpenAI 서버로 직접 안전하게 전송됩니다. 개발사나 제3자 서버로 절대 수집되지 않습니다.
            </div>
          </div>

          {/* 프로바이더 탭 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">활성 AI 엔진 선택</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setKeys({ ...keys, activeProvider: 'gemini' })}
                className={`py-2 px-3 rounded-lg text-sm font-semibold border transition text-center ${
                  keys.activeProvider === 'gemini'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Google Gemini (권장·무료)
              </button>
              <button
                type="button"
                onClick={() => setKeys({ ...keys, activeProvider: 'openai' })}
                className={`py-2 px-3 rounded-lg text-sm font-semibold border transition text-center ${
                  keys.activeProvider === 'openai'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                OpenAI (GPT-4o)
              </button>
            </div>
          </div>

          {/* Gemini 키 입력 */}
          {keys.activeProvider === 'gemini' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Google Gemini API 키 (gemini-flash-lite-latest)</label>
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
                >
                  무료 키 발급받기 <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                type="password"
                placeholder="API 키 입력 (AIzaSy...)"
                value={keys.gemini}
                onChange={(e) => setKeys({ ...keys, gemini: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono transition"
              />
              <p className="text-[11px] text-slate-500">
                * 초고속 저비용 모델(gemini-flash-lite-latest)을 사용하여 질문을 10개씩 묶어 신속하고 안정적으로 분석합니다.
              </p>
            </div>
          )}

          {/* OpenAI 키 입력 */}
          {keys.activeProvider === 'openai' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">OpenAI API 키</label>
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
                >
                  키 관리 페이지 <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                type="password"
                placeholder="API 키 입력 (sk-...)"
                value={keys.openai || ''}
                onChange={(e) => setKeys({ ...keys, openai: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono transition"
              />
            </div>
          )}

          {/* 키 없이 로컬 모드 안내 */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
            💡 <strong>API 키를 입력하지 않아도</strong> 로컬 내장 룰베이스 엔진으로 즉시 테스트 및 질문 생성을 체험할 수 있습니다.
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition flex items-center gap-1.5"
          >
            {savedNotice ? (
              <>
                <Check className="w-4 h-4" /> 저장 완료!
              </>
            ) : (
              '설정 저장'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
