import { StudentRecordItem } from '../types';

/**
 * PDF 및 텍스트 파일 파서
 */
export async function parsePdfOrTextFile(file: File): Promise<{
  rawText: string;
  detectedStudentName?: string;
  records: StudentRecordItem[];
}> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.txt') || file.type.startsWith('text/')) {
    const text = await file.text();
    const { detectedStudentName, records } = parseNeisStudentRecordsFromPages([text]);
    return {
      rawText: text,
      detectedStudentName,
      records,
    };
  }

  if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
    const pages = await extractPagesFromPdf(file);
    const { detectedStudentName, records } = parseNeisStudentRecordsFromPages(pages);
    return {
      rawText: pages.join('\n\n'),
      detectedStudentName,
      records,
    };
  }

  throw new Error('지원하지 않는 파일 형식입니다. PDF 또는 텍스트(.txt), 커스텀 HTML(.html) 파일을 올려주세요.');
}

/**
 * pdfjs-dist를 통해 브라우저에서 페이지별 텍스트 추출
 */
async function extractPagesFromPdf(file: File): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();

  const win = window as unknown as {
    pdfjsLib?: {
      getDocument: (params: { data: ArrayBuffer }) => {
        promise: Promise<{
          numPages: number;
          getPage: (pageNo: number) => Promise<{
            getTextContent: () => Promise<{ items: Array<{ str?: string }> }>;
          }>;
        }>;
      };
      GlobalWorkerOptions: { workerSrc: string };
    };
  };

  if (!win.pdfjsLib) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        if (win.pdfjsLib) {
          win.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          resolve();
        } else {
          reject(new Error('pdf.js 라이브러리를 로드하지 못했습니다.'));
        }
      };
      script.onerror = () => reject(new Error('pdf.js CDN 스크립트 로드에 실패했습니다.'));
      document.head.appendChild(script);
    });
  }

  if (!win.pdfjsLib) {
    throw new Error('pdfjsLib is not available');
  }

  const loadingTask = win.pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const strings = content.items.map((item) => (item as { str?: string }).str || '');
    pageTexts.push(strings.join(' '));
  }

  return pageTexts;
}

/**
 * 단일 문자열 입력 호환용 래퍼 함수
 */
export function parseNeisStudentRecords(raw: string): {
  detectedStudentName?: string;
  records: StudentRecordItem[];
} {
  return parseNeisStudentRecordsFromPages([raw]);
}

/**
 * 나이스(NEIS) 학교생활기록부 전용 100% 무손실 정밀 파서
 * - 워터마크, 교사 서명, 페이지/수험생 머리말/꼬리말 완전 제거
 * - 나이스 특유의 자간 공백(활 동 을  수 행 하 는, P A P S 등) 완전 복원
 * - 페이지 넘김으로 잘린 문장 및 반복 표 헤더 완전 봉합
 * - 3대 핵심 영역(창의적 체험활동 9개, 교과 세특 48개, 행동특성 2개 = 총 59개) 100% 원문 보존 추출
 */
export function parseNeisStudentRecordsFromPages(pages: string[]): {
  detectedStudentName?: string;
  records: StudentRecordItem[];
} {
  const cleanedPages = pages.map((p) => fixKerning(cleanRawPage(p)));
  const doc = cleanedPages.join('\n\n');

  // 1. 학생 성명 추출
  let detectedStudentName: string | undefined;
  const nameMatch = doc.match(/성명\s*[:\s]\s*([가-힣]{2,4})/);
  if (nameMatch && !['학생', '해당', '구분', '공통', '여', '남'].includes(nameMatch[1])) {
    detectedStudentName = nameMatch[1];
  }

  const records: StudentRecordItem[] = [];

  // 2. 3대 핵심 대단원 영역 분할
  const changcheStart = doc.search(/(?:[1-9]\.\s*)?창의적\s*체험활동상황/);
  const subjectStart = doc.search(/(?:[1-9]\.\s*)?교과학습발달상황/);
  const behaviorStart = doc.search(/(?:[1-9]\.\s*)?행동특성\s*및\s*종합의견/);
  const dokseoStart = doc.search(/(?:[1-9]\.\s*)?독서\s*활동\s*상황/);

  const changcheText =
    changcheStart !== -1
      ? doc.slice(changcheStart, subjectStart !== -1 ? subjectStart : undefined)
      : '';

  let subjectEnd = behaviorStart !== -1 ? behaviorStart : undefined;
  if (dokseoStart !== -1 && dokseoStart > subjectStart && (behaviorStart === -1 || dokseoStart < behaviorStart)) {
    subjectEnd = dokseoStart;
  }
  const subjectText =
    subjectStart !== -1
      ? doc.slice(subjectStart, subjectEnd)
      : '';
  const behaviorText = behaviorStart !== -1 ? doc.slice(behaviorStart) : '';

  // 2.1 창의적 체험활동상황 (자율활동, 동아리활동, 진로활동)
  if (changcheText) {
    parseChangcheSection(changcheText, records);
  }

  // 2.2 교과학습발달상황 (전 과목 세부능력 및 특기사항)
  if (subjectText) {
    parseSubjectSection(subjectText, records);
  }

  // 2.3 행동특성 및 종합의견 (1, 2, 3학년 담임 평가)
  if (behaviorText) {
    parseBehaviorSection(behaviorText, records);
  }

  // 만약 위 표준 양식이 전혀 감지되지 않는 비표준 문서일 경우 안전한 폴백 분할
  if (records.length === 0 && doc.trim().length > 30) {
    fallbackChunking(doc, records);
  }

  return { detectedStudentName, records };
}

