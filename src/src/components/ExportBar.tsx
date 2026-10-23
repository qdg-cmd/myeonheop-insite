import React from 'react';
import { Printer, Download, FileText, FileCode } from 'lucide-react';
import { StudentProfile } from '../types';
import { generateDocxBlob } from '../lib/docxExport';
import { generateStudentRecordHtml } from '../lib/htmlExport';

interface ExportBarProps {
  profile: StudentProfile;
  activeTab: 'questions' | 'records' | 'mock';
  isStarredTab?: boolean;
}

export const ExportBar: React.FC<ExportBarProps> = ({ profile, activeTab, isStarredTab = false }) => {
  const starredQuestions = (profile.questions || []).filter((q) => q && q.starred);
  const starredCount = starredQuestions.length;

  // 1. A4 워크시트 인쇄
  const handlePrint = () => {
    if (isStarredTab && starredCount === 0) {
      alert('별표(★)로 지정된 핵심 질문이 없습니다. 먼저 질문 목록에서 중요 문항에 별표를 눌러주세요.');
      return;
    }
    window.print();
  };

  // 2. Word (.docx) 다운로드
  const handleExportDocx = () => {
    try {
      if (isStarredTab && starredCount === 0) {
        alert('별표(★)로 지정된 핵심 질문이 없습니다. 먼저 질문 목록에서 중요 문항에 별표를 눌러주세요.');
        return;
      }
      const blob = generateDocxBlob(profile, isStarredTab);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = isStarredTab
        ? `면접질문지_${profile.name}_핵심질문_${profile.targetUniversity || '지원대학'}_${profile.targetMajor || '지원학과'}.docx`
        : `면접질문지_${profile.name}_${profile.targetUniversity || '지원대학'}_${profile.targetMajor || '지원학과'}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Word 문서 생성 중 오류가 발생했습니다.');
      console.error(err);
    }
  };

  // 3. HTML 원문 파일 다운로드 (생기부 원문 탭 전용)
  const handleExportHtml = () => {
    try {
      const htmlContent = generateStudentRecordHtml(profile);
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `생기부원문_${profile.name}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('HTML 파일 생성 중 오류가 발생했습니다.');
      console.error(err);
    }
  };

  // 4. JSON 전체 데이터 백업 다운로드
  const handleExportJson = () => {
    const jsonStr = JSON.stringify(profile, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `면접인사이트_${profile.name}_백업.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="no-print bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
      <div className="text-xs text-slate-500 font-medium hidden sm:block">
        {activeTab === 'records'
          ? '📑 학생부 원문과 형광펜 하이라이트 데이터를 HTML 파일로 저장할 수 있습니다.'
          : isStarredTab
          ? `⭐ 선별된 중요 핵심 질문(${starredCount}개)만 워크시트로 인쇄하거나 Word 파일로 다운로드합니다.`
          : '💾 학생 데이터와 질문 목록을 파일로 보관하거나 인쇄할 수 있습니다.'}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto justify-start sm:justify-end">
        {/* 생기부 원문 탭일 때: HTML 파일 저장 버튼 표시 */}
        {activeTab === 'records' && (
          <button
            onClick={handleExportHtml}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition shadow-2xs whitespace-nowrap"
            title="학생부 원문과 하이라이트가 포함된 HTML 파일 다운로드"
          >
            <FileCode className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
            <span className="whitespace-nowrap">HTML 저장</span>
          </button>
        )}

        {/* 질문지/모의면접 탭일 때: A4 인쇄 및 Word 다운로드 표시 */}
        {activeTab !== 'records' && (
          <>
            <button
              onClick={handlePrint}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-xl transition shadow-2xs whitespace-nowrap ${
                isStarredTab
                  ? 'text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200'
                  : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
              }`}
            >
              <Printer className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isStarredTab ? 'text-amber-600' : 'text-blue-600'}`} />
              <span className="whitespace-nowrap">
                {isStarredTab
                  ? `A4 인쇄 (${starredCount})`
                  : 'A4 인쇄'}
              </span>
            </button>

            <button
              onClick={handleExportDocx}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-xl transition shadow-2xs whitespace-nowrap ${
                isStarredTab
                  ? 'text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200'
                  : 'text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200'
              }`}
              title="질문, 근거, 평가의도, 꼬리질문이 포함된 Word 문서 다운로드"
            >
              <FileText className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isStarredTab ? 'text-amber-600' : 'text-blue-600'}`} />
              <span className="whitespace-nowrap">
                {isStarredTab
                  ? `Word (${starredCount})`
                  : 'Word 다운'}
              </span>
            </button>
          </>
        )}

        {/* JSON 백업 다운로드 (공통) */}
        <button
          onClick={handleExportJson}
          className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition shadow-2xs whitespace-nowrap"
          title="언제든 다시 불러올 수 있는 전체 데이터 JSON 백업"
        >
          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 shrink-0" />
          <span className="whitespace-nowrap">JSON 백업</span>
        </button>
      </div>
    </div>
  );
};
