import { StudentProfile } from '../types';

/**
 * '3604 김나현 원문.html'과 동일한 규격의 고품질 반응형 HTML 생기부 원문 파일 생성
 */
export function generateStudentRecordHtml(profile: StudentProfile): string {
  const records = profile.records || [];

  // 학년별 정렬 및 그룹화 (1학년 -> 2학년 -> 3학년 -> 공통)
  const gradeOrder = ['1학년', '2학년', '3학년', '공통'];
  const sortedRecords = [...records].sort((a, b) => {
    const aGradeIdx = gradeOrder.indexOf(a.grade);
    const bGradeIdx = gradeOrder.indexOf(b.grade);
    const aOrder = aGradeIdx !== -1 ? aGradeIdx : 99;
    const bOrder = bGradeIdx !== -1 ? bGradeIdx : 99;
    return aOrder - bOrder;
  });

  const tableRows = sortedRecords
    .map((r) => {
      // 텍스트에 이미 highlight 태그가 있는지 확인
      let displayText = r.text;
      const hls = r.highlights || r.highlightSpans || [];
      if (!displayText.includes('highlight') && hls.length > 0) {
        hls.forEach((hl: string) => {
          if (hl && hl.trim()) {
            displayText = displayText.split(hl).join(`<mark class="highlight">${hl}</mark>`);
          }
        });
      }

      const gradeId = r.grade ? r.grade.replace(/\s+/g, '') : '공통';

      return `
        <tr class="mobile-card-row hover:bg-slate-50 transition border-b border-gray-200 block md:table-row py-3 md:py-0" data-grade="${gradeId}">
          <td class="mobile-card-cell py-3.5 px-4 text-xs font-bold text-gray-500 whitespace-nowrap align-top md:border-r md:border-gray-100">
            <span class="md:hidden font-semibold text-gray-400 mr-2">[학년]</span>
            <span class="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-bold">${r.grade || '공통'}</span>
          </td>
          <td class="mobile-card-cell py-3.5 px-4 text-xs font-bold text-gray-800 whitespace-nowrap align-top md:border-r md:border-gray-100">
            <span class="md:hidden font-semibold text-gray-400 mr-2">[영역/과목]</span>
            <span class="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">${r.subject || r.type}</span>
          </td>
          <td class="mobile-card-cell py-3.5 px-4 text-xs text-gray-700 leading-relaxed align-top">
            <div class="whitespace-pre-wrap">${displayText}</div>
          </td>
        </tr>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>생기부 원문 분류 - ${profile.name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;600;700;800&display=swap" rel="stylesheet">
    <style>
        * { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif; }
        body { background-color: #F8FAFC; color: #1E293B; }
        .highlight, mark { 
            background-color: #FEF08A !important; 
            color: #854D0E !important; 
            padding: 1px 4px; 
            border-radius: 4px; 
            font-weight: 600; 
        }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        @media print {
            body { background-color: #fff !important; }
            header, #grade-nav, .btn-print { display: none !important; }
            main { padding: 0 !important; margin: 0 !important; max-width: 100% !important; }
            .mobile-card-wrapper { display: table !important; width: 100%; border-collapse: collapse; }
            .mobile-card-row { display: table-row !important; page-break-inside: avoid; break-inside: avoid; }
            .mobile-card-cell { display: table-cell !important; padding: 10px; border: 1px solid #e2e8f0; page-break-inside: avoid; break-inside: avoid; }
            th { display: table-cell !important; background-color: #f1f5f9; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .highlight, mark { background-color: #FEF08A !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
    </style>
</head>
<body class="antialiased min-h-screen flex flex-col">

    <header class="bg-white shadow-xs sticky top-0 z-50 flex flex-col border-b border-gray-200">
        <div class="w-full max-w-screen-xl mx-auto px-4 md:px-6 py-3 md:py-4 flex justify-between items-center">
            <div class="flex-1 min-w-0">
                <h1 class="text-lg md:text-2xl font-black text-gray-900 flex items-center gap-2 truncate">
                    <span class="w-3 h-3 rounded-full bg-blue-600 flex-shrink-0"></span>
                    생기부 원문 분류
                </h1>
                <p class="text-xs md:text-sm text-gray-500 mt-1 truncate">
                    학생: <span class="font-bold text-gray-800">${profile.name}</span> | 
                    지원: <span class="text-blue-700 font-semibold">${profile.targetUniversity} ${profile.targetMajor}</span> | 
                    총 ${records.length}개 세특·창체 항목 (100% 무결성 원문 데이터)
                </p>
            </div>
            <div class="ml-4 flex-shrink-0 hidden md:block">
                <button onclick="window.print()" class="btn-print px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5">
                    🖨️ PDF 저장 / 인쇄
                </button>
            </div>
        </div>
        <nav id="grade-nav" class="w-full bg-slate-50 border-t border-gray-200 overflow-x-auto">
            <div class="max-w-screen-xl mx-auto px-4 py-2 flex gap-1.5 sm:justify-start">
                <button onclick="filterGrade('all')" class="px-3.5 py-1 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition whitespace-nowrap shadow-xs">전체보기 (${records.length})</button>
                <button onclick="filterGrade('1학년')" class="px-3.5 py-1 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition whitespace-nowrap shadow-xs">1학년</button>
                <button onclick="filterGrade('2학년')" class="px-3.5 py-1 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition whitespace-nowrap shadow-xs">2학년</button>
                <button onclick="filterGrade('3학년')" class="px-3.5 py-1 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition whitespace-nowrap shadow-xs">3학년</button>
            </div>
        </nav>
    </header>

    <main class="flex-1 w-full max-w-screen-xl mx-auto p-3 md:p-6">
        <div class="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden w-full">
            <table class="w-full text-left border-collapse mobile-card-wrapper block md:table">
                <thead class="hidden md:table-header-group">
                    <tr class="bg-slate-50 border-b border-gray-200 text-gray-600 text-xs font-bold uppercase tracking-wider">
                        <th class="py-3 px-4 w-24">학년</th>
                        <th class="py-3 px-4 w-44">영역 / 과목</th>
                        <th class="py-3 px-4">학생부 원문 내용 (형광펜 하이라이트)</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 block md:table-row-group" id="records-tbody">
                    ${tableRows}
                </tbody>
            </table>
        </div>
    </main>

    <footer class="mt-8 text-center text-xs text-gray-400 pb-6 border-t border-gray-200 pt-4">
        면접인사이트 · 학생부 기반 대학별 AI 면접 솔루션
    </footer>

    <script>
        function filterGrade(grade) {
            const rows = document.querySelectorAll('#records-tbody tr');
            rows.forEach(row => {
                if (grade === 'all' || row.getAttribute('data-grade') === grade) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        }
    </script>
</body>
</html>`;
}
