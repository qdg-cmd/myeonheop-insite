import React, { useRef } from 'react';
import { GraduationCap, Key, Plus, Trash2, Users, UploadCloud, ShieldCheck } from 'lucide-react';
import { StudentProfile, ApiKeys } from '../types';

interface HeaderProps {
  students: StudentProfile[];
  currentStudentId: string | null;
  onSelectStudent: (id: string) => void;
  onOpenNewModal: () => void;
  onOpenKeyModal: () => void;
  onClearAllData: () => void;
  onImportBackup: (imported: StudentProfile) => void;
  apiKeys: ApiKeys;
}

export const Header: React.FC<HeaderProps> = ({
  students,
  currentStudentId,
  onSelectStudent,
  onOpenNewModal,
  onOpenKeyModal,
  onClearAllData,
  onImportBackup,
  apiKeys,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasKey = !!(
    (apiKeys.activeProvider === 'gemini' && apiKeys.gemini?.trim()) ||
    (apiKeys.activeProvider === 'openai' && apiKeys.openai?.trim())
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.name || !parsed.questions || !parsed.records) {
          throw new Error('유효하지 않은 백업 파일 형식입니다. (필수 필드 누락)');
        }
        onImportBackup(parsed);
      } catch (err: any) {
        alert(err.message || 'JSON 백업 파일을 불러오는 중 오류가 발생했습니다.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <header className="no-print sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 py-2.5 sm:py-0 sm:h-16 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
        {/* 로고 영역 (모바일에서는 액션 버튼과 1열 배치) */}
        <div className="flex items-center justify-between w-full sm:w-auto gap-1.5 sm:gap-2">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs shadow-blue-500/20 shrink-0">
              <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-extrabold text-slate-900 text-sm sm:text-lg tracking-tight whitespace-nowrap shrink-0">
                  면접인사이트
                </span>
                <span className="hidden min-[400px]:inline-block text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap shrink-0">
                  100% 로컬 보안
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden md:block">학생부 기반 대학별 AI 면접 솔루션</p>
            </div>
          </div>

          {/* 모바일 전용 빠른 액션 버튼군 (sm 미만, 절대 텍스트 줄바꿈 방지) */}
          <div className="flex sm:hidden items-center gap-1 shrink-0">
            {/* 학생부 PDF 마스킹 (모바일 퀵 버튼) */}
            <button
              onClick={() => window.open('https://qdg-cmd.github.io/pdf-masking/', '_blank', 'noopener,noreferrer')}
              className="p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition shadow-2xs shrink-0 whitespace-nowrap cursor-pointer"
              title="학생부 PDF 마스킹"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            </button>

            <button
              onClick={onOpenNewModal}
              className="flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">새 분석</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 text-slate-700 bg-slate-100 border border-slate-200 rounded-xl transition shadow-2xs shrink-0 whitespace-nowrap"
              title="백업 불러오기"
            >
              <UploadCloud className="w-4 h-4 text-slate-500 shrink-0" />
            </button>

            <button
              onClick={onOpenKeyModal}
              className="p-1.5 text-slate-700 bg-slate-100 border border-slate-200 rounded-xl transition relative shrink-0 whitespace-nowrap"
              title="API 키 설정"
            >
              <Key className="w-4 h-4 text-slate-500 shrink-0" />
              {hasKey && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-1 ring-white" />
              )}
            </button>

            {students.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('⚠️ 브라우저에 저장된 모든 학생부 및 면접 데이터를 완전히 삭제하시겠습니까? (삭제 후 복구 불가)')) {
                    onClearAllData();
                  }
                }}
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl transition shrink-0 whitespace-nowrap"
                title="데이터 완전 삭제"
              >
                <Trash2 className="w-4 h-4 shrink-0" />
              </button>
            )}
          </div>
        </div>

        {/* 중앙: 학생 선택 드롭다운 (모바일에서는 전폭, 데스크톱에서는 max-w-xs) */}
        {students.length > 0 && (
          <div className="flex items-center gap-2 w-full sm:max-w-xs">
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
            <select
              value={currentStudentId || ''}
              onChange={(e) => onSelectStudent(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-100 hover:bg-slate-200/70 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition truncate"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.targetUniversity} · {s.targetMajor || '일반'})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 데스크톱/태블릿 액션 버튼군 (sm 이상 화면) */}
        <div className="hidden sm:flex items-center gap-2">
          {/* 학생부 PDF 마스킹 (새 생기부 분석 좌측) */}
          <button
            onClick={() => window.open('https://qdg-cmd.github.io/pdf-masking/', '_blank', 'noopener,noreferrer')}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-xl transition shadow-2xs cursor-pointer"
            title="개인정보 보호를 위한 학생부 PDF 마스킹 시스템 열기"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>PDF 마스킹</span>
          </button>

          {/* 새 학생 추가 */}
          <button
            onClick={onOpenNewModal}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>새 생기부 분석</span>
          </button>

          {/* 저장된 백업 불러오기 */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition shadow-2xs"
            title="저장된 학생 JSON 백업 파일 불러오기"
          >
            <UploadCloud className="w-4 h-4 text-slate-500" />
            <span>불러오기</span>
          </button>

          {/* API 키 설정 */}
          <button
            onClick={onOpenKeyModal}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3 sm:py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition"
            title="AI API 키 설정 (BYOK)"
          >
            <Key className="w-4 h-4 text-slate-500" />
            <span className="hidden md:inline">API 키 설정</span>
            {hasKey ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-400 ring-2 ring-amber-200" title="미입력 (로컬 모드)" />
            )}
          </button>

          {/* 로컬 데이터 완전 삭제 */}
          {students.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('⚠️ 브라우저에 저장된 모든 학생부 및 면접 데이터를 완전히 삭제하시겠습니까? (삭제 후 복구 불가)')) {
                  onClearAllData();
                }
              }}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
              title="개인정보 보호: 로컬 데이터 완전 삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 숨김 파일 인풋 (공통) */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json"
          className="hidden"
        />
      </div>
    </header>
  );
};
