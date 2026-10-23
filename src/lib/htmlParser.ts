import { StudentRecordItem } from '../types';

/**
 * 사용자 커스텀 생기부 원문 HTML 파서
 */
export function parseCustomStudentRecordHtml(htmlContent: string): {
  studentName: string;
  records: StudentRecordItem[];
} {
  // 1. 학생 이름 추출 시도
  let studentName = '학생A';
  const nameMatch = htmlContent.match(/학생:\s*([^<\r\n()]+)/i) || htmlContent.match(/<title>[^<]*?-\s*([^<\r\n]+)<\/title>/i);
  if (nameMatch && nameMatch[1].trim()) {
    studentName = nameMatch[1].trim();
  }

  // 2. 스크립트 내부 rawData 추출 시도
  const scriptRegex = /const\s+rawData\s*=\s*(\[[\s\S]*?\])\s*;\s*(?:const|let|var|document|function)/;
  const match = htmlContent.match(scriptRegex);
  if (match && match[1]) {
    try {
      // Function 생성기를 이용한 안전한 JS 배열 평가 (클라이언트 샌드박스)
      const parseArray = new Function(`"use strict"; return (${match[1]});`);
      const rawData = parseArray() as Array<{
        grade: string;
        type: string;
        subject: string;
        text: string;
        tags: string[];
      }>;

      if (Array.isArray(rawData) && rawData.length > 0) {
        const records: StudentRecordItem[] = rawData.map((item, idx) => {
          // 형광펜 문장 추출
          const highlightSpans: string[] = [];
          const spanMatches = [...item.text.matchAll(/<span\s+class=['"]highlight['"]>([\s\S]*?)<\/span>/gi)];
          for (const sm of spanMatches) {
            highlightSpans.push(sm[1].trim());
          }

          return {
            id: `rec-${idx + 1}`,
            grade: item.grade || '1학년',
            type: item.type || '교과학습발달',
            subject: item.subject || '일반',
            text: item.text,
            tags: Array.isArray(item.tags) ? item.tags : [],
            highlightSpans,
          };
        });

        return { studentName, records };
      }
    } catch (e) {
      console.warn('Script rawData parsing failed, falling back to DOM parsing', e);
    }
  }

  // 3. 스크립트가 없거나 실패한 경우 DOM 기반 파싱
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const records: StudentRecordItem[] = [];

  const rows = doc.querySelectorAll('tbody tr, .mobile-card-row');
  let currentGrade = '1학년';

  rows.forEach((row, idx) => {
    // 학년 구분 행 체크
    const textContent = row.textContent || '';
    if (textContent.includes('학년 원문 기록') || row.id?.startsWith('grade-')) {
      const gMatch = textContent.match(/([123]학년)/);
      if (gMatch) currentGrade = gMatch[1];
      return;
    }

    const cells = row.querySelectorAll('td');
    if (cells.length >= 3) {
      const grade = cells[0].textContent?.replace(/학년/g, '').trim() ? `${cells[0].textContent.replace(/\D/g, '')}학년` : currentGrade;
      const typeEl = cells[1].querySelector('.font-bold');
      const subjectEl = cells[1].querySelector('.bg-gray-100, .bg-slate-100');
      
      const type = typeEl?.textContent?.trim() || cells[1].textContent?.split('\n')[0]?.trim() || '교과학습발달';
      const subject = subjectEl?.textContent?.trim() || '일반';

      const textCell = cells[2];
      const htmlText = textCell.innerHTML;

      // 태그 추출
      const tagEls = textCell.querySelectorAll('span');
      const tags: string[] = [];
      const highlightSpans: string[] = [];

      tagEls.forEach(span => {
        if (span.classList.contains('highlight')) {
          highlightSpans.push(span.textContent?.trim() || '');
        } else if (!span.textContent?.includes('핵심 역량') && span.textContent?.trim()) {
          tags.push(span.textContent.trim());
        }
      });

      records.push({
        id: `rec-${idx + 1}`,
        grade,
        type,
        subject,
        text: htmlText,
        tags,
        highlightSpans,
      });
    }
  });

  return { studentName, records };
}
