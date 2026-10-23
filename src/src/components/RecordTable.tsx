import React, { useState } from 'react';
import { StudentRecordItem } from '../types';
import { Tag, BookOpen, Layers } from 'lucide-react';

interface RecordTableProps {
  records: StudentRecordItem[];
  studentName: string;
  onSelectSubjectForQuestions?: (subject: string) => void;
}

export const RecordTable: React.FC<RecordTableProps> = ({
  records,
  studentName,
  onSelectSubjectForQuestions,
}) => {
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredRecords = records.filter((r) => {
    if (!r) return false;
    const matchesGrade = selectedGrade === 'all' || r.grade === selectedGrade;
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      term === '' ||
      (typeof r.subject === 'string' && r.subject.toLowerCase().includes(term)) ||
      (typeof r.text === 'string' && r.text.toLowerCase().includes(term)) ||
      (Array.isArray(r.tags) &&
        r.tags.some((t) => typeof t === 'string' && t.toLowerCase().includes(term)));
    return matchesGrade && matchesSearch;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* 헤더 및 필터 툴바 */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 shrink-0">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 shrink-0" />
            <h3 className="font-bold text-slate-800 text-sm sm:text-base whitespace-nowrap shrink-0">
              <span className="sm:hidden">생기부 원문 분석</span>
              <span className="hidden sm:inline">생기부 원문 기록 & 역량 분석</span>
            </h3>
          </div>
          <span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold whitespace-nowrap shrink-0">
            총 {filteredRecords.length}개
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* 학년 탭 */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 text-xs font-semibold shadow-2xs overflow-x-auto">
            {['all', '1학년', '2학년', '3학년'].map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGrade(g)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition whitespace-nowrap shrink-0 ${
                  selectedGrade === g
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="whitespace-nowrap">{g === 'all' ? '전체' : g}</span>
              </button>
            ))}
          </div>

          {/* 검색창 */}
          <input
            type="text"
            placeholder="과목, 키워드 검색…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 flex-1 sm:flex-initial sm:w-44"
          />
        </div>
      </div>

      {/* 테이블 (모바일 가로 스크롤 보장) */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[550px] md:min-w-full">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
              <th className="px-4 py-3.5 w-20 text-center border-r border-slate-200">학년</th>
              <th className="px-4 py-3.5 w-44 border-r border-slate-200">영역 / 과목</th>
              <th className="px-4 py-3.5">기록 원문 & AI 분석 (형광펜 및 핵심 역량)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filteredRecords.map((item, idx) => (
              <tr
                key={item.id || idx}
                className="hover:bg-slate-50/60 transition group"
              >
                {/* 학년 */}
                <td className="px-4 py-4 text-center font-bold text-slate-700 align-top border-r border-slate-100 bg-slate-50/30">
                  <span className="text-xs">{item.grade}</span>
                </td>

                {/* 영역 및 과목 */}
                <td className="px-4 py-4 align-top border-r border-slate-100">
                  <div className="font-bold text-blue-700 text-xs mb-1 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-blue-500" />
                    {item.type}
                  </div>
                  <div className="font-semibold text-slate-800 text-xs bg-slate-100 px-2 py-0.5 rounded-md inline-block">
                    {item.subject}
                  </div>
                </td>

                {/* 본문 및 태그 */}
                <td className="px-4 py-4 text-slate-800 leading-relaxed text-xs sm:text-sm break-keep align-top">
                  {/* HTML 형광펜 렌더링 */}
                  <div
                    className="student-record-content"
                    dangerouslySetInnerHTML={{ __html: item.text }}
                  />

                  {/* AI 추출 역량 태그 */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
                        <Tag className="w-3 h-3" /> 핵심 역량:
                      </span>
                      {item.tags.map((t, tIdx) => (
                        <span
                          key={tIdx}
                          className="bg-slate-100 text-slate-700 border border-slate-200 text-[11px] px-2 py-0.5 rounded-md font-semibold"
                        >
                          {t}
                        </span>
                      ))}

                      {onSelectSubjectForQuestions && (
                        <button
                          onClick={() => onSelectSubjectForQuestions(item.subject)}
                          className="ml-auto text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          이 과목 예상 질문 보기 →
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredRecords.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-xs">
            일치하는 학생부 기록이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};