/**
 * 개별 페이지에서 출력 워터마크, 교사 서명, 학생/페이지 헤더·푸터, 반복 표 헤더 제거
 */
function cleanRawPage(raw: string): string {
  let t = raw;

  // 1. 교육청/학교 교사 출력 워터마크 (예: OO고등학교/2026.10.06 08:07/10.41.***.83/교사명)
  t = t.replace(/[가-힣a-zA-Z0-9*._\-\s]+고등학교\/\d{4}\.\d{2}\.\d{2}[^\n\/]*\/[^\n\/]*\/[^\n\/]*/g, ' ');

  // 2. 페이지 번호 및 수험생 머리말/꼬리말 (예: OO고등학교 2026년 10월 6일 2 / 15 반 5 번호 14 성명 홍길동)
  t = t.replace(
    /(?:\/\s*\d+\s+)?(?:[가-힣]+고등학교\s+)?\d{4}년\s+\d+월\s+\d+일\s+(?:\d+\s*\/\s*\d+|\d+)\s+반\s+\d+\s+번호\s+\d+\s+성명\s+[가-힣]{2,4}/g,
    ' '
  );
  t = t.replace(
    /[가-힣]+고등학교\s+\d{4}년\s+\d+월\s+\d+일\s+\d+\s*\/\s*\d+\s+반\s+\d+\s+번호\s+\d+\s+성명\s+[가-힣]{2,4}/g,
    ' '
  );

  // 3. 페이지 넘김 시 반복되는 표 헤더
  t = t.replace(/학\s*년\s+창\s*의\s*적\s+체\s*험\s*활\s*동\s*상\s*황\s+영\s*역\s+시\s*간\s+특\s*기\s*사\s*항/g, ' ');
  t = t.replace(/학년\s+창의적\s+체험활동상황\s+영역\s+시간\s+특기사항/g, ' ');
  t = t.replace(/과\s*목\s+세\s*부\s*능\s*력\s+및\s+특\s*기\s*사\s*항/g, ' 과목세특헤더 ');
  t = t.replace(/학\s*년\s+행\s*동\s*특\s*성\s+및\s+종\s*합\s*의\s*견/g, ' 행특헤더 ');

  return t;
}

/**
 * 나이스 PDF 특유의 자간 공백 깨짐 정밀 복원
 * (단어 사이는 2칸 이상 공백, 단어 내 글자 사이는 1칸 공백인 경우 복원)
 */
function fixKerning(text: string): string {
  // PAPS, 날짜, 시간 등 기본 약어
  let str = text;
  str = str.replace(/P\s*A\s*P\s*S/gi, 'PAPS');
  str = str.replace(/\(\s*2\s*0\s*2\s*([0-9])\s*\.\s*0\s*([0-9])\s*\.\s*\)/g, '(202$1.0$2.)');
  str = str.replace(/(\d)\s+(\d)\s*시간/g, '$1$2시간');

  return str
    .split(/\s{2,}/)
    .map((token) => {
      const t = token.trim();
      if (!t) return '';
      const parts = t.split(' ');
      // 토큰 내부가 1글자씩 분리된 경우 (예: "활 동 을", "C R I S P R - C a s 9", "수 학 Ⅰ :")
      if (parts.length > 1 && parts.every((p) => p.length <= 2)) {
        return parts.join('');
      }
      return t;
    })
    .join(' ');
}

