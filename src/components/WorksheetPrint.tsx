import React from 'react';
import { StudentProfile } from '../types';

interface WorksheetPrintProps {
  profile: StudentProfile;
  starredOnly?: boolean;
}

export const WorksheetPrint: React.FC<WorksheetPrintProps> = ({ profile, starredOnly = false }) => {
  const currentDate = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const questionsToPrint = starredOnly
    ? profile.questions.filter((q) => q && q.starred)
    : profile.questions;

  return (
    <div className="print-only p-8 text-black bg-white max-w-4xl mx-auto text-sm">
      {/* 워크시트 헤더 */}
      <div className="border-b-2 border-black pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              {starredOnly
                ? '면접인사이트 · 학생부 기반 모의면접 워크시트 (★ 핵심 질문 엄선집)'
                : '면접인사이트 · 학생부 기반 모의면접 워크시트'}
            </h1>
            <p className="text-xs text-gray-600 mt-1">
              {starredOnly
                ? `선별된 중요 핵심 면접 문항 총 ${questionsToPrint.length}제 집중 대비 워크시트`
                : '학생부 종합전형 / 심층 구술면접 실전 대비 문제지'}
            </p>
          </div>
          <div className="text-right text-xs">
            <span className="font-bold border border-black px-2 py-1 rounded">
              {starredOnly ? '★ 핵심 질문지' : '실전 워크시트'}
            </span>
            <p className="text-gray-500 mt-1">출력일자: {currentDate}</p>
          </div>
        </div>

        {/* 수험생 기본 정보 표 */}
        <table className="w-full mt-4 border border-black text-xs">
          <tbody>
            <tr className="border-b border-black">
              <th className="w-20 bg-gray-100 p-2 font-bold text-center border-r border-black">수험생</th>
              <td className="p-2 border-r border-black">{profile.name}</td>
              <th className="w-24 bg-gray-100 p-2 font-bold text-center border-r border-black">지원 대학</th>
              <td className="p-2">{profile.targetUniversity}</td>
            </tr>
            <tr>
              <th className="bg-gray-100 p-2 font-bold text-center border-r border-black">지원 학과</th>
              <td className="p-2 border-r border-black">{profile.targetMajor}</td>
              <th className="bg-gray-100 p-2 font-bold text-center border-r border-black">전형 유형</th>
              <td className="p-2">{profile.interviewType}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 안내 문구 */}
      <div className="mb-6 p-3 bg-gray-50 border border-gray-300 text-xs text-gray-700 leading-relaxed">
        * 본 워크시트는 제출된 학생부 원문의 핵심 탐구 문장과 지원 대학의 평가 기준을 바탕으로 추출된 종합 면접 분석지입니다.<br />
        * 각 문항의 '생기부 근거', '평가 의도', '답변 포인트', '꼬리 질문', '압박 방어 팁' 등 모든 세부 정보를 종합 검토하여 실전에 대비하십시오.
      </div>

      {/* 질문 목록 */}
      <div className="space-y-4">
        {questionsToPrint.map((q, idx) => (
          <div
            key={q.id}
            className="print-card break-inside-avoid border border-gray-400 p-4 rounded-md space-y-3 bg-white"
            style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
          >
            <div className="flex items-center justify-between border-b border-gray-300 pb-2">
              <span className="font-black text-base text-gray-900 flex items-center gap-1.5">
                {q.starred && <span className="text-amber-600 font-black">★ [핵심]</span>}
                문항 {idx + 1}.
              </span>
              <div className="text-xs space-x-1.5 flex items-center">
                {q.subject && (
                  <span className="font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded border border-gray-300">
                    {q.grade ? `${q.grade} ` : ''}{q.subject}
                  </span>
                )}
                <span className="border border-gray-400 px-2 py-0.5 rounded text-[11px] font-bold bg-gray-50">
                  {q.competency === 'academic' ? '학업역량' : q.competency === 'career' ? '진로역량' : q.competency === 'community' ? '공동체역량' : '대학맞춤'}
                </span>
                <span className="border border-gray-300 px-2 py-0.5 rounded text-[11px] text-gray-600 bg-gray-50">
                  {q.type === 'deep' ? '심화 연계' : q.type === 'pressure' ? '약점 방어·압박' : '기록 진위 확인'}
                </span>
              </div>
            </div>

            {/* 질문 본문 */}
            <h3 className="font-bold text-sm sm:text-base leading-snug text-gray-900">
              Q: {q.question}
            </h3>

            {/* 생기부 근거 원문 */}
            {q.highlightText && (
              <div className="text-xs text-amber-950 bg-amber-50/60 p-2.5 rounded border border-amber-200/70 leading-relaxed">
                <span className="font-bold text-amber-900 block mb-0.5">■ 생기부 근거 원문:</span>
                "{q.highlightText}"
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-xs pt-1">
              {/* 좌측: 평가 의도, 답변 포인트, 꼬리 질문, 압박 방어 */}
              <div className="space-y-2.5 border-r border-gray-300 pr-3">
                {/* 평가 의도 */}
                <div>
                  <span className="font-bold text-gray-800 block mb-0.5">■ 면접관 평가 의도:</span>
                  <p className="text-gray-700 leading-relaxed bg-gray-50 p-2 rounded border border-gray-200">
                    {q.intent}
                  </p>
                </div>

                {/* 모범 답변 핵심 키워드 & 포인트 */}
                {q.points && q.points.length > 0 && (
                  <div>
                    <span className="font-bold text-gray-800 block mb-0.5">■ 필수 답변 키워드 & 포인트:</span>
                    <ul className="list-disc list-inside text-gray-700 space-y-0.5 pl-1 leading-relaxed">
                      {q.points.map((pt, pIdx) => (
                        <li key={pIdx}>{pt}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 이어질 수 있는 추가 꼬리 질문 (전체 출력) */}
                {q.followUps && q.followUps.length > 0 && (
                  <div>
                    <span className="font-bold text-gray-800 block mb-0.5">■ 예상 심층 꼬리 질문 ({q.followUps.length}개):</span>
                    <div className="space-y-1 pl-1">
                      {q.followUps.map((fu, fIdx) => (
                        <p key={fIdx} className="text-gray-700 leading-relaxed">
                          <span className="font-semibold text-purple-800">꼬리 #{fIdx + 1}:</span> {fu}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* 압박 방어 가이드 */}
                {q.defense && (
                  <div className="bg-rose-50/60 border border-rose-200 p-2 rounded">
                    <span className="font-bold text-rose-900 block mb-0.5">■ 압박 방어 가이드:</span>
                    <p className="text-rose-800 leading-relaxed">{q.defense}</p>
                  </div>
                )}
              </div>

              {/* 우측: 나의 답변 구상 및 키포인트 메모 */}
              <div className="flex flex-col justify-between space-y-1">
                <div>
                  <span className="font-bold text-gray-800 block mb-1">■ 나의 답변 구상 (두괄식 키워드 메모):</span>
                  {q.userNotes ? (
                    <div className="border border-gray-300 bg-gray-50/50 p-2.5 rounded text-xs text-gray-800 whitespace-pre-wrap leading-relaxed min-h-32">
                      {q.userNotes}
                    </div>
                  ) : (
                    <div className="border border-dashed border-gray-400 h-36 p-2 rounded text-[11px] text-gray-400 flex flex-col justify-between">
                      <p>(여기에 자필로 두괄식 결론, 핵심 사례, 키워드를 정리하세요)</p>
                      <div className="border-b border-gray-200 my-1"></div>
                      <div className="border-b border-gray-200 my-1"></div>
                      <div className="border-b border-gray-200 my-1"></div>
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-gray-400 text-right">
                  {q.completed ? '✓ 면접 연습 완료' : '□ 연습 대기'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center text-xs text-gray-400 border-t border-gray-200 pt-4">
        면접인사이트 (Interview Insight) · 개인정보 보호를 위해 로컬에서만 생성된 문서입니다.
      </div>
    </div>
  );
};