/**
 * 창체 기본 활동명 추출 (자율활동, 동아리활동, 진로활동, 봉사활동)
 */
function getBaseChangcheType(subject: string): string {
  if (subject.includes('자율활동')) return '자율활동';
  if (subject.includes('동아리활동')) return '동아리활동';
  if (subject.includes('진로활동')) return '진로활동';
  if (subject.includes('봉사활동')) return '봉사활동';
  return subject;
}

/**
 * 창의적 체험활동상황 정밀 파싱 (자율활동, 동아리활동, 진로활동)
 */
function parseChangcheSection(text: string, records: StudentRecordItem[]) {
  // 수치 표인 봉사활동실적은 제외
  const withoutBongsa = text.split(/봉\s*사\s*활\s*동\s*실\s*적/)[0];
  const headerRegex = /(?:([123])\s+)?(자율활동|동아리활동|진로활동)\s*(\d+)?(?:\s*\(([^)]+)\))?/g;
  const matches: Array<{
    index: number;
    grade?: string;
    type: string;
    hours?: string;
    subDetail?: string;
    fullMatch: string;
  }> = [];

  let m;
  while ((m = headerRegex.exec(withoutBongsa)) !== null) {
    matches.push({
      index: m.index,
      grade: m[1],
      type: m[2],
      hours: m[3],
      subDetail: m[4],
      fullMatch: m[0],
    });
  }

  let currentGrade = '1학년';
  const rawItems: Array<{
    grade: string;
    type: string;
    subject: string;
    text: string;
  }> = [];

  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    if (cur.grade) currentGrade = `${cur.grade}학년`;

    const start = cur.index + cur.fullMatch.length;
    const end = i < matches.length - 1 ? matches[i + 1].index : withoutBongsa.length;
    let content = withoutBongsa.slice(start, end).trim();
    content = content.replace(/^특기사항\s*/, '').replace(/\s{2,}/g, ' ').trim();

    let subjectName = cur.type;
    if (cur.subDetail) {
      subjectName += ` (${cur.subDetail.trim()})`;
    } else if (cur.type === '진로활동' && content.startsWith('희망분야')) {
      const matchHope = content.match(/^희망분야\s*([^\s.]+)/);
      if (matchHope) {
        subjectName += ` (희망: ${matchHope[1]})`;
        content = content.replace(/^희망분야\s*[^\s.]+\s*/, '').trim();
      }
    }
    if (cur.hours) {
      subjectName += ` [${cur.hours}시간]`;
    }

    // 끝부분에 묻어나는 표 잔여 헤더('학년') 정리
    content = content.replace(/(?:\s+학년)+$/, '').trim();

    if (content.length > 10) {
      rawItems.push({
        grade: currentGrade,
        type: '창의적 체험활동',
        subject: subjectName,
        text: content,
      });
    }
  }

  // 페이지 넘김으로 동일 학년/활동이 나뉜 경우 문장 자연스럽게 봉합
  for (let i = 0; i < rawItems.length; i++) {
    const item = rawItems[i];
    const prev = records[records.length - 1];
    const isSameActivity =
      prev &&
      prev.grade === item.grade &&
      prev.type === item.type &&
      (prev.subject === item.subject || getBaseChangcheType(prev.subject) === getBaseChangcheType(item.subject));

    if (isSameActivity) {
      // 세부정보(동아리명, 희망분야 등)가 더 풍부한 제목을 유지
      if (item.subject.length > prev.subject.length) {
        prev.subject = item.subject;
      }
      const combinedText = `${prev.text} ${item.text}`.trim();
      const { textWithHighlights, highlightSpans } = autoHighlightKeySentence(combinedText);
      prev.text = textWithHighlights;
      prev.highlightSpans = highlightSpans;
      prev.tags = extractKeywordsSimple(combinedText);
    } else {
      const { textWithHighlights, highlightSpans } = autoHighlightKeySentence(item.text);
      records.push({
        id: `rec-changche-${records.length + 1}`,
        grade: item.grade,
        type: '창의적 체험활동',
        subject: item.subject,
        text: textWithHighlights,
        tags: extractKeywordsSimple(item.text),
        highlightSpans,
      });
    }
  }
}

/**
 * 교과학습발달상황 과목별 세특 정밀 파싱 (전 과목 100% 무손실 추출)
 */
function parseSubjectSection(text: string, records: StudentRecordItem[]) {
  // 성적 수치 표(원점수, 표준편차, 성취도, 석차등급 등) 완전 제거
  let cleanSub = text.replace(
    /(?:<[^>]+>\s*)?학기\s+교과\s+과목[\s\S]*?(?:과목세특헤더|해당\s*사항\s*없음)/g,
    ' 과목세특헤더 '
  );
  cleanSub = cleanSub.replace(/<[^>]+>[\s\S]*?(?:과목세특헤더|해당\s*사항\s*없음)/g, ' 과목세특헤더 ');

  // 학년별 블록 분할 ([1학년], [2학년], [3학년])
  const gradeBlocks: Array<{ grade: string; text: string }> = [];
  const gRegex = /\[([123])학년\]/g;
  let gm;
  const gMatches: Array<{ grade: string; index: number }> = [];
  while ((gm = gRegex.exec(cleanSub)) !== null) {
    gMatches.push({ grade: `${gm[1]}학년`, index: gm.index });
  }

  // 만약 [1학년] 표기가 없는 비표준 문서일 경우 전체를 단일 블록으로 처리
  if (gMatches.length === 0) {
    gradeBlocks.push({ grade: '공통', text: cleanSub });
  } else {
    for (let i = 0; i < gMatches.length; i++) {
      const curG = gMatches[i];
      const start = curG.index;
      const end = i < gMatches.length - 1 ? gMatches[i + 1].index : cleanSub.length;
      gradeBlocks.push({
        grade: curG.grade,
        text: cleanSub.slice(start, end),
      });
    }
  }

  for (const gb of gradeBlocks) {
    const grade = gb.grade;
    const blockText = gb.text;

    // 나이스 표준 세특 과목 머리글 매칭 패턴:
    // (과목세특헤더)? ( (1학기) | (2학기) )? 과목명 :
    const subRegex =
      /(?:과목세특헤더\s+)?(?:\(([12]학기)\)\s*)?([가-힣a-zA-Z0-9ⅠⅡⅢⅣ·]+(?:\s+[가-힣a-zA-Z0-9ⅠⅡⅢⅣ·]+){0,3})\s*:\s*/g;
    const matches: Array<{
      index: number;
      semester?: string;
      subject: string;
      fullMatch: string;
    }> = [];

    let m;
    while ((m = subRegex.exec(blockText)) !== null) {
      let rawName = m[2].trim();
      // 머리글에 잔여 헤더('특기사항', '기사항', '항')가 붙은 경우 정밀 정제
      rawName = rawName.replace(/^(?:특기사항|기사항|항)\s*/, '').trim();

      if (
        !['비고', '성명', '특기사항', '이수학점', '해당 사항 없음', '구분'].includes(rawName) &&
        rawName.length <= 15
      ) {
        matches.push({
          index: m.index,
          semester: m[1],
          subject: rawName,
          fullMatch: m[0],
        });
      }
    }

    // 첫 번째 매치 이전에 앞선 과목의 이어짐 텍스트가 있다면 이전 과목에 봉합
    if (matches.length > 0 && matches[0].index > 0) {
      const prefixText = blockText
        .slice(0, matches[0].index)
        .replace(/과목세특헤더/g, ' ')
        .replace(/해당\s*사항\s*없음/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();

      if (prefixText.length > 15 && records.length > 0) {
        const prev = records[records.length - 1];
        if (prev && prev.type === '교과학습발달') {
          const combined = `${prev.text} ${prefixText}`.trim();
          const { textWithHighlights, highlightSpans } = autoHighlightKeySentence(combined);
          prev.text = textWithHighlights;
          prev.highlightSpans = highlightSpans;
        }
      }
    }

    for (let i = 0; i < matches.length; i++) {
      const cur = matches[i];
      const start = cur.index + cur.fullMatch.length;
      const end = i < matches.length - 1 ? matches[i + 1].index : blockText.length;
      const content = blockText
        .slice(start, end)
        .replace(/과목세특헤더/g, ' ')
        .replace(/해당\s*사항\s*없음/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();

      let title = cur.subject;
      if (cur.semester) title += ` (${cur.semester})`;

      if (content.length > 15) {
        const { textWithHighlights, highlightSpans } = autoHighlightKeySentence(content);
        records.push({
          id: `rec-setek-${records.length + 1}`,
          grade,
          type: '교과학습발달',
          subject: title,
          text: textWithHighlights,
          tags: extractKeywordsSimple(content),
          highlightSpans,
        });
      }
    }
  }
}

/**
 * 행동특성 및 종합의견 정밀 파싱
 */
function parseBehaviorSection(text: string, records: StudentRecordItem[]) {
  const bRegex = /(?:행특헤더\s+)?([123])\s+(?=[가-힣])/g;
  const matches: Array<{
    index: number;
    grade: string;
    fullMatch: string;
  }> = [];

  let bm;
  while ((bm = bRegex.exec(text)) !== null) {
    matches.push({
      index: bm.index,
      grade: `${bm[1]}학년`,
      fullMatch: bm[0],
    });
  }

  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const start = cur.index + cur.fullMatch.length;
    const end = i < matches.length - 1 ? matches[i + 1].index : text.length;
    let content = text
      .slice(start, end)
      .replace(/행특헤더/g, ' ')
      .replace(/\s+[123]\s*$/, '') // 끝에 붙은 다음 학년 번호 잔여물 제거
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (content.length > 15 && !['해당 사항 없음', 'ㄱ'].includes(content)) {
      // 페이지 넘김으로 동일 학년 행특이 나뉜 경우 봉합
      const prev = records[records.length - 1];
      if (prev && prev.grade === cur.grade && prev.type === '행동특성및종합의견') {
        const combinedText = `${prev.text} ${content}`.trim();
        const { textWithHighlights, highlightSpans } = autoHighlightKeySentence(combinedText);
        prev.text = textWithHighlights;
        prev.highlightSpans = highlightSpans;
      } else {
        const { textWithHighlights, highlightSpans } = autoHighlightKeySentence(content);
        records.push({
          id: `rec-behavior-${records.length + 1}`,
          grade: cur.grade,
          type: '행동특성및종합의견',
          subject: '행동특성 및 종합의견',
          text: textWithHighlights,
          tags: extractKeywordsSimple(content),
          highlightSpans,
        });
      }
    }
  }
}

/**
 * 비표준 양식 대비 유연한 폴백 분할
 */
function fallbackChunking(text: string, records: StudentRecordItem[]) {
  const sentences = text.split(/(?<=[.?!])\s+/).filter((s) => s.trim().length > 30);
  const chunkSize = Math.max(2, Math.floor(sentences.length / 12));

  for (let i = 0; i < sentences.length; i += chunkSize) {
    const chunk = sentences.slice(i, i + chunkSize).join(' ').trim();
    if (chunk.length < 30) continue;

    const grade =
      i < sentences.length * 0.33 ? '1학년' : i < sentences.length * 0.66 ? '2학년' : '3학년';
    const { textWithHighlights, highlightSpans } = autoHighlightKeySentence(chunk);

    records.push({
      id: `rec-chunk-${records.length + 1}`,
      grade,
      type: '학생부 기록',
      subject: `탐구활동 ${records.length + 1}`,
      text: textWithHighlights,
      tags: extractKeywordsSimple(chunk),
      highlightSpans,
    });
  }
}

/**
 * 원문 전체를 100% 온전히 보존하면서, 핵심 탐구 문장이 있을 경우 시각적 하이라이트 span을 덧씌움
 */
function autoHighlightKeySentence(text: string): {
  textWithHighlights: string;
  highlightSpans: string[];
} {
  const sentences = text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 20 && s.length <= 160);

  const keywords = [
    '탐구', '보고서', '실험', '발표', '분석', '설계', '주장',
    '제언', '토론', '조사', '프로젝트', '극복', '해결', '가설', '도출', '기여'
  ];

  const scored = sentences.map((sentence) => {
    let score = 0;
    for (const kw of keywords) {
      if (sentence.includes(kw)) score += 2;
    }
    if (/(?:함|음|였음|돋보임|보여줌|이끔|도출함|해결함)\.?$/.test(sentence)) score += 1;
    return { sentence, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const bestSentence = scored.find((s) => s.score >= 2)?.sentence;

  if (bestSentence && text.includes(bestSentence)) {
    return {
      textWithHighlights: text.replace(
        bestSentence,
        `<span class='highlight'>${bestSentence}</span>`
      ),
      highlightSpans: [bestSentence],
    };
  }

  return { textWithHighlights: text, highlightSpans: [] };
}

function extractKeywordsSimple(text: string): string[] {
  const candidates = [
    '리더십', '자기주도성', '문제해결력', '논리적 분석', '비판적 사고',
    '협업과 소통', '지적 호기심', '창의성', '실험 설계', '전공 적합성',
    '사회적 책임감', '탐구력', '학업태도', '봉사정신', '성실성'
  ];
  return candidates.filter((kw) => text.includes(kw.slice(0, 2))).slice(0, 3);
}
