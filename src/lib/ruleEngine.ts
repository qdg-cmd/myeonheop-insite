import { QuestionItem, StudentProfile, StudentRecordItem, CompetencyType } from '../types';
import { CONCEPTS, FIELDS, TAIL } from './v4Data';
import { PastExamData, getPastExamData } from './pastExamLoader';

// ============================================================
// 0. HTML 태그 및 엔티티 제거 유틸리티
// ============================================================
export function stripHtmlTags(text: string): string {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isUnsetUniv(u?: string): boolean {
  if (!u) return true;
  const t = u.trim();
  return !t || /^(?:목표\s*대(?:학|학교)?|지원\s*대(?:학|학교)?|희망\s*대(?:학|학교)?)$/.test(t);
}

export function isUnsetMajor(m?: string): boolean {
  if (!m) return true;
  const t = m.trim();
  return !t || /^(?:일반\s*전공|지원\s*학과|지원\s*전공|목표\s*학과|희망\s*학과)$/.test(t);
}

/**
 * PDF 텍스트 추출 시 발생하는 비정상 자간 분리 및 조사 분리 공백 복원
 */
export function cleanKoreanSpacing(text: string): string {
  if (!text) return '';
  let s = text;

  // 1. 흔한 음절 자간 분리 복합어 복원
  const MERGE_PATTERNS: Array<[RegExp, string]> = [
    [/융\s*합/g, '융합'],
    [/기\s*술/g, '기술'],
    [/아\s*쿠\s*아\s*포\s*닉\s*스/g, '아쿠아포닉스'],
    [/아쿠아포닉\s*스/g, '아쿠아포닉스'],
    [/활\s*용\s*하\s*여/g, '활용하여'],
    [/활용하\s*여/g, '활용하여'],
    [/냉\s*실/g, '냉실'],
    [/산\s*출\s*하\s*는\s*과\s*정/g, '산출하는 과정'],
    [/산출하는과\s*정/g, '산출하는 과정'],
    [/해\s*석\s*하\s*였\s*으\s*며/g, '해석하였으며'],
    [/해석하였으\s*며/g, '해석하였으며'],
    [/러\s*브\s*록/g, '러브록'],
    [/기\s*반/g, '기반'],
    [/탐\s*구/g, '탐구'],
    [/함\s*양\s*함/g, '함양함'],
    [/교\s*육\s*인\s*프\s*라/g, '교육인프라'],
    [/교육인\s*프라/g, '교육인프라'],
    [/증\s*명/g, '증명'],
    [/과\s*서\s*버/g, '과 서버'],
    [/과서\s*버/g, '과 서버'],
    [/데\s*이\s*터\s*센\s*터/g, '데이터센터'],
    [/데이터센\s*터/g, '데이터센터'],
    [/설\s*계/g, '설계'],
    [/효\s*율/g, '효율'],
    [/공\s*급/g, '공급'],
    [/초\s*음\s*파/g, '초음파'],
    [/정\s*교\s*한/g, '정교한'],
    [/내\s*용/g, '내용'],
    [/계\s*획/g, '계획'],
    [/창\s*의\s*적\s*이\s*고/g, '창의적이고'],
    [/창의적이\s*고/g, '창의적이고'],
    [/활\s*용/g, '활용'],
    [/주\s*제/g, '주제'],
    [/있\s*으\s*며/g, '있으며'],
    [/자\s*료/g, '자료'],
    [/원\s*리/g, '원리'],
    [/의\s*사\s*소\s*통/g, '의사소통'],
    [/의사소\s*통/g, '의사소통'],
    [/발\s*전/g, '발전'],
    [/방\s*안/g, '방안'],
    [/특\s*화\s*된/g, '특화된'],
    [/특화\s*된/g, '특화된'],
    [/부\s*족/g, '부족'],
    [/인\s*포\s*그\s*래\s*픽/g, '인포그래픽'],
    [/인\s*포그래픽/g, '인포그래픽'],
    [/인\s*간(?=[^가-힣]|$)/g, '인간'],
    [/혼\s*인(?=[^가-힣]|$)/g, '혼인'],
    [/프\s*로\s*그\s*램/g, '프로그램'],
    [/프\s*로그램/g, '프로그램'],
    [/알\s*고\s*리\s*즘/g, '알고리즘'],
    [/알\s*고리즘/g, '알고리즘'],
    [/시\s*스\s*템/g, '시스템'],
    [/시\s*스템/g, '시스템'],
    [/소\s*프\s*트\s*웨\s*어/g, '소프트웨어'],
    [/소\s*프트웨어/g, '소프트웨어'],
    [/데\s*이\s*터/g, '데이터'],
    [/데\s*이터/g, '데이터'],
    [/컴\s*퓨\s*터/g, '컴퓨터'],
    [/스\s*마\s*트/g, '스마트'],
    [/스\s*마트/g, '스마트'],
    [/네\s*트\s*워\s*크/g, '네트워크'],
    [/시\s*뮬\s*레\s*이\s*션/g, '시뮬레이션'],
    [/다\s*익\s*스\s*트\s*라/g, '다익스트라'],
    [/페\s*로\s*브\s*스\s*카\s*이\s*트/g, '페로브스카이트'],
    [/오\s*가\s*노\s*이\s*드/g, '오가노이드'],
    [/유\s*전\s*자(?=[^가-힣]|$)/g, '유전자'],
    [/생\s*명\s*과\s*학/g, '생명과학'],
    [/수\s*행\s*평\s*가/g, '수행평가'],
    [/상\s*호\s*작\s*용/g, '상호작용'],
    [/자\s*발\s*적/g, '자발적'],
    [/문\s*제\s*해\s*결/g, '문제해결'],
    [/제\s*작/g, '제작'],
    [/참\s*여/g, '참여'],
    [/범\s*생\s*설(?=[^가-힣]|$)/g, '범생설'],
    [/약\s*리\s*학/g, '약리학'],
    [/과\s*학\s*적/g, '과학적'],
    [/감\s*소\s*시\s*키\s*는/g, '감소시키는'],
    [/사\s*고\s*력/g, '사고력'],
    [/표\s*현\s*하\s*는/g, '표현하는'],
    [/설\s*정(?=[^가-힣]|$)/g, '설정'],
    [/심\s*화(?=[^가-힣]|$)/g, '심화'],
    [/그\s*치\s*지/g, '그치지'],
    [/다\s*차\s*원\s*적/g, '다차원적'],
    // PDF 자간 깨짐 복원 패턴 보강
    [/소\s*중\s*히/g, '소중히'],
    [/거\s*북\s*이/g, '거북이'],
    [/컴\s*퓨\s*팅/g, '컴퓨팅'],
    [/연\s*결\s*하\s*며/g, '연결하며'],
    [/변\s*화\s*시\s*켜/g, '변화시켜'],
    [/절\s*단(?=[^가-힣]|$)/g, '절단'],
    [/독\s*창\s*적\s*인/g, '독창적인'],
    [/독\s*창\s*적(?=[^가-힣]|$)/g, '독창적'],
    [/능\s*력\s*과/g, '능력과'],
    [/능\s*력(?=[^가-힣]|$)/g, '능력'],
    [/전\s*공\s*에\s*서/g, '전공에서'],
    [/전\s*공(?=[^가-힣]|$)/g, '전공'],
    [/관\s*심(?=[^가-힣]|$)/g, '관심'],
    [/가\s*능\s*성\s*을/g, '가능성을'],
    [/가\s*능\s*성(?=[^가-힣]|$)/g, '가능성'],
    [/위\s*해(?=[^가-힣]|$)/g, '위해'],
    [/돋\s*보\s*였\s*다\s*고/g, '돋보였다고'],
    [/돋\s*보\s*임(?=[^가-힣]|$)/g, '돋보임'],
    [/산\s*화\s*제(?=[^가-힣]|$)/g, '산화제'],
    [/결\s*과\s*를/g, '결과를'],
    [/결\s*과(?=[^가-힣]|$)/g, '결과'],
    [/기\s*준\s*으\s*로/g, '기준으로'],
    [/기\s*준(?=[^가-힣]|$)/g, '기준'],
    // 실전 9개 파일 자간 깨짐 복원 29종
    [/적\s*극\s*성/g, '적극성'],
    [/우\s*수\s*하\s*며/g, '우수하며'],
    [/기\s*댓\s*값/g, '기댓값'],
    [/전\s*체/g, '전체'],
    [/일\s*렁\s*일\s*렁/g, '일렁일렁'],
    [/마\s*음/g, '마음'],
    [/직\s*관/g, '직관'],
    [/대\s*비/g, '대비'],
    [/투\s*명\s*하\s*게/g, '투명하게'],
    [/꾸\s*준\s*한/g, '꾸준한'],
    [/진\s*로\s*로\s*드\s*맵/g, '진로로드맵'],
    [/카\s*드\s*뉴\s*스/g, '카드뉴스'],
    [/희\s*망/g, '희망'],
    [/조\s*사/g, '조사'],
    [/정\s*리/g, '정리'],
    [/결\s*합/g, '결합'],
    [/범\s*죄/g, '범죄'],
    [/운\s*영/g, '운영'],
    [/가\s*치/g, '가치'],
    [/부\s*과/g, '부과'],
    [/학\s*습/g, '학습'],
    [/친\s*구/g, '친구'],
    [/괴\s*사/g, '괴사'],
    [/작\s*동/g, '작동'],
    [/수\s*행/g, '수행'],
    [/염\s*류\s*화/g, '염류화'],
    [/변\s*화/g, '변화'],
    [/스\s*펙\s*트\s*럼/g, '스펙트럼'],
    [/염\s*색\s*체/g, '염색체'],
    [/유\s*전\s*정\s*보/g, '유전정보'],
    [/돌\s*연\s*변\s*이/g, '돌연변이'],
    [/방\s*정\s*식/g, '방정식'],
    [/빅\s*데\s*이\s*터/g, '빅데이터'],
    [/인\s*공\s*지\s*능/g, '인공지능'],
    [/딥\s*러\s*닝/g, '딥러닝'],
    [/머\s*신\s*러\s*닝/g, '머신러닝'],
    [/신\s*경\s*망/g, '신경망'],
    [/뉴\s*런\s*망/g, '뉴런망'],
    [/블\s*록\s*체\s*인/g, '블록체인'],
    [/프\s*로\s*젝\s*트/g, '프로젝트'],
    [/아\s*이\s*디\s*어/g, '아이디어'],
    [/피\s*드\s*백/g, '피드백'],
    [/모\s*니\s*터\s*링/g, '모니터링'],
    [/프\s*레\s*젠\s*테\s*이\s*션/g, '프레젠테이션'],
    [/포\s*트\s*폴\s*리\s*오/g, '포트폴리오'],
    [/멘\s*토\s*링/g, '멘토링'],
    [/캠\s*페\s*인/g, '캠페인'],
    [/모\s*의\s*면\s*접/g, '모의면접'],
    [/가지고이\s+/g, '가지고 이 '],
    [/가지고이(?=[가-힣])/g, '가지고 이 '],
    [/향후이\s*러한/g, '향후 이러한'],
    // [구조 3] 조사/어미 분절 자동 결합
    [/대한의\s*지/g, '대한 의지'],
    [/까\s*지/g, '까지'],
    [/으\s*며/g, '으며'],
    [/하\s*며/g, '하며'],
    [/하\s*여/g, '하여'],
    [/했\s*으며/g, '했으며'],
    [/였\s*으며/g, '였으며'],
    [/되\s*어/g, '되어'],
    [/하\s*고/g, '하고'],
    [/따라가\s*기/g, '따라가기'],
    [/바꿔나\s*갈/g, '바꿔나갈'],
    [/만들\s*기/g, '만들기'],
    [/필요\s*한/g, '필요한'],
    [/유의\s*할/g, '유의할'],
    // [구조 3] 빈출 분절 명사/어근 추가
    [/디저\s*트/g, '디저트'],
    [/조\s*리/g, '조리'],
    [/자\s*신의/g, '자신의'],
    [/성\s*실히/g, '성실히'],
    [/균\s*형/g, '균형'],
    [/분\s*야/g, '분야'],
    [/전\s*개/g, '전개'],
    [/문\s*화/g, '문화'],
    [/차\s*이/g, '차이'],
    [/조\s*건/g, '조건'],
    [/작\s*성/g, '작성'],
    [/대\s*응/g, '대응'],
    [/방\s*식/g, '방식'],
    [/도왔으\s*며/g, '도왔으며'],
    [/진\s*행/g, '진행'],
    [/발\s*표/g, '발표'],
    [/탐\s*구/g, '탐구'],
    [/분\s*석/g, '분석'],
    [/사\s*회/g, '사회'],
    [/환\s*경/g, '환경'],
    [/기\s*술/g, '기술'],
    [/개\s*념/g, '개념'],
    [/활\s*동/g, '활동'],
    [/과\s*정/g, '과정'],
    [/문\s*제/g, '문제'],
    [/가\s*치/g, '가치'],
    [/의\s*미/g, '의미'],
    [/연\s*구/g, '연구'],
    [/정\s*보/g, '정보'],
    [/역\s*량/g, '역량'],
    [/시\s*간/g, '시간'],
    [/원\s*리/g, '원리'],
    [/자\s*료/g, '자료'],
    [/결\s*과/g, '결과']
  ];

  for (const [re, rep] of MERGE_PATTERNS) {
    s = s.replace(re, rep);
  }

  // 2. 날짜 마침표 뒤 공백 정규화: '2024.09. 06.' -> '2024.09.06.'
  s = s.replace(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?/g, '$1.$2.$3.');

  // 3. 문장부호 앞의 불필요한 공백 제거: '작성함 . 특히' -> '작성함. 특히', '하였고 ,' -> '하였고,'
  s = s.replace(/\s+([,.?!])/g, '$1');

  // 4. 문두 과목 라벨 제거 (예: "(2학기)국어: ", "미술 창작:")
  s = s.replace(/^(?:\([12]학기\)\s*)?(?:국어|영어|수학|사회|과학|정보|기술·?가정|미술\s*창작|미술|음악|체육|사회문제\s*탐구|생활과\s*윤리|정치와\s*법|화법과\s*작문|독서|문학)\s*[:：]\s*/, '');

  // 5. 문두 여는 따옴표 누락 복원 (예: 일본어 심리 상자(유영수)'를 -> '일본어 심리 상자(유영수)'를)
  if (!/^['‘"]/.test(s) && /^[가-힣A-Za-z0-9\s(),·&\-]{2,35}'(?:을|를|이|가|은|는|의|에|에서|으로|로|과|와|라는|이라는)/.test(s)) {
    s = "'" + s;
  }

  // 6. 한글 명사 뒤 조사/접미사 앞의 비정상 공백 복원
  // 6-1. 순수 조사 결합
  s = s.replace(/([가-힣])\s+(을|를|이|가|은|는|의|에|로|와|과|도|만|에게|으로|에서|부터|까지|적인|적으로|히)(?=[^가-힣]|$)/g, '$1$2');

  // 6-2. 서술격 어미/접미사 결합 (앞 글자가 격조사 을/를/이/가/은/는/에/로/와/과/의/도/만이 아닐 때만 명사 뒤 접미사로 결합)
  s = s.replace(/(?<=[가-힣])(?<![을를이가은는에로와과의도만])\s+(하여|하고|하며|했다|된다|이다|인|임|해|였다고|였음|시켜|시켰|되며|함|서)(?=[^가-힣]|$)/g, '$1');

  return s;
}

/**
 * recordLabel에서 시간 및 희망 분야 메타데이터 제거
 * 예: "[1학년 자율활동 [64시간]]" -> "1학년 자율활동"
 *     "진로활동 [38시간]" -> "진로활동", "진로활동 (희망: 생명과학)" -> "진로활동"
 */
export function cleanLabelText(str?: string): string {
  if (!str) return '';
  let s = str.trim();
  if (s.startsWith('[') && s.endsWith(']')) {
    s = s.slice(1, -1).trim();
  }
  s = s.replace(/\(([1-2])학기\)/g, ' $1학기');
  s = s.replace(/\[\s*\d+\s*시간\s*\]/g, '');
  s = s.replace(/\([^)]*\)/g, '');
  s = s.replace(/\[[^\]]*\]/g, '');
  s = s.replace(/^[\[\]()]+|[\[\]()]+$/g, '');
  return s.replace(/\s{2,}/g, ' ').trim();
}

// ============================================================
// 1. 한국어 음운 및 조사 자동 처리 (josa)
// ============================================================
const HANGUL = /[가-힣]/;

export function jong(ch: string): number {
  const c = ch.charCodeAt(0) - 0xAC00;
  return c < 0 || c > 11171 ? -1 : c % 28;
}

export function jung(ch: string): number {
  const c = ch.charCodeAt(0) - 0xAC00;
  return c < 0 || c > 11171 ? -1 : Math.floor((c % 588) / 28);
}

export function hasBatchim(w: string): boolean {
  if (!w) return false;
  // 문자열 끝의 문장부호(?, !, .), 따옴표, 괄호 등 모든 기호 제거 후 마지막 음절 추출
  const clean = String(w).replace(/[.,!?:;~'’"“”`)\(\[\]\{\}<>》」』\s]+$/g, '').trim();
  if (!clean) return false;
  const ch = clean.slice(-1);
  if (!HANGUL.test(ch)) {
    return /[013678LMNR]$/i.test(ch);
  }
  // 보조사 '는'으로 끝나는 질문구·어절은 받침 없는 음운 환경(개수 등)으로 취급
  if (ch === '는') return false;
  return jong(ch) > 0;
}

export function josa(w: string, a: string, b?: string): string {
  if (!w) return '';
  if (typeof a === 'string' && !b) {
    if (a.includes('/')) {
      const parts = a.split('/');
      return w + (hasBatchim(w) ? parts[0] : parts[1]);
    } else if (a === '은(는)') {
      return w + (hasBatchim(w) ? '은' : '는');
    } else if (a === '이(가)') {
      return w + (hasBatchim(w) ? '이' : '가');
    } else if (a === '을(를)') {
      return w + (hasBatchim(w) ? '을' : '를');
    } else if (a === '과(와)') {
      return w + (hasBatchim(w) ? '과' : '와');
    }
    return w + a;
  }
  return w + (hasBatchim(w) ? a : (b || ''));
}

export function stripJong(ch: string): string {
  const c = ch.charCodeAt(0) - 0xAC00;
  return String.fromCharCode(0xAC00 + c - (c % 28));
}

export function addJong(ch: string, j: number): string {
  const c = ch.charCodeAt(0) - 0xAC00;
  return String.fromCharCode(0xAC00 + c - (c % 28) + j);
}

export function escRegex(s: string): string {
  return (s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================
// 2. 토큰 및 서술어 제외/보호 필터링
// ============================================================
export const PROTECTED_NOUNS = new Set([
  '실험', '체험', '결함', '포함', '위험', '보험', '모임', '게임', '팀', '빔', '림', '짐',
  '틈', '힘', '프레임', '알고리즘', '시스템', '책임', '다짐', '울림', '부름', '흐름',
  '바람', '사람', '그림', '보람', '살림', '나눔', '마음', '이음', '맞춤', '도움'
]);

const PRED_STANDALONE = /^(?:보임|돋보임|두드러짐|나타냄|드러냄|확인됨|이루어짐|높임|지님|가짐|느낌|깨달음|배움|익힘|이해함|파악함|참여함|수행함|탐구함|작성함|발표함|조사함|분석함|설명함|제시함|노력함|다짐함|인식함|우수함|탁월함|뛰어남|적극적임|인상적임|활동함|기록됨|관찰됨|발휘함|도출함|성취함|함|됨)$/;
const VERB_COMPOUND = /[가-힣]{1,}(?:하였음|했음|되었음|보였음|함|됨|하며|하고|하여|해서|했으나|되나|하다|된다|이다|하며)$/;
const FIXED_MODIFIERS = /^(?:하는|하여|하고|하며|적인|적으로|위한|통한|대한|있는|없는|같은|바탕으로|있음|없음|통해|위해|대해|된다|한다|이다|였다|됐다|되었다|되었다고|했다고|보였다고|보이며|보이고|보여|나타내며|나타내고|드러내며|드러내고|새로운|다양한|구체적인|기존|이전|특정|각종|있으며|관한|따른|함께하기|여기기|알아보기|인터뷰하기)$/;

const NOUN_JEOG_WHITELIST = new Set([
  '면적', '목적', '성적', '업적', '유적', '궤적', '국적', '흔적', '기적', '호적', '체적'
]);

export function isPredicateOrModifierToken(t: string): boolean {
  if (!t || t.length < 2) return true;
  if (PROTECTED_NOUNS.has(t)) return false;
  for (const pn of PROTECTED_NOUNS) {
    if (t.endsWith(pn) && t.length > pn.length) return false;
  }
  // ~적 차단 (화이트리스트 순수 명사 제외 100% 차단: 윤리적, 과학적, 실천적, 다차원적 등)
  if (/[가-힣]{2,}적$/.test(t)) {
    if (!NOUN_JEOG_WHITELIST.has(t)) return true;
  }
  // ~히 차단 (부사어: 소중히, 단순히, 철저히, 명확히 등)
  if (/[가-힣]{2,}히$/.test(t)) return true;
  // ~한 차단 (형용사/관형사: 필요한, 중요한, 우수한 등)
  if (/[가-힣]{2,}한$/.test(t)) return true;
  // 조사 결합형 차단 (봄으로써, 점에서, 관점에서, 단계로 등)
  if (/[가-힣]+(?:으로써|에서|으로|에게)$/.test(t)) return true;
  // 동사 어간 결합형 차단 (해결하, 보여줌, 전달함 등)
  if (/[가-힣]+(?:하|줌|됨|함)$/.test(t)) return true;
  // 동사 명사형(~하기) 100% 차단
  if (/[가-힣]+하기$/.test(t)) return true;
  if (PRED_STANDALONE.test(t)) return true;
  if (FIXED_MODIFIERS.test(t)) return true;
  if (VERB_COMPOUND.test(t)) return true;
  return false;
}

const JOSA_LIST = [
  '에서부터', '으로부터', '으로의', '이라는', '에서는', '으로는', '에게서',
  '부터', '까지', '에서', '으로', '에게', '처럼', '만큼',
  '은', '는', '이', '가', '을', '를', '의', '에', '로', '와', '과', '도', '만'
];

export function stripJosa(word: string): string {
  if (!word || word.length < 2) return '';
  if (PROTECTED_NOUNS.has(word)) return word;
  let target = word;
  for (const josaItem of JOSA_LIST) {
    if (target.endsWith(josaItem)) {
      const stem = target.slice(0, -josaItem.length);
      if (stem.length >= 2 && HANGUL.test(stem)) return stem;
      return target;
    }
  }
  return target;
}

export const STOP = new Set([
  '있습니다', '합니다', '대한', '통해', '있는', '하는', '위한', '대학', '학생', '지원자', '면접',
  '평가', '모집', '전형', '경우', '내용', '관련', '학과', '학부', '이상', '이내', '그리고', '또한',
  '및', '등', '수', '것', '있다', '한다', '되는', '하여', '에서', '으로', '에게',
  '보임', '돋보임', '두드러짐', '나타냄', '드러냄', '확인됨', '이루어짐', '높임', '지님', '가짐',
  '느낌', '깨달음', '배움', '익힘', '이해함', '파악함', '참여함', '수행함', '탐구함', '작성함',
  '발표함', '조사함', '분석함', '설명함', '제시함', '노력함', '다짐함', '인식함', '우수함', '탁월함',
  '뛰어남', '적극적임', '인상적임', '활동함', '기록됨', '관찰됨', '발휘함', '도출함', '성취함',
  '뛰어난', '우수한', '적극적인', '인상적인',
  '활동', '과정', '결과', '모습', '태도', '노력', '관심', '흥미', '역량', '능력',
  '방안', '해결방안', '실생활', '선행연구', '시각자료', '발표자료', '모둠', '친구', '교사', '수업',
  '교과', '주제', '부분', '측면', '자세', '향상', '기여', '이해', '생각', '문제',
  '해결', '영향', '다양한', '구체적', '적극적', '자발적', '심화', '기초', '연계', '경험',
  '기회', '분야', '과목', '학년', '이유', '성장', '발전', '스스로', '직접', '주도적',
  '바탕', '중심', '자신', '본인', '학습', '적용', '활용', '확인', '진행', '참여',
  '수행', '작성', '발표', '조사', '탐구', '분석', '설명', '제시', '성취', '우수',
  '탁월', '인상', '형성', '공유', '소통', '협력', '배려', '나눔', '실천', '유도',
  '마련', '설정', '도출', '극복', '변화', '발휘', '파악', '주도', '주안점', '주안',
  '의미', '가치', '중요성', '필요성', '목적', '목표', '방법', '도움', '역할', '기반',
  '대상', '초점', '특성', '특징', '상황', '요소', '요인', '관계', '차이', '비교',
  '정리', '선정', '고민', '주목', '지속적', '효과적', '창의적', '긍정적', '성공적', '체계적',
  '종합적', '전반적', '다각적', '비판적', '논리적', '실질적', '실질', '사례', '예시', '자료',
  '보고서', '에세이', '소논문', '소감', '느낀점', '깨달은점', '동기', '계기', '배경', '개인',
  '공동체', '사회', '이후', '당시', '직후', '매우', '가장', '서로', '함께', '모두',
  '원리', '개념', '이론', '구조',
  // 학교 행정·평가 용어
  '수행평가', '지필평가', '평가', '동아리', '보고서', '소논문', '발표회', '포트폴리오', '인터뷰', '설문조사',
  '인포그래픽', '포스터', '카드뉴스', '프레젠테이션', '프로젝트', '캠페인', '멘토링', '탐구활동', '자율활동', '진로활동', '계열',
  // 범용 추상명사
  '상호작용', '상관관계', '정당성', '타당성', '가능성', '중요성', '필요성', '다양성', '특성', '유형',
  '단계', '원인', '예방', '예방책', '중심', '바탕', '수준', '기준', '방향', '시각',
  '관점', '태도', '자세', '역할', '의미', '가치', '영향력', '분위기', '인식',
  '지연', '기피', '증가', '감소', '이해', '파악', '진단', '제시',
  // 일상구 및 관형사/서술어/부사 차단 보강
  '문제해결', '문제해결력', '탐구력', '사고력', '방어기제', '함께하기', '새로운', '있으며',
  '소중히', '단순히', '필요한', '봄으로써', '점에서', '보여줌', '해결하', '시스템', '집중력', '의사소통', '생명과학', '환경공학',
  '탐색', '제어',
  '아니라', '우리나라', '학생임', '긍정적인', '자연스럽게', '친구들', '학교생활', '배드민턴', '주어진', '나누며', '칭얼거리다', '모둠원',
  // HTML 태그 및 영문 노이즈 원천 차단
  'span', 'class', 'highlight', 'div', 'mark', 'style', 'table', 'tbody', 'tr', 'td', 'br', 'p',
  'strong', 'em', 'img', 'src', 'href', 'html', 'body',
  // 광범위 2글자 대분류 단어 차단
  '생명', '과학', '윤리', '기술', '자연', '인간', '사회', '역사', '문학', '환경', '건강', '의료', '교육', '진로'
]);

export const CONCEPT_EXCLUDE = new Set([
  '시간', '변환', '효율', '현상', '실험', '프로그램', '구조', '원리', '방법', '방식',
  '기능', '효과', '특징', '요소', '사례', '차이', '변화', '관계', '조건', '환경',
  '상황', '무선', '수행', '참여', '진행', '분석', '탐구', '조사', '발표', '작성',
  '활동', '과정', '결과', '역량', '능력', '태도', '노력', '관심', '이유', '목적',
  '목표', '기준', '내용', '주제', '이해', '생각', '경험', '기회', '분야', '과목',
  '관리', '오차', '전자기', '화학', '유전자', '협업', '활용', '설계', '제작', '비교',
  '적용', '도출', '성실', '열정', '학습', '공부', '수업', '학교', '학생', '친구',
  '기업', '전략', '사회', '경제', '문화', '인간', '정책', '시장', '역사', '국가',
  '세계', '지역', '교육', '소비', '개발', '기술', '산업', '경영',
  '학급', '모둠', '동아리', '부원', '급우', '선생님',
  // 학교 행정·평가 용어
  '수행평가', '지필평가', '평가', '동아리', '보고서', '소논문', '발표회', '포트폴리오', '인터뷰', '설문조사',
  '인포그래픽', '포스터', '카드뉴스', '프레젠테이션', '프로젝트', '캠페인', '멘토링', '탐구활동', '자율활동', '진로활동', '계열',
  // 범용 추상명사
  '상호작용', '상관관계', '정당성', '타당성', '가능성', '중요성', '필요성', '다양성', '특성', '유형',
  '단계', '원인', '예방', '예방책', '중심', '바탕', '수준', '기준', '방향', '시각',
  '관점', '태도', '자세', '역할', '의미', '가치', '영향력', '분위기', '인식',
  '지연', '기피', '증가', '감소', '이해', '파악', '진단', '제시',
  // 일상구 및 관형사/서술어/부사 차단 보강
  '문제해결', '문제해결력', '탐구력', '사고력', '방어기제', '함께하기', '새로운', '있으며',
  '소중히', '단순히', '필요한', '봄으로써', '점에서', '보여줌', '해결하', '시스템', '집중력', '의사소통', '생명과학', '환경공학',
  '탐색', '제어',
  '아니라', '우리나라', '학생임', '긍정적인', '자연스럽게', '친구들', '학교생활', '배드민턴', '주어진', '나누며', '칭얼거리다', '모둠원',
  // HTML 태그 및 영문 노이즈 원천 차단
  'span', 'class', 'highlight', 'div', 'mark', 'style', 'table', 'tbody', 'tr', 'td', 'br', 'p',
  'strong', 'em', 'img', 'src', 'href', 'html', 'body', 'span class', 'class=',
  // 광범위 2글자 대분류 단어 차단
  '생명', '과학', '윤리', '기술', '자연', '인간', '사회', '역사', '문학', '환경', '건강', '의료', '교육', '진로'
]);

const BUILTIN_CONCEPT_SET = new Set<string>();
CONCEPTS.forEach(([term, aliases]) => {
  BUILTIN_CONCEPT_SET.add(term);
  if (aliases) {
    aliases.split('|').forEach((a) => {
      const at = a.trim();
      if (at) BUILTIN_CONCEPT_SET.add(at);
    });
  }
});

const GENERAL_NOUN_SUFFIXES = /(?:활동|과정|방법|내용|결과|평가|역량|태도|작용|관계|기준|수준|단계|유형|특성|방식|사례|상황|현상|조건|분야|항목|효과|기능|의미|가치|시각|관점|의식|인식|대책|방안|노력|성장|발전|변화|증가|감소|확산|원인|이유|목적|목표|정당성|타당성|가능성)$/;

/**
 * concept_def/apply/limit/compare 및 multihop에 승격 가능한 순수 고유 학술 개념어인지 검증
 */
export function isEligibleAcademicConcept(
  termOrMatch: ConceptMatch | string,
  score: number = 0
): boolean {
  const term = typeof termOrMatch === 'string' ? termOrMatch : termOrMatch.term;
  const isBuiltin = typeof termOrMatch === 'object' && Boolean(termOrMatch.isBuiltin);

  // 1. 불용어 및 제외어 차단 (내장어 및 dynamic 모두에 최우선 적용)
  if (STOP.has(term) || CONCEPT_EXCLUDE.has(term) || isPredicateOrModifierToken(term)) {
    return false;
  }

  // 동사 명사형(~하기, ~기) 차단
  if (/[가-힣]+하기$/.test(term) || (/[가-힣]{2,}기$/.test(term) && !/줄기|자기|초기|말기|주기|증기|전기|공기|용기|기기/.test(term))) {
    return false;
  }

  // 2. 내장 학술 개념어(CONCEPTS 520선)는 제외어가 아닌 경우 100% 자격 통과
  if (isBuiltin || BUILTIN_CONCEPT_SET.has(term)) return true;

  // 3. 영문 학술어/약어 (대문자 포함 2자 이상, 예: CRISPR, ESG, AI, DNA, PCR, RNA, GPU 등)
  if (/^[A-Z][A-Za-z0-9_-]{1,15}$/.test(term)) {
    return !/^(?:HTML|BODY|SPAN|DIV|CLASS|STYLE|TABLE|TRUE|FALSE)$/i.test(term);
  }

  // 4. 한글 단어인 경우:
  // - 3글자 이상
  // - 일반 범용 추상 접미사(~활동, ~과정, ~작용, ~관계, ~평가 등) 금지
  // - TF-IDF 점수 1.6 이상
  if (HANGUL.test(term) && term.length >= 3) {
    if (GENERAL_NOUN_SUFFIXES.test(term)) return false;
    if (score >= 1.6 || (typeof termOrMatch === 'object' && (termOrMatch as any).isDynamic)) {
      return true;
    }
  }

  return false;
}

/**
 * concept_def/apply/limit/compare 전용 초엄격 화이트리스트 검증:
 * 오직 (A) 내장 CONCEPTS 520개 사전어, (B) 2~8자 대문자 영문 학술 약어, (C) 사용자 지정 키워드에만 허용.
 * 일반 동적 추출 명사나 서술어/조사/부사는 100% 차단.
 */
export function isEligibleForConceptTemplate(
  termOrMatch: ConceptMatch | string,
  customKeywords?: string[]
): boolean {
  const term = typeof termOrMatch === 'string' ? termOrMatch.trim() : termOrMatch.term.trim();
  const isBuiltin = typeof termOrMatch === 'object' && Boolean(termOrMatch.isBuiltin);
  if (!term || term.length < 2) return false;
  if (STOP.has(term) || CONCEPT_EXCLUDE.has(term) || isPredicateOrModifierToken(term)) return false;
  if (/(?:히|적|한|으로써|에서|으로|에게|하|줌|됨|함|기)$/.test(term)) {
    if (!NOUN_JEOG_WHITELIST.has(term)) return false;
  }

  // (A) 내장 학술 사전어 (520선)
  if (isBuiltin || BUILTIN_CONCEPT_SET.has(term)) return true;

  // (B) 2~8자 대문자 영문 학술 약어 (DNA, RNA, CRISPR, GPU, ESS, SMR, ESG, AI, BMS 등)
  if (/^[A-Z0-9]{2,8}$/.test(term) && !/^(?:HTML|BODY|SPAN|DIV|CLASS|STYLE|TABLE|TRUE|FALSE)$/i.test(term)) {
    return true;
  }

  // (C) 사용자 지정 집중 키워드
  if (customKeywords && customKeywords.some((ck) => ck && ck.trim() === term)) {
    return true;
  }

  return false;
}

const MULTIHOP_BANNED = new Set([
  '시스템', '집중력', '의사소통', '생명과학', '환경공학', '문제해결', '문제해결력',
  '탐구활동', '자율활동', '진로활동', '동아리', '수행평가', '보고서', '포트폴리오',
  '자연과학', '사회과학', '공학', '인문학', '프로그래밍', '탐색', '제어'
]);

/**
 * multihop(학년·과목 연계) 승격 검증:
 * 내장 학술어, 영문 약어, 또는 지원학과/추상명사를 제외한 3글자 이상 순수 명사만 허용.
 */
export function isEligibleForMultiHop(kw: string, targetMajor?: string, customKeywords?: string[]): boolean {
  if (!kw || kw.length < 2) return false;
  const term = kw.trim();
  if (STOP.has(term) || CONCEPT_EXCLUDE.has(term) || MULTIHOP_BANNED.has(term)) return false;
  if (isPredicateOrModifierToken(term)) return false;
  if (/(?:히|적|에서|으로|로|으로써|에게|하|줌|됨|함|한|기)$/.test(term)) {
    if (!NOUN_JEOG_WHITELIST.has(term)) return false;
  }
  if (targetMajor) {
    const tm = targetMajor.replace(/(학과|학부|전공|과|계열)$/, '').trim();
    if (tm && (term === tm || term === targetMajor || term.includes(tm) || tm.includes(term))) {
      return false;
    }
  }
  if (BUILTIN_CONCEPT_SET.has(term)) return true;
  if (/^[A-Z0-9]{2,8}$/.test(term)) return true;
  if (customKeywords && customKeywords.includes(term)) return true;
  return false;
}

// ============================================================
// 3. TF-IDF 어휘 추출 및 개념어 매칭
// ============================================================
export interface KeywordScore {
  term: string;
  tf: number;
  crossSectionDF: number;
  score: number;
  def?: string;
}

export function extractKeywordsAdvanced(
  records: Array<{ text: string; grade?: number; sec?: string; subj?: string; area?: string }>,
  quotesList: string[] = []
): KeywordScore[] {
  const tfMap = new Map<string, number>();
  const secMap = new Map<string, Set<string>>();
  const quoteTerms = new Set<string>();

  (quotesList || []).forEach((q) => {
    (q.match(/[가-힣A-Za-z0-9_]{2,20}/g) || []).forEach((w) => {
      const stem = stripJosa(w);
      if (stem.length >= 2 && !isPredicateOrModifierToken(stem) && !STOP.has(stem)) {
        if (/^[A-Za-z]+$/.test(stem) && !/^(?:DNA|RNA|AI|IT|CRISPR|OECD|UN|WHO|GDP|SW|HW|IoT|VR|AR|ESG)$/i.test(stem)) {
          return;
        }
        quoteTerms.add(stem);
      }
    });
  });

  const wordRegex = /[가-힣A-Za-z0-9_]{2,20}/g;

  for (const rec of (records || [])) {
    const text = rec.text || '';
    const secKey = `${rec.grade || 0}_${rec.sec || ''}_${rec.subj || rec.area || ''}`;
    let m: RegExpExecArray | null;
    while ((m = wordRegex.exec(text)) !== null) {
      const rawToken = m[0].trim();
      if (rawToken.length < 2 || /^\d+$/.test(rawToken)) continue;
      if (isPredicateOrModifierToken(rawToken)) continue;

      const cleanTerm = stripJosa(rawToken);
      if (cleanTerm.length < 2 || /^\d+$/.test(cleanTerm)) continue;
      if (isPredicateOrModifierToken(cleanTerm)) continue;
      if (STOP.has(cleanTerm)) continue;
      if (/^[A-Za-z]+$/.test(cleanTerm) && !/^(?:DNA|RNA|AI|IT|CRISPR|OECD|UN|WHO|GDP|SW|HW|IoT|VR|AR|ESG)$/i.test(cleanTerm)) {
        continue;
      }

      tfMap.set(cleanTerm, (tfMap.get(cleanTerm) || 0) + 1);

      if (!secMap.has(cleanTerm)) secMap.set(cleanTerm, new Set());
      secMap.get(cleanTerm)!.add(secKey);
    }
  }

  const scored: KeywordScore[] = [];
  for (const [term, tf] of tfMap.entries()) {
    let shapeBonus = 1.0;
    if (quoteTerms.has(term)) shapeBonus *= 1.8;
    if (term.length >= 4 && term.length <= 10 && HANGUL.test(term)) shapeBonus *= 1.4;
    if (/[A-Za-z]/.test(term)) shapeBonus *= 1.6;

    const crossSectionDF = secMap.get(term) ? secMap.get(term)!.size : 1;
    const crossBonus = 1 + 0.25 * Math.min(crossSectionDF - 1, 3);
    const score = (1 + Math.log(tf)) * shapeBonus * crossBonus;

    scored.push({ term, tf, crossSectionDF, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

export function buildFreq(text: string): Map<string, number> {
  const f = new Map<string, number>();
  (text.match(/[가-힣A-Za-z0-9]+/g) || []).forEach((w) => f.set(w, (f.get(w) || 0) + 1));
  return f;
}

export function hasTerm(text: string, term: string): boolean {
  if (!text || !term) return false;
  if (term.length <= 2 && /[A-Za-z]/.test(term)) {
    return new RegExp('(^|[^A-Za-z0-9])' + escRegex(term) + '([^A-Za-z0-9]|$)', 'i').test(text);
  }
  const re = new RegExp('(^|[^가-힣])' + escRegex(term) + '(?:$|[^가-힣]|(?:은|는|이|가|을|를|의|에|로|와|과|도|만|에서|으로|에게))');
  return re.test(text);
}

const CONCEPT_IDX = (() => {
  const arr: Array<{ term: string; i: number; re: RegExp }> = [];
  CONCEPTS.forEach(([k, al], i) => {
    [k, ...(al ? al.split('|') : [])].forEach((term) => {
      const cleanTerm = term.trim();
      if (cleanTerm.length >= 2) {
        arr.push({
          term: cleanTerm,
          i,
          re: new RegExp(escRegex(cleanTerm), /[A-Za-z]/.test(cleanTerm) ? 'i' : '')
        });
      }
    });
  });
  arr.sort((a, b) => b.term.length - a.term.length);
  return arr;
})();

export interface ConceptMatch {
  i?: number;
  term: string;
  name: string;
  def: string;
  isBuiltin?: boolean;
  isDynamic?: boolean;
}

const CONTEXT_SENSITIVE_CONCEPTS: Record<string, { required?: RegExp; forbidden?: RegExp; customCheck?: (t: string) => boolean }> = {
  확산: {
    required: /(?:농도|세포막|기체|액체|분자|삼투|용액|입자|물리|화학|생명|생물|온도|압력|브라운)/,
    forbidden: /(?:정보|가짜|문화|소문|인식|전파|피해|유행|SNS|사회|바이러스성\s*정보)/
  },
  삼투: {
    required: /(?:농도|세포막|반투막|용액|수분|물리|화학|생명|생물|압력)/,
    forbidden: /(?:사회|문화|사상)/
  },
  진화: {
    required: /(?:생물|유전자|다윈|돌연변이|자연선택|종|개체군|적응|화석|생태)/,
    forbidden: /(?:기술의\s*진화|인터넷의\s*진화|서비스의\s*진화|사회의\s*진화)/
  },
  저항: {
    required: /(?:전기|전류|전압|옴|회로|도체|반도체|저항기|물리)/,
    forbidden: /(?:시민\s*저항|사회적\s*저항|저항\s*운동|불복종)/
  },
  반도체: {
    required: /(?:전자|회로|실리콘|웨이퍼|물리|전기|공학|트랜지스터|집적)/,
    forbidden: /(?:뉴스|시사)/
  },
  세포: {
    required: /(?:생명|생물|분열|소기관|핵|막|유전|단백질|미토콘드리아)/,
    forbidden: /(?:사회적\s*세포|조직의\s*세포)/
  },
  촉매: {
    required: /(?:화학|반응|효소|활성화\s*에너지|물질)/,
    forbidden: /(?:대화의\s*촉매|변화의\s*촉매)/
  },
  효소: {
    required: /(?:생체|단백질|촉매|기질|활성|반응|소화)/,
    forbidden: /(?:효소식품|효소원액)/
  },
  교류: {
    required: /(?:전류|전압|회로|송전|직류|변압|주파수|전기|전자)/,
    forbidden: /(?:문화\s*교류|정서적\s*교류|국제\s*교류|인적\s*교류|학술\s*교류|상호\s*교류)/
  },
  역학: {
    required: /(?:감염|전염|방역|질병|바이러스|백신|역학\s*조사|보건)/,
    forbidden: /(?:물리|열역학|운동\s*역학|체육|역학과\s*체육|양자\s*역학|동역학|정역학|유체\s*역학)/
  },
  불평등: {
    required: /(?:사회|계층|소득|분배|양극화|기회|격차)/,
    forbidden: /(?:조약|불평등\s*조약|강화도|개항|외교|역사)/
  },
  // 실전 9개 파일 동음이의어·부분일치 문맥 가드 보강
  탐색: {
    required: /(?:이진|BFS|DFS|그래프|트리|알고리즘|코딩|자료구조)/i,
    forbidden: /(?:진로\s*탐색|계열\s*탐색|어휘\s*탐색|자료\s*탐색|관계를\s*탐색|진로와\s*직업|희망\s*분야)/
  },
  극성: {
    required: /(?:분자|결합|공유|전기\s*음성도|쌍극자|무극성|화학)/,
    forbidden: /(?:적극성|적\s*극성|성격|태도|인성)/
  },
  번역: {
    required: /(?:DNA|RNA|mRNA|리보솜|코돈|아미노산|전사|단백질)/i,
    forbidden: /(?:기계\s*번역|영어\s*번역|번역기|일어\s*번역|원서|외국어)/
  },
  선행: {
    required: /(?:환자|의료|임상|병원|의사|간호|사전\s*동의|생명\s*윤리)/,
    forbidden: /(?:선행\s*연구|선행\s*학습|선행\s*사례|선행\s*활동|선행\s*실험)/
  },
  사회성: {
    required: /(?:언어|자의성|역사성|창조성|국어|문법|기호)/,
    forbidden: /(?:체육|스포츠|친구|대인관계|인성|협동|교우|리더십|모둠)/
  },
  공진: {
    required: /(?:회로|RLC|주파수|교류|전류|인덕터|커패시터)/i,
    forbidden: /(?:선박|파도|해양|지진|지구과학|바다)/
  },
  인과관계: {
    required: /(?:상관|통계|확률|데이터|변수|표본|수치|회귀)/,
    forbidden: /(?:인과관계\s*없이|소설|문학|서사|이야기|갈등|인물)/
  },
  넓이: {
    required: /(?:적분|구분구적|곡선|넓이와\s*부피|미적분)/,
    forbidden: /(?:삼각형의\s*넓이|사각형의\s*넓이|사인법칙|코사인법칙|도형|피타고라스)/
  },
  로봇: {
    required: /(?:하드웨어|기계|센서|구동|아두이노|라즈베리|모터|메카|제어|자율|로보틱스|지능형|보행)/,
    forbidden: /(?:로봇\s*계정|로봇\s*기술.*법|윤리|법령|인간과\s*로봇|로봇세)/
  },
  제어: {
    required: /(?:로봇|모터|액추에이터)/,
    forbidden: /(?:단순\s*제어|통제|감정\s*제어|자기\s*제어|제어\s*시스템)/
  },
  호흡: {
    required: /(?:세포|산소|이산화탄소|ATP|미토콘드리아|포도당|유산소|무산소|발효)/,
    forbidden: /(?:체육|스포츠|경기|호흡을\s*맞추|찰떡호흡|팀워크)/
  },
  간섭: {
    required: /(?:파동|빛|슬릿|위상|보강|상쇄|회절|물리)/,
    forbidden: /(?:삼국\s*간섭|내정\s*간섭|부당한\s*간섭|역사)/
  },
  표준화: {
    required: /(?:정규분포|표본|평균|표준편차|확률|통계|Z점수|분포)/,
    forbidden: /(?:매뉴얼\s*표준화|국제\s*표준|규격|업무\s*표준화|표준화된\s*매뉴얼|표준화된\s*양식)/
  },
  '확증 편향': {
    customCheck: (t: string) => {
      const isInvest = /(?:수사|면담|목격자|피해자|진술|경찰|프로파일링|범죄|심리)/.test(t);
      const isMedia = /(?:미디어|뉴스|SNS|플랫폼|유튜브|알고리즘|기사)/.test(t);
      if (isInvest && !isMedia) return false;
      return true;
    }
  },
  '미디어 리터러시': {
    customCheck: (t: string) => {
      const isInvest = /(?:수사|면담|목격자|피해자|진술|경찰|프로파일링|범죄|심리)/.test(t);
      const isMedia = /(?:미디어|뉴스|SNS|플랫폼|유튜브|알고리즘|기사)/.test(t);
      if (isInvest && !isMedia) return false;
      return true;
    }
  }
};

export function findConcepts(t: string, dynamicKeywords?: KeywordScore[] | string[]): ConceptMatch[] {
  const dynamicCandidates = (dynamicKeywords || []).filter((dk) => {
    const term = typeof dk === 'string' ? dk : dk.term;
    const score = (typeof dk === 'object' && dk.score) ? dk.score : 0;
    const tf = (typeof dk === 'object' && dk.tf) ? dk.tf : 1;
    if (!term || term.length < 2) return false;
    if (/^(?:span|class|highlight|div|mark|style|table|tbody|tr|td|br|p|html|body)$/i.test(term)) return false;
    if (/<[^>]*>/.test(term)) return false;
    if (isPredicateOrModifierToken(term) || STOP.has(term) || CONCEPT_EXCLUDE.has(term)) return false;
    if (!isEligibleAcademicConcept(term, score)) return false;
    return (score >= 1.6 || tf >= 2);
  });

  const builtinMatches: ConceptMatch[] = [];
  const seenTerms = new Set<string>();
  const seenNames = new Set<string>();

  for (const c of CONCEPT_IDX) {
    let matched = false;
    if (c.term.length <= 2 && /[A-Za-z]/.test(c.term)) {
      if (new RegExp('(^|[^A-Za-z0-9])' + escRegex(c.term) + '([^A-Za-z0-9]|$)', 'i').test(t))
        matched = true;
    } else if (/[가-힣]/.test(c.term)) {
      const re = new RegExp('(^|[^가-힣])' + escRegex(c.term) + '(?:$|[^가-힣]|(?:은|는|이|가|을|를|의|에|로|와|과|도|만))');
      if (re.test(t)) matched = true;
    } else if (c.re && c.re.test(t)) {
      matched = true;
    }

    if (matched) {
      const termName = CONCEPTS[c.i][0];
      if (STOP.has(c.term) || CONCEPT_EXCLUDE.has(c.term) || STOP.has(termName) || CONCEPT_EXCLUDE.has(termName)) {
        matched = false;
      }
      const guard = CONTEXT_SENSITIVE_CONCEPTS[c.term] || CONTEXT_SENSITIVE_CONCEPTS[termName];
      if (guard) {
        if (guard.customCheck && !guard.customCheck(t)) {
          matched = false;
        }
        if (guard.forbidden && guard.forbidden.test(t)) {
          matched = false;
        }
        if (guard.required && !guard.required.test(t)) {
          matched = false;
        }
      }
    }

    if (matched && !seenNames.has(CONCEPTS[c.i][0])) {
      builtinMatches.push({
        i: c.i,
        term: c.term,
        name: CONCEPTS[c.i][0],
        def: CONCEPTS[c.i][2],
        isBuiltin: true
      });
      seenTerms.add(c.term);
      seenNames.add(CONCEPTS[c.i][0]);
    }
  }

  const dynamicMatches: ConceptMatch[] = [];
  for (const dk of dynamicCandidates) {
    const term = typeof dk === 'string' ? dk : dk.term;
    if (seenTerms.has(term) || seenNames.has(term)) continue;

    if (hasTerm(t, term)) {
      dynamicMatches.push({
        term,
        name: term,
        def: (typeof dk === 'object' && dk.def) ? dk.def : '',
        isDynamic: true
      });
      seenTerms.add(term);
      seenNames.add(term);
      if (dynamicMatches.length >= 4) break;
    }
  }

  const allMatches = [...builtinMatches, ...dynamicMatches];
  return allMatches.filter((m) => {
    if (m.isDynamic) {
      for (const other of allMatches) {
        if (other !== m && other.term.includes(m.term) && other.term.length > m.term.length) {
          return false;
        }
      }
    }
    return true;
  });
}

// ============================================================
// 4. 문장 및 행동 서술어 분석
// ============================================================
export const MANDATORY_EDU_RE = /(?:학교폭력|사이버\s*(?:학교)?폭력|개인정보\s*보호.*교육|스마트폰\s*과의존|장애인식\s*개선\s*교육|성폭력\s*예방|흡연\s*예방|음주\s*예방|자살\s*예방|안전\s*교육|생명존중\s*교육|정보통신윤리교육)/;
export const SIMPLE_PRACTICAL_ACTIVITY_RE = /(?:캐릭터를?\s*(?:표현|묘사)|인물\s*초상화|시화\s*만들기|테셀레이션|사자성어.*영어로|문단별\s*중심\s*내용|운동역량에\s*대한\s*성취감|뒷이야기를\s*창작|무한부성)/;

export const NATURAL_PHENOMENON_CONCEPTS = new Set([
  '세포 호흡', '세포호흡', '신경 전달', '신경전달', '화학 결합', '화학결합',
  '광합성', 'DNA', 'RNA', '단백질 합성', '단백질합성', '효소', '면역', '항상성',
  '진화', '생태계', '유전', '산화 환원', '산화환원', '삼투', '확산',
  '전자기 유도', '전자기유도', '운동량', '충격량', '열역학', '태풍', '지진',
  '판 구조론', '판구조론', '기후 변화', '기후변화', '온실 효과', '온실효과',
  '수소 결합', '수소결합', '반응 속도', '반응속도'
]);

const FLAG_RE: Record<string, RegExp> = {
  inquiry: /탐구|조사|분석|연구|고찰|규명|비교/,
  experiment: /(?:실험|측정|변인|가설|대조군|실험군|조작\s*변인|통제\s*변인|(?:현미경|시료|용액|세포|생장|반응을|결과를)\s*관찰)/,
  make_hw: /(?:하드웨어|회로|센서|아두이노|라즈베리|펠티어|아쿠아포닉스|냉실|장치|키트|시제품|프로토타입|로봇|모터|전동기|발전기|태양광\s*패널|배터리|소자|임베디드|드론|기기\s*제작|장치를\s*제작|장치를\s*만들|키트를\s*제작)/,
  make_sw: /알고리즘|소프트웨어|(?<!재|리)프로그램|(?<!재|리)프로그래밍|애플리케이션|\b앱\b|시뮬레이션|데이터베이스|웹사이트|파이썬|자바스크립트|인공지능|머신러닝|딥러닝|코딩|개발하|구현하/,
  make_content: /(?:인포그래픽|포스터|카드\s*뉴스|카드뉴스|소책자|리플릿|영상|동영상|UCC|홍보물|소식지|팸플릿|뉴스레터|웹툰|만화|자료집|안내서|브로슈어)/,
  make: /제작|설계|코딩|구현|프로그램|앱|만들/,
  present: /발표|설명함|소개함|강연|수업을 (?:기획|진행)|내가 만든 수업/,
  report: /보고서|소논문|논술|에세이|글을 작성|서평|감상문|칼럼|기사/,
  debate: /토론|찬반|반론|입론|반박/,
  read: /읽고|도서|독서|서평/,
  leader: /(?<!국가)(?<!국가\s*)대표(?!팀|적|성|하는)|반장|회장|부회장|부장|팀장|모둠장|조장|리더|총괄/,
  conflict: /갈등|의견\s*차이|의견을\s*조율|조율|중재/,
  coop: /협력|협업|협동|함께|팀원|모둠원|구성원/,
  care: /배려|봉사|나눔|도움|도와|멘토|멘티|도우미|튜터/,
  plan: /(?=[\s\S]*(?:학급|학교|구성원|친구|캠페인|부스|모둠|공동체|지역|급우|부원))(?:기획|운영|캠페인|개선안|행사)/,
  expand: /나아가|심화|추가로|확장|더 나아가|후속|이어서|스스로|자발적|자기\s*주도|주도적/,
  reflect: /깨달|느낌|느꼈|인식|계기|성찰|반성/,
  trait: /학생임|성품|태도가|인성|책임감|성실|정직|꾸준|끈기/
};

const GENERIC_RE = /^(수업에 적극적으로 참여함|성실하게 참여함|수업 태도가 좋음)/;
const PRED_STRONG = /(우수|탁월|뛰어나|뛰어남|돋보|두드러|월등|발군|인상적|발표|제작|설계|코딩|구현|실험|측정|탐구|분석|규명|고찰|기획|운영|개선|주도|중재|조율|설득|반박|도출|선정|구축|개발|적용|해결|비교|평가|작성|제안|주장)(?:하였|했|하였음|했음|하며|하여|함|됨|으며|고|다)/;
const PRED_EVAL = /(우수함|탁월함|돋보임|두드러짐|인상적임|발군임|뛰어남|발휘함|모범이\s?됨|인정받음|호평을\s?받음|칭찬을\s?받음|주목을\s?받음)\s*\.?$/;
const PRED_WEAK = /(소감을\s?밝힘|소감을\s?나눔|알게\s?됨|이해함|배움|익힘|파악함|생각함|기대함|다짐함|되새김|다짐하였음|생각하게\s?됨|관심을\s?가짐|관심을\s?갖게\s?됨|관심이\s?생김|흥미를\s?느낌|흥미를\s?가짐|흥미를\s?갖게\s?됨|계기가\s?됨|계기가\s?되었음|참여함|참여하였음|참석함|경청함|시야를\s?넓힘|안목을\s?넓힘|견문을\s?넓힘|소중함을\s?앎|중요성을\s?앎|필요성을\s?앎|성찰함|반성함)\s*\.?$/;

export interface SentenceItem {
  id?: string;
  sec: '교과' | '창체' | '행특' | '독서' | '기타';
  grade: number;
  subj?: string;
  area?: string;
  text: string;
  qtext?: string;
  rid: number | string;
  pi: number;
  rel: number;
  score: number;
  f: Record<string, boolean>;
  quotes: Array<{ q: string; book: boolean }>;
  concepts: ConceptMatch[];
  skip?: string | null;
  pred?: any;
}

export function predInfo(t: string): { weak: boolean; strong: boolean; evalEnd: boolean; qtext: string | null; skip: string | null } {
  const x = t.replace(/\s+$/, '');
  const weak = PRED_WEAK.test(x);
  const evalEnd = PRED_EVAL.test(x);
  const body = weak ? x.replace(PRED_WEAK, '') : x;
  const strongAll = [...body.matchAll(new RegExp(PRED_STRONG.source, 'g'))];
  const strong = strongAll.length > 0 || evalEnd;
  let qtext: string | null = null;
  if (weak && strongAll.length) {
    const CUT = new RegExp(PRED_STRONG.source.replace(/\(하였\|.*$/, '') + '(?:하였고|했고|하고|하였으며|했으며|하며|하면서|하여|함|하였음|했음)(?=[\\s,.]|$)', 'g');
    const cs = [...body.matchAll(CUT)];
    if (!cs.length) return { weak, strong, evalEnd, qtext: null, skip: (x.match(PRED_WEAK) || [''])[0].replace(/\s*\.$/, '') };
    const m = cs[cs.length - 1];
    let cut = x.slice(0, m.index + m[0].length);
    cut = cut.replace(/(하였고|했고|하고|하였으며|했으며|하며|하면서|하여|하였음|했음)$/, '함');
    if (cut.length >= 15) qtext = cut;
  }
  return { weak, strong, evalEnd, qtext, skip: weak && !qtext ? (x.match(PRED_WEAK) || [''])[0].replace(/\s*\.$/, '') : null };
}

export function analyze(s: SentenceItem, ctx: { major: string; majorKw: string[]; dynamicKeywords?: KeywordScore[] }): SentenceItem {
  const t = s.text;
  const f: Record<string, boolean> = {};
  for (const k in FLAG_RE) f[k] = FLAG_RE[k].test(t);

  const quotes: Array<{ q: string; book: boolean }> = [];
  const qre = /[‘'"“「『<《]([^’'"”」』>》]{2,70})[’'"”」』>》]/g;
  let m: RegExpExecArray | null;
  while ((m = qre.exec(t))) {
    let q = stripHtmlTags(m[1]).trim();
    q = q.replace(/^[<'"“「『]+|[>'”」』]+$/g, '').trim();
    // HTML 태그 잔재 및 영문 마크업 차단
    if (q.length < 2 || /^(?:span|class|highlight|div|mark|style|table|tbody|tr|td|br|p|html|body|span class)$/i.test(q) || /class\s*=/i.test(q)) {
      continue;
    }
    const after = t.slice(m.index + m[0].length, m.index + m[0].length + 14);
    const isBook =
      (/^\s*\(/.test(after) && /^\s*\([^)]{1,25}\)\s*(?:을|를|의)?\s*(?:읽|통해|바탕)/.test(after)) ||
      /^(?:을|를)\s*읽/.test(after.replace(/^\([^)]*\)/, '')) ||
      (/^\([^)]{1,20}\)/.test(after) && /읽|독서|서평/.test(t));
    quotes.push({ q, book: isBook });
  }

  const concepts = findConcepts(t, ctx && ctx.dynamicKeywords);
  let rel = 0;
  if (ctx.majorKw && ctx.majorKw.length) {
    for (const k of ctx.majorKw) {
      if (k.length >= 2 && t.includes(k)) rel++;
    }
  }

  let score = ({ 교과: 1.0, 창체: 0.9, 행특: 0.5, 독서: 0.6, 기타: 0.8 } as Record<string, number>)[s.sec] || 0.8;
  if (s.area === '진로활동') score += 0.3;
  if (s.area === '자율활동') score -= 0.1;
  score += Math.min(quotes.length, 2) * 0.8 + Math.min(concepts.length, 3) * 0.6 + Math.min(rel, 3) * 0.9;

  // 문맥 가드 1: 실험(experiment) - 교사 관찰평가, 소감, 문헌조사, 단순 비유 표현 완전 배제
  if (f.experiment) {
    const isFalseExp = /(?:실험적\s*태도|객관적으로\s*측정하는\s*지표|실험\s*활동에\s*흥미|실험\s*설계와.*직업으로\s*이해|소감문을\s*작성|실험\s*전반을\s*주도|임상실험|임상\s*시험)/.test(t);
    const hasSpecificExpAction = /(?:실험을\s*(?:설계|진행|수행)|비교하는\s*실험|측정\s*실험|자유낙하.*실험|가설을\s*검증|대조군과\s*실험군|변인을?\s*(?:통제|조작)|오차를?\s*(?:분석|측정)|농도에\s*따른.*실험|용액의\s*종류.*실험|현미경으로\s*관찰)/.test(t);
    if (isFalseExp || !hasSpecificExpAction) {
      f.experiment = false;
      if (/(?:탐구|조사|분석|연구|고찰)/.test(t)) {
        f.inquiry = true;
      }
    }
  }

  // 문맥 가드 2: 하드웨어(make_hw) - 인문/사회 과목 금지 및 실제 제작 행동 검증
  const isHumanities = s.subj && /(?:국어|문학|화법|작문|화작|독서|사회|윤리|도덕|역사|한국사|지리|영어|일본어|한문|음악|미술|체육)/.test(s.subj);
  if (isHumanities) {
    f.make_hw = false;
  } else if (f.make_hw) {
    const isFalseHw = /(?:로봇\s*계정|로봇\s*기술|생산\s*활동)/.test(t);
    const hasActualHwAction = /(?:직접\s*(?:제작|설계)|회로를?\s*구성|아두이노|센서를?\s*설치|소자를?\s*결합|장치를?\s*제작|키트를?\s*제작|시제품|프로토타입)/.test(t);
    if (isFalseHw || !hasActualHwAction) {
      f.make_hw = false;
    }
  }

  // 문맥 가드 3: 소프트웨어(make_sw) - 직접 코딩/개발 행동 검증 및 단순 활용 배제 (재프로그래밍 등 배제)
  if (f.make_sw) {
    const isFalseSw = /(?:프로그램을\s*(?:활용|적용|비교)|교육\s*프로그램|사례를\s*조사|알고리즘\s*도입|통계적\s*추정\s*알고리즘|AI\s*프로그램\s*활용|재프로그래밍|리프로그래밍)/.test(t);
    const hasActualSwDev = /(?:코딩|프로그래밍|코드를\s*작성|앱을\s*(?:제작|개발)|프로그램을\s*개발|직접\s*구현|소프트웨어.*개발)/.test(t);
    if (isFalseSw || !hasActualSwDev || /(?:재프로그래밍|리프로그래밍)/.test(t)) {
      f.make_sw = false;
    }
  }

  // 문맥 가드 3-1: 콘텐츠 제작(make_content) - 단순 시청/분석 배제 및 직접 제작 동사 검증
  if (f.make_content) {
    const isPassive = /(?:영상을\s*시청|영상을\s*감상|콘텐츠를\s*분석|미디어\s*스트리밍|장치까지\s*연결|콘텐츠\s*분석|영상\s*시청|영상\s*자료를\s*활용)/.test(t);
    const hasDirectProduction = /(?:제작|만들|디자인|편집|구축|개발|그리|작성)/.test(t);
    const isFuturePlan = /(?:시도해\s*보고\s*싶|계획을\s*공유|제작해\s*보고\s*싶|만들어\s*보고\s*싶|탐색에도\s*열의)/.test(t);
    if (isPassive || !hasDirectProduction || isFuturePlan) {
      f.make_content = false;
    }
  }

  // [구조 6] 2. 미래 계획 문장은 제작 관련 플래그 일괄 비활성화
  const isFuturePlan = /(?:시도해\s*보고\s*싶|계획을\s*공유|제작해\s*보고\s*싶|만들어\s*보고\s*싶|탐색에도\s*열의)/.test(t);
  if (isFuturePlan) {
    f.make_content = false;
    f.make = false;
    f.make_hw = false;
    f.make_sw = false;
  }

  // [구조 1] 예체능 단순 실기 문장은 전공 지원 시 우선순위 페널티
  const isArtPe = /(?:미술|음악|체육)/.test(s.subj || s.area || '');
  if (isArtPe && SIMPLE_PRACTICAL_ACTIVITY_RE.test(t)) {
    score -= 1.0;
  }

  // 문맥 가드 3-2: 리더십(leader) - 국가대표, 대표팀, 대표적 등 배제
  if (f.leader) {
    if (/(?:국가대표|대표팀|대표적|대표하는|대표곡)/.test(t)) {
      const strippedT = t.replace(/(?:국가대표|대표팀|대표적|대표하는|대표곡)/g, '');
      if (!/(?:반장|회장|부회장|부장|팀장|모둠장|조장|리더|총괄|동아리장|학생회)/.test(strippedT)) {
        f.leader = false;
      }
    }
  }

  // 문맥 가드 4: 갈등(conflict) - 교과 지문/인물 간 갈등 배제 및 실제 팀 갈등 중재 검증
  if (f.conflict) {
    const isFalseConflict = /(?:민원\s*갈등|갈등\s*장면(?:\s*사례\s*분석)?|교실\s*갈등.*활동(?:을|\s*설계)|드라마.*갈등\s*장면|조절\s*T세포.*조율|호흡과\s*보폭을\s*조율|이해관계자.*조율.*방법을\s*탐구|도덕적\s*갈등|인물\s*간\s*갈등|민족\s*갈등|사회적\s*갈등|신분.*갈등)/.test(t);
    const hasRealConflict = /(?:의견\s*차이|갈등을\s*(?:조율|중재|해결)|입장\s*차이|갈등\s*상황)/.test(t) && /(?:급우|동료|친구|팀원|모둠원|부원|구성원|학급)/.test(t);
    if (isFalseConflict || !hasRealConflict || /(?:소감을\s*작성|활동을\s*설계|가사를\s*찾아|견해를\s*논리적으로\s*서술|심화\s*탐구를\s*진행)/.test(t)) {
      f.conflict = false;
    }
  }

  // 문맥 가드 5: 협동(coop) - 국제협력 및 비협업 어휘 배제, 실제 동료 협업 검증
  if (f.coop) {
    const isFalseCoop = /(?:함께\s*모여|함께라면|함께\s*고찰|함께\s*배양|방식과\s*함께|사회\s*구성원|좌우명|국제적(?:인)?\s*협력|국제\s*협력|국가\s*간\s*협력)/.test(t);
    const hasRealCoop = /(?:모둠원|팀원|조원|친구들|동료|급우|부원).*(?:협업|협동|협력|도와주며|역할\s*분담|함께\s*해결)/.test(t);
    if (isFalseCoop || !hasRealCoop || /(?:소감을\s*작성|활동을\s*설계|가사를\s*찾아|견해를\s*논리적으로\s*서술|심화\s*탐구를\s*진행)/.test(t)) {
      f.coop = false;
    }
  }

  // 문맥 가드 5-1: 배려/봉사(care) - 단순 감상/어휘 학습/비공동체 활동 배제
  if (f.care) {
    if (/(?:소감을\s*작성|활동을\s*설계|가사를\s*찾아|견해를\s*논리적으로\s*서술|심화\s*탐구를\s*진행)/.test(t)) {
      f.care = false;
    }
  }

  // 문맥 가드 6: 기획(plan) - 단순 직업 탐색 배제 및 실제 프로젝트 기획 검증
  if (f.plan) {
    const isFalsePlan = /(?:특수교육을\s*운영할|광고기획자|기획하는\s*사람)/.test(t);
    const hasRealPlan = /(?:학급|학교|구성원|친구|캠페인|부스|모둠|공동체|지역|급우|부원).*(?:기획|운영|캠페인|개선안|행사를?\s*(?:기획|추진|운영))/.test(t);
    if (isFalsePlan || !hasRealPlan) {
      f.plan = false;
    }
  }

  // 하드웨어 장치 제작은 콘텐츠/포스터 제작에서 배제
  if (f.make_hw) {
    f.make_content = false;
  }

  // 단순 원리/기술 발표는 발표(present)로 전환
  if (f.make || f.make_sw || f.make_content) {
    if (/(?:제작\s*원리|제작\s*기술|제작\s*과정|원리를\s*발표|기술을\s*소개|원리를\s*소개|동향을\s*소개)/.test(t) && !/(?:직접|스스로|개발하|구현하|제작하|코딩하|설계하|만들)/.test(t)) {
      f.make = false;
      f.make_sw = false;
      f.make_content = false;
      f.present = true;
    }
  }

  ['inquiry', 'experiment', 'make', 'report', 'debate', 'read', 'present'].forEach((k) => {
    if (f[k]) score += 0.35;
  });

  if (t.length < 30) score -= 0.8;
  if (/^(이를|이러한|이와|이에|이 과정|이후|그 결과|해당|위 )/.test(t)) score -= 1.3;
  if (t.length > 60) score += 0.2;
  if (GENERIC_RE.test(t)) score -= 2;

  const pi = predInfo(t);
  if (pi.strong) score += 0.6;
  if (pi.evalEnd) score += 0.3;
  if (pi.skip) score -= 9;

  return { ...s, f, quotes, concepts, rel, score, pred: pi, skip: pi.skip, qtext: pi.qtext || undefined };
}

// ============================================================
// 5. 과거 인용절 변환 및 4종 리드문 생성 (lead)
// ============================================================
export function pastOf(stemLast: string): string {
  const v = jung(stemLast);
  return v === 0 || v === 8 || v === 2 || v === 9 ? '았' : '었';
}

export function contractPast(st: string): string {
  const map: Record<string, string> = {
    보: '보았', 주: '주었', 두: '두었', 나누: '나누었', 하: '했', 되: '되었', 오: '왔', 가: '갔',
    서: '섰', 내: '냈', 세우: '세웠', 배우: '배웠', 키우: '키웠', 다루: '다루었', 이루: '이루었',
    치: '쳤', 키: '켰', 리: '렸', 기: '겼', 지: '졌', 시: '셨', 피: '폈', 끼: '꼈',
    르: '렀', 우: '웠', 추: '췄', 쓰: '썼', 크: '컸', 뜨: '떴', 트: '텄'
  };
  if (map[st]) return map[st];
  const v = jung(st);
  if (v === 0) return addJong(st, 20);
  if (v === 4) return addJong(st, 20);
  if (v === 20)
    return addJong(
      stripJong(
        String.fromCharCode(
          0xAC00 + Math.floor((st.charCodeAt(0) - 0xAC00) / 588) * 588 + 6 * 28
        )
      ),
      20
    );
  if (v === 13)
    return addJong(
      String.fromCharCode(
        0xAC00 + Math.floor((st.charCodeAt(0) - 0xAC00) / 588) * 588 + 14 * 28
      ),
      20
    );
  if (v === 8)
    return addJong(
      String.fromCharCode(
        0xAC00 + Math.floor((st.charCodeAt(0) - 0xAC00) / 588) * 588 + 9 * 28
      ),
      20
    );
  return st + pastOf(st);
}

const IRREGULAR_M_PAST: Record<string, string> = {
  읽음: '읽었다고',
  밝힘: '밝혔다고',
  이끎: '이끌었다고',
  만듦: '만들었다고',
  베풂: '베풀었다고',
  들음: '들었다고',
  걸음: '걸었다고',
  물음: '물었다고',
  도움: '도왔다고',
  배움: '배웠다고',
  키움: '키웠다고',
  지음: '지었다고',
  이음: '이었다고',
  품음: '품었다고',
  찾음: '찾았다고',
  맡음: '맡았다고',
  맡김: '맡겼다고',
  알림: '알렸다고',
  울림: '울렸다고',
  살림: '살렸다고',
  열림: '열렸다고',
  열음: '열었다고',
  닫음: '닫았다고',
  넓힘: '넓혔다고',
  높임: '높였다고',
  낮춤: '낮췄다고',
  맞춤: '맞췄다고',
  줄임: '줄였다고',
  늘림: '늘렸다고',
  돋보임: '돋보였다고'
};

export function balanceQuotes(str: string): string {
  if (!str) return str;
  let s = str.trim();
  // [구조 4] 1. 앞머리 누락된 여는 따옴표 복원: "단어'(조사)" 형태
  if (!/^['‘"]/.test(s) && /^[가-힣A-Za-z0-9\s(),·&\-]{2,35}'(?:을|를|이|가|은|는|의|에|에서|으로|로|과|와|라는|이라는)/.test(s)) {
    s = "'" + s;
  }
  // 홀수 개의 작은따옴표 체크 및 앞머리 외톨이 여는 따옴표 즉시 제거
  if (/^['‘]/.test(s)) {
    const qCount = (s.match(/['‘'’]/g) || []).length;
    if (qCount % 2 !== 0) {
      s = s.replace(/^['‘]\s*/, '').trim();
    }
  }
  const singleQuotes = s.match(/['‘'’]/g) || [];
  if (singleQuotes.length % 2 !== 0) {
    // [구조 4] 3. 절대 문장 끝 종결어미(~다, ~함, ~음, ~고) 또는 ~되어 있는데 뒤에 따옴표를 억지로 붙이지 말 것
    if (/(?:다|함|음|고|임|되어\s*있는데|기재되어\s*있는데|점\s*등)[.?!, ]*$/.test(s)) {
      s = s.replace(/(?<![가-힣A-Za-z0-9])'|'(?![가-힣A-Za-z0-9])/g, '').trim();
    } else {
      s = s + "'";
    }
  }
  // 종결어미 직후 '되어 있는데 방지 (예: 밝혔다고' 되어 있는데 -> 밝혔다고 되어 있는데)
  s = s.replace(/(?<=[다함음고임])'\s*(?=되어\s*있는데|기재되어\s*있는데|,)/g, ' ');
  return s;
}

export function cleanClauseQuotes(str: string | null): string | null {
  if (!str) return str;
  let s = str.trim();
  // [구조 4] 1. 문두 여는 따옴표 누락 복원
  if (!/^['‘"]/.test(s) && /^[가-힣A-Za-z0-9\s(),·&\-]{2,35}'(?:을|를|이|가|은|는|의|에|에서|으로|로|과|와|라는|이라는)/.test(s)) {
    s = "'" + s;
  }
  if (/^['‘]/.test(s)) {
    if (/^['‘][^'‘’]+['’]$/.test(s)) {
      s = s.slice(1, -1).trim();
    } else {
      const qCount = (s.match(/['‘'’]/g) || []).length;
      if (qCount % 2 !== 0 || !/[''’]/.test(s.slice(1))) {
        s = s.replace(/^['‘]\s*/, '').trim();
      }
    }
  }
  return balanceQuotes(s);
}

export function isValidInquiryTopic(q: string): boolean {
  if (!q) return false;
  const t = q.trim();
  if (t.length <= 2) return false;

  // [구조 4] 2. 조사·어미로 시작하거나 조사로 끝나는 문자열 100% 차단
  if (/^(?:을|를|이|가|은|는|의|에|에서|으로|로|과|와|도|만)\s+/.test(t) || /(?:의|을|를|은|는|이|가)$/.test(t)) {
    return false;
  }
  // [구조 4] 2. 문학 갈래명/교과 용어 단편 차단
  if (/^(?:고려가요|향가|시조|가사|현대시|고전소설|신소설)$/.test(t)) {
    return false;
  }
  // [구조 4] 2. 자기성찰/흥미검사 활동명, 영화/작품 제목 단편 차단
  if (/(?:내\s*피드가\s*나를\s*말해준다|직업\s*가치관\s*검사|진로\s*로드맵|컨택트)/.test(t)) {
    return false;
  }

  // 1. 추상어/고유어/과목 차단
  if (/^(?:평온함|콩레이|힌남노|와리칸|모나리자|국어|문학|수학|영어|사회|과학|음악|미술|체육|도덕|윤리|독서|화작|기하|물리|화학|생명|지구|한문|일본어|희망|행복|사랑|우정|나눔|배려|위로|슬픔|열정|노력|성실|도전|꿈|자신감)$/.test(t)) {
    return false;
  }
  // 1-1. 교과목명 차단 (2022 개정 교육과정 포함)
  if (/^(?:화법과\s*작문|화법과\s*언어|독서와\s*작문|공통국어[12]?|공통영어[12]?|공통수학[12]?|통합사회[12]?|통합과학[12]?|언어와\s*매체|독서와\s*문법|문학과\s*매체|수학[ⅠⅡI0-9_]*|미적분|확률과\s*통계|기하|물리학[ⅠⅡI0-9_]*|화학[ⅠⅡI0-9_]*|생명과학[ⅠⅡI0-9_]*|지구과학[ⅠⅡI0-9_]*|한국사|동아시아사|세계사|생활과\s*윤리|윤리와\s*사상|사회·문화|정치와\s*법|경제|세계지리|한국지리)$/.test(t)) {
    return false;
  }
  // 1-2. 데이터베이스/사이트명 차단
  if (/(?:한국고전종합자료|DBpia|디비피아|RISS|리스|KISS|포털사이트|구글|네이버|위키백과|나무위키|통계청|국회도서관)/.test(t)) {
    return false;
  }
  // 1-3. 영어 문법·어휘 조각 차단
  if (/(?:하는\s*경향이\s*있다|tend\s*to|경향이\s*있다|할\s*수\s*있다)/.test(t)) {
    return false;
  }
  // 2. 쉼표 나열 어휘 목록 차단 (예: '부과, 예의, 따르다', '불안, 칭얼거리다, 제거')
  if (/,/.test(t)) return false;
  // 3. 일반 교육활동명 차단
  if (/(?:한\s*학기\s*한\s*권|독서\s*활동|독서\s*마라톤|수행평가|동아리\s*활동|발표회|학습\s*플래너|아침\s*독서|멘토링|모둠\s*활동|자율\s*활동)/.test(t)) {
    return false;
  }
  // 4. 단순 인용 문구, 시 제목, 문학 구절, 단순 명언 차단 (예: '희망에 대해서', '새벽 첫차', '~한 일이 없는 사람이다', '~배부른 사람이 아니라')
  if (/(?:…|\.{2,}|~|첫차|새벽\s*첫차|진정한\s*부자|에\s*대해서|에\s*대하여|에\s*관해서|을\s*위하여|사람이다|아니다|사람이\s*아니라|일이\s*없는\s*사람|것이다|때문이다)$/.test(t)) {
    return false;
  }
  if (/(?:새로운\s*과학적\s*기술|생명력\s*충만|삶에\s*대한\s*지향|아니라\s+.*사람|책의\s*문구에\s*공감|박수\s*하다)/.test(t)) {
    return false;
  }
  if (/(?:에\s*대한|에서\s*오는)\s*(?:지향|동경|갈등)$/.test(t)) {
    return false;
  }
  if (/^[가-힣]{2,4}하다$/.test(t)) {
    return false;
  }
  // 5. 비학술적 서술어 파편/동사어간 차단 (예: '칭얼거리다', '나누며', '주어진', '모둠원', '학교생활')
  if (/(?:칭얼거리다|나누며|주어진|모둠원|학교생활|친구들|소중히|단순히|필요한|봄으로써|점에서|보여줌|해결하)$/.test(t)) {
    return false;
  }
  // 6. 감정, 추상, 단순 슬로건 문구 차단
  if (/^(?:희망|행복|사랑|우정|나눔|배려|위로|슬픔|열정|노력|성실|도전|꿈|자신감)$/.test(t)) {
    return false;
  }
  return true;
}

export function toPastClause(chunk: string): string | null {
  let stripped = stripHtmlTags(chunk).trim();
  // 양끝 전체가 온전히 하나의 따옴표로 감싸진 경우에만 외곽 따옴표 벗기기 (내부 인용구 보존)
  if (/^['"‘“]([\s\S]*)['"’”]$/.test(stripped)) {
    const inner = stripped.slice(1, -1);
    if (!inner.includes("'") && !inner.includes('"') && !inner.includes('‘') && !inner.includes('“')) {
      stripped = inner.trim();
    }
  }
  const c = stripped.replace(/[.,;]+$/, '').replace(/\s+/g, ' ');

  // 부사절/연결 어미로 끝나는 경우 '했다고' 변환 불가 (위했다, 통했다 등 어색한 서술어 방지)
  if (/(?:위해|위하여|통해|통하여|대해|대하여|비해|비하여|바탕으로|의해|의하여|있으며|없으며|관해|관하여|따라|따른|관한|대한|위한|통한|있고|없고)$/.test(c)) {
    return null;
  }

  // 1. 불규칙 명사형 종결어미(~음) 우선 처리
  for (const [k, v] of Object.entries(IRREGULAR_M_PAST)) {
    if (c.endsWith(k)) {
      return balanceQuotes(c.slice(0, -k.length) + v);
    }
  }

  // 2. ~임 종결 처리 (받침 유무에 따라 '이었다고' / '였다고' 엄격 분기)
  if (c.endsWith('임') && c.length >= 2) {
    const prevChar = c.slice(-2, -1);
    if (HANGUL.test(prevChar)) {
      return balanceQuotes(c.slice(0, -1) + (hasBatchim(prevChar) ? '이었다고' : '였다고'));
    }
  }

  // 형용사 연결어미(~하고)가 단독으로 절단된 경우 변환 거부 (단순했다고, 명확했다고 등 방지)
  if (/(?:단순|명확|정확|완전|솔직|풍부|균형|적절|생생|친절|유연|자신\s*있|깊이\s*있)하고$/.test(c)) {
    return null;
  }

  const rules: Array<[RegExp, string]> = [
    [/(하였음|했음|하였다|했다|함|하였고|했고|하고|하며|하였으며|했으며|하여|해서)$/, '했다고'],
    [/(되었음|됐음|되었다|됨|되었고|되고|되며|되어|돼)$/, '되었다고'],
    [/(보였음|보임|보이며|보이고|보여)$/, '보였다고'],
    [/(도움|도우며|도와)$/, '도왔다고'],
    [/(밝힘|밝히며|밝히고)$/, '밝혔다고'],
    [/(가짐|가지며|가지고|갖고|가져)$/, '가졌다고'],
    [/(느낌|느끼며|느끼고|느껴)$/, '느꼈다고'],
    [/(깨달음|깨닫고|깨달으며|깨달아)$/, '깨달았다고'],
    [/(있음|있고)$/, '있었다고'],
    [/(없음|없고)$/, '없었다고'],
    [/(였음|였으며|였고)$/, '였다고'],
    [/(이었음|이었다|이었고|이었으며)$/, '이었다고'],
    [/냄$|내며$|내고$/, '냈다고'],
    [/씀$|쓰며$|쓰고$/, '썼다고']
  ];
  for (const [re, rep] of rules) {
    if (re.test(c)) {
      let res = c.replace(re, rep);
      res = res.replace(/있었다고\s*했다고/g, '있었다고 설명했다고').replace(/되었다고\s*했다고/g, '되었다고 밝혔다고');
      return balanceQuotes(res);
    }
  }

  // 3. 이미 과거시제(았/었/였/했)인 ~음 종결 처리: stem + '다고' (인상적이었음 -> 인상적이었다고, '인상적이었었다' 금지)
  if (c.endsWith('음') && c.length >= 2) {
    const stem = c.slice(0, -1);
    const stemLast = stem.slice(-1);
    if (/(?:았|었|였|했)$/.test(stem)) {
      return balanceQuotes(stem + '다고');
    }
    if (HANGUL.test(stemLast)) {
      return balanceQuotes(stem + pastOf(stemLast) + '다고');
    }
  }

  const last = c.slice(-1);
  const prev = c.slice(0, -1);
  if (!HANGUL.test(last)) return null;
  const j = jong(last);
  if (j === 16) {
    const st = stripJong(last);
    return balanceQuotes(prev + contractPast(st) + '다고');
  }
  return null;
}

const LEAD_RE = /^(또한|특히|나아가|더 나아가|이어|이어서|그리고|아울러|더불어|이후|이를 통해|이를 바탕으로|이 과정에서|그 결과|이에|또)\s*,?\s*/;

export function clauseFor(s: SentenceItem, anchor?: string | null): string | null {
  const fullText = stripHtmlTags(s.qtext || s.text).replace(/\s*\.$/, '').replace(LEAD_RE, '');
  let cleanFull = cleanKoreanSpacing(fullText);
  // 잔여 노이즈 제거: 시간 표기((25시간) 등) 및 앞머리 표 잔여 헤더 완전 제거
  cleanFull = cleanFull.replace(/\(?\s*\[?\s*\d+\s*시간\s*\]?\s*\)?/g, '').replace(/^(?:교사|과학|에서|에는|시간)\s+/, '').replace(/^시간\s+/, '').trim();

  // 내부 마침표가 있을 경우 단일 문장으로 분리 후 anchor가 있는 문장 선택 (날짜 분절 방지)
  const singleSents = cleanFull.split(/(?<=(?<!\d)[.?!])\s+/).map((x) => x.trim()).filter((x) => x.length >= 8);
  let t = cleanFull;
  if (singleSents.length > 1) {
    if (anchor) {
      t = singleSents.find((x) => x.includes(anchor)) || singleSents[0];
    } else {
      t = singleSents[0];
    }
  }
  t = t.replace(/\s*\.$/, '').replace(LEAD_RE, '').trim();

  // [구조 2] 1. 절 압축은 문장 길이가 110자 이상일 때만 시도
  if (t.length < 110) {
    const c = toPastClause(t);
    if (c) return cleanClauseQuotes(c);
  }

  // 인용부호('...', "...") 범위를 보호하며 절단 분리
  const quoteRanges: Array<[number, number]> = [];
  const qre = /['"‘“][^'"’”]*['"’”]/g;
  let qm: RegExpExecArray | null;
  while ((qm = qre.exec(t)) !== null) {
    quoteRanges.push([qm.index, qm.index + qm[0].length]);
  }
  const isInsideQuote = (pos: number) => quoteRanges.some(([start, end]) => pos >= start && pos <= end);

  // 형용사 연결어미(~하고 명확한 등)는 절단 금지
  const delimRe = /(?<=(?:하며|하여|하였으며|했으며|하였고|했고|이며|으며|였으며|되며|되어|되고|읽고|보고|통해|바탕으로|위해|위하여|결과|후|하고(?!\s*(?:명확|자신|정확|깊이|새로|다양|자세|구체|효과|창의|체계|[가-힣]{2,4}[은는한적])))),?\s+/g;
  const parts: string[] = [];
  let lastPos = 0;
  let dm: RegExpExecArray | null;
  while ((dm = delimRe.exec(t)) !== null) {
    const cutPos = dm.index;
    if (!isInsideQuote(cutPos)) {
      const seg = t.slice(lastPos, cutPos).trim();
      if (seg) parts.push(seg);
      lastPos = cutPos;
    }
  }
  const tailSeg = t.slice(lastPos).trim();
  if (tailSeg) parts.push(tailSeg);

  if (!parts.length) parts.push(t);

  let idx = 0;
  if (anchor) {
    idx = parts.findIndex((p) => p.includes(anchor));
    if (idx < 0) idx = 0;
  }
  let seg = parts[idx];
  let j = idx;
  while (j < parts.length - 1 && (seg.length < 28 || !toPastClause(seg))) {
    j++;
    seg += ' ' + parts[j];
    if (seg.length > 120) break;
  }

  // [구조 2] 앞 절과 ~하며/~하고로 긴밀히 이어진 경우 압축하지 말고 원문 전체 유지
  if (idx > 0 && /(?:하며|하고|하였고|했고)$/.test(parts[idx - 1])) {
    return cleanClauseQuotes(toPastClause(t));
  }

  // 따옴표 불균형 검사: 짝이 맞지 않으면 절단 파편 폐기하고 전체 온전한 문장 사용
  const singleQuotesCount = (seg.match(/['‘]/g) || []).length;
  const doubleQuotesCount = (seg.match(/["“]/g) || []).length;
  if (singleQuotesCount % 2 !== 0 || doubleQuotesCount % 2 !== 0) {
    return cleanClauseQuotes(toPastClause(t));
  }

  // [구조 2] 앞머리 불완전 목적어/부사구/동사구로 시작하는 파편 감지 시 압축하지 말고 원문 전체 유지
  seg = seg.replace(LEAD_RE, '');
  const BAD_SEG_START_RE = /^(?:[…,]|\s*(?:완성도를|책임감\s*있게|있던|접하는|있으며|없으며|통해|위해|대해|기른|보인|높인|갖춘|펼친|이끈|이룬|담은|담아|거쳐|해석하였으\s*며|산출하는\s*과정|에는|기억함으로|요소\s*간의|시간\s*탐구|[가-힣]+(?:를|을|에|으로|로|의|과|와)\s+(?:높이고자|위해|하고자|하려는|바탕으로)))/i;
  if (BAD_SEG_START_RE.test(seg) || seg.length < 20) {
    return cleanClauseQuotes(toPastClause(t));
  }

  // [구조 2] 2. 뒷머리 절단으로 인한 템플릿 불일치 방지:
  // 문장에 실험/관찰/측정/검증이 있는데 절단된 seg에서 해당 단어가 날아갔다면 압축하지 말고 전체 문장 유지
  if (s.f?.experiment && /(?:실험|관찰|측정|검증)/.test(t) && !/(?:실험|관찰|측정|검증)/.test(seg)) {
    return cleanClauseQuotes(toPastClause(t));
  }

  seg = seg.replace(/^(?:있으며|없으며|통해|위해|대해|기른|보인|높인|갖춘|펼친|이끈|이룬|담은|담아|거쳐|통하여|위하여|대하여|바탕으로|에는|교사|과학|에서)\s+/g, '');
  if (seg.length < 18) {
    return cleanClauseQuotes(toPastClause(t));
  }

  const res = toPastClause(seg);
  return cleanClauseQuotes(res || toPastClause(t) || seg);
}

export function recordLabel(s: SentenceItem): string {
  const g = s.grade ? `${s.grade}학년 ` : '';
  const cleanSubj = cleanLabelText(s.subj || '').replace(new RegExp(`^${g.trim()}\\s*`), '').trim();
  const cleanArea = cleanLabelText(s.area || '').replace(new RegExp(`^${g.trim()}\\s*`), '').trim();
  if (s.sec === '교과') return `(${g}${cleanSubj || '교과'})`;
  if (s.sec === '창체') return `(${g}${cleanArea || '창체'})`;
  if (s.sec === '행특') return `(${g}행동특성 및 종합의견)`;
  if (s.sec === '독서') return `(${g}독서)`;
  return g ? `(${g.trim()})` : '';
}

export function lead(s: SentenceItem, anchor?: string | null, variantIdx?: number): string {
  const c = clauseFor(s, anchor);
  const label = recordLabel(s);
  let v = typeof variantIdx === 'number' ? variantIdx % 4 : ((s.pi || 0) + (typeof s.rid === 'number' ? s.rid : 0)) % 4;
  if (c) {
    const balancedC = cleanClauseQuotes(c) || balanceQuotes(c);
    // [마감 4 & 최종 정밀] 리드문 내부에 '인상적' 단어가 포함되어 있을 때 4번 화법(~는 점이 인상적인데,) 대신 0번 화법 선택
    if (/인상적/.test(balancedC) && v === 3) {
      v = 0;
    }
    // [구조 4] 4. 이중 인용 어미(~다고 소개했다고 되어 있는데) 완화:
    // 리드문이 ~다고 (?:소개|설명|발표|제시|서술|강조)했다로 끝날 때 v=0(~고 되어 있는데) 대신 v=1(기록을 보면 ~다는 내용이 눈에 띕니다.)을 선택
    if (/다고\s*(?:소개|설명|발표|제시|서술|강조)했다고$/.test(balancedC) && v === 0) {
      v = 1;
    }
    if (v === 1) return balanceQuotes(`${label} 기록을 보면 ${balancedC.replace(/고$/, '는')} 내용이 눈에 띕니다.`);
    if (v === 2) return balanceQuotes(`${label} 활동에서 ${balancedC} 기재되어 있는데,`);
    if (v === 3) return balanceQuotes(`${label} 관련하여 ${balancedC.replace(/고$/, '는')} 점이 인상적인데,`);
    return balanceQuotes(`${label} ${balancedC} 되어 있는데,`);
  }
  let t = stripHtmlTags(s.qtext || s.text).replace(/\s*\.$/, '');
  t = cleanKoreanSpacing(t).replace(/\(?\s*\[?\s*\d+\s*시간\s*\]?\s*\)?/g, '').replace(/^(?:교사|과학|에서|에는|시간)\s+/, '').replace(/^시간\s+/, '').trim();
  const single = t.split(/(?<=(?<!\d)[.?!])\s+/)[0] || t;
  if (single.length > 75) t = single.slice(0, 72) + '…';
  else t = single;
  const balancedT = balanceQuotes(t);
  if (/인상적/.test(balancedT) && v === 3) {
    v = 0;
  }
  if (v === 1) return balanceQuotes(`${label} 기록을 보면 ‘${balancedT}’라는 내용이 눈에 띕니다.`);
  if (v === 2) return balanceQuotes(`${label} 활동에서 ‘${balancedT}’라고 기재되어 있는데,`);
  if (v === 3) return balanceQuotes(`${label} 관련하여 ‘${balancedT}’라는 점이 인상적인데,`);
  return balanceQuotes(`${label} ‘${balancedT}’라는 기록이 있는데,`);
}

// ============================================================
// 6. 후보 문항 구조 및 candidatesFrom (13개 핵심 유형)
// ============================================================
export interface CandidateQuestion {
  b: 'A' | 'C' | 'P' | 'M' | 'D' | 'T';
  k: string;
  p: number;
  type: string;
  tplId?: string;
  typeGroup?: string;
  src?: string;
  srcBadge?: string;
  catGroup?: 'univ_q' | 'cases' | 'qb' | 'record' | 'common' | 'fusion' | 'past';
  text: string;
  rtext?: string;
  rlab?: string;
  sref?: SentenceItem;
  ans?: string | null;
  ansLabel?: string | null;
  tip?: string | null;
  tails?: string[];
  points?: string[];
}

function Q(o: Partial<CandidateQuestion> & { b: 'A' | 'C' | 'P' | 'M' | 'D' | 'T'; k: string; p: number; type: string; text: string }): CandidateQuestion {
  return {
    ans: null,
    tip: null,
    tails: [],
    src: '생기부',
    ...o
  };
}

function pick(arr?: string[]): string {
  if (!arr || !arr.length) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}

export function candidatesFrom(s: SentenceItem, ctx: { major: string; majorKw: string[] }): CandidateQuestion[] {
  const out: CandidateQuestion[] = [];
  const M = ctx.major || '지원 학과';
  const isMusicSubj = Boolean(s.subj && /음악/.test(s.subj));
  const topic = isMusicSubj ? undefined : s.quotes.find((q) => !q.book && isValidInquiryTopic(q.q));
  const book = s.quotes.find((q) => q.book);
  const anc = (topic && topic.q) || (book && book.q) || (s.concepts[0] && s.concepts[0].term) || null;
  const f = s.f;
  const key = `${s.rid}:${s.pi}`;

  // 1. Concepts (4 angles: def, apply, limit, compare)
  s.concepts.slice(0, 2).forEach((c, k) => {
    if (!isEligibleForConceptTemplate(c, (ctx as any).customKeywords)) return;
    const L_def = lead(s, c.term, 0);
    const L_app = lead(s, c.term, 1);
    const L_lim = lead(s, c.term, 2);
    const L_cmp = lead(s, c.term, 3);
    const nm = c.term === c.name || c.term.includes(c.name) ? `‘${c.term}’` : `‘${c.term}’${/[가-힣]$/.test(c.term) && hasBatchim(c.term) ? '과' : '와'} 관련된 ‘${c.name}’`;
    const ansDef = c.isDynamic
      ? `‘${c.name}’의 핵심 개념을 1문장으로 정의한 뒤, 생기부 탐구에서 이를 어떻게 적용·분석했고 어떤 결론을 얻었는지 [정의 → 적용 과정 → 학업적 깨달음] 3단계로 구조화해 답변하세요.`
      : c.def || `‘${c.name}’의 교과서적 개념과 원리를 설명하세요.`;

    out.push(
      Q({
        b: 'A',
        k: `${key}_cdef_${k}`,
        p: 3.4 + s.score * 0.3 - k * 0.4,
        type: '개념원리',
        tplId: 'concept_def',
        typeGroup: 'concept',
        text: `${L_def} ${nm}의 핵심 개념과 핵심 의미를 처음 듣는 사람도 이해하기 쉽게 설명해 주세요.`,
        ans: ansDef,
        tip: '정의를 외워 말하기보다 자기 말로 핵심 원리 한 문장 + 일상 비유 연결',
        tails: [pick(TAIL.verify)]
      })
    );

    out.push(
      Q({
        b: 'A',
        k: `${key}_capp_${k}`,
        p: 3.2 + s.score * 0.3 - k * 0.4,
        type: '개념적용',
        tplId: 'concept_apply',
        typeGroup: 'concept',
        text: `${L_app} ${nm}의 원리가 실제 탐구 과정이나 결과에서 구체적으로 어떻게 적용되고 확인되었는지 설명해 주세요.`,
        ans: ansDef,
        tip: '교과 이론이 본인의 구체적 활동 장면(수치·현상)에서 어떻게 구현되었는지 증명',
        tails: ['적용 과정에서 교과서 이론과 실제 관찰 결과가 일치했나요?']
      })
    );

    const isNaturalPhenomenon = NATURAL_PHENOMENON_CONCEPTS.has(c.name) || NATURAL_PHENOMENON_CONCEPTS.has(c.term) || NATURAL_PHENOMENON_CONCEPTS.has(c.name.replace(/\s+/g, '')) || NATURAL_PHENOMENON_CONCEPTS.has(c.term.replace(/\s+/g, ''));
    const climText = isNaturalPhenomenon
      ? `${L_lim} 교과서에서 배운 이상적인 조건과 달리, 실제 자연·생체·실험 환경에서는 어떤 변수에 의해 ‘${c.name}’의 양상이나 결과가 달라질 수 있는지 설명해 주세요.`
      : `${L_lim} ${josa(nm, '을/를')} 실제 환경에 적용할 때 발생할 수 있는 한계점이나 예외적인 조건은 무엇인지 설명해 주세요.`;
    const climTip = isNaturalPhenomenon
      ? '이상적 모델과 복잡한 실제 환경(체내·자연계)의 변수 차이를 파악하고 과학적으로 설명'
      : '이론적 이상 조건과 현실 적용 환경의 차이점을 파악하고 대안 제시';
    const climTails = isNaturalPhenomenon
      ? ['이러한 변수가 통제되지 않았을 때 발생할 수 있는 오차나 체내 변화는 무엇인가요?']
      : ['그 한계를 극복하기 위해 제안할 수 있는 보완 방법은 무엇인가요?'];

    out.push(
      Q({
        b: 'A',
        k: `${key}_clim_${k}`,
        p: 3.0 + s.score * 0.25 - k * 0.4,
        type: '개념한계',
        tplId: 'concept_limit',
        typeGroup: 'concept',
        text: climText,
        ans: ansDef,
        tip: climTip,
        tails: climTails
      })
    );

    out.push(
      Q({
        b: 'A',
        k: `${key}_ccmp_${k}`,
        p: 2.9 + s.score * 0.25 - k * 0.4,
        type: '개념비교',
        tplId: 'concept_compare',
        typeGroup: 'concept',
        text: `${L_cmp} ${josa(nm, '과/와')} 유사하거나 대안이 될 수 있는 다른 기술·이론과의 결정적인 차이점을 설명해 주세요.`,
        ans: ansDef,
        tip: '두 개념의 장단점을 명확히 대비하고 해당 탐구에서 이 개념을 선택한 이유 설명',
        tails: ['다른 방식을 채택했을 때보다 어떤 점에서 더 유리했나요?']
      })
    );
  });

  // 2. Experiment (4 angles)
  if (f.experiment) {
    const L0 = lead(s, anc, 0), L1 = lead(s, anc, 1), L2 = lead(s, anc, 2), L3 = lead(s, anc, 3);
    out.push(
      Q({
        b: 'A',
        k: `${key}_exp_vars`,
        p: 2.8 + s.score * 0.3,
        type: '실험검증',
        tplId: 'exp_vars',
        text: `${L0} 실험에서 설정한 가설과 이를 검증하기 위해 엄밀하게 통제한 변인은 무엇이었나요?`,
        tip: '조작 변인 1개와 통제 변인 2~3개를 명확히 구분하고 통제 방법 구체 제시',
        tails: ['통제 변인이 흔들렸다면 결과에 어떤 왜곡이 생겼을까요?']
      })
    );
    out.push(
      Q({
        b: 'A',
        k: `${key}_exp_error`,
        p: 2.7 + s.score * 0.3,
        type: '오차분석',
        tplId: 'exp_error',
        text: `${L1} 실험 과정에서 발생한 측정 오차나 예상 밖의 결과 원인을 어떻게 분석하고 해결했나요?`,
        tip: '오차를 단순 실수로 넘기지 않고 기기적·환경적 요인을 이론적으로 분석',
        tails: ['다시 실험한다면 오차를 줄이기 위해 측정 방식을 어떻게 바꾸겠습니까?']
      })
    );
    out.push(
      Q({
        b: 'A',
        k: `${key}_exp_ctrl`,
        p: 2.5 + s.score * 0.25,
        type: '실험설계',
        tplId: 'exp_control',
        text: `${L2} 실험 결과의 신뢰도를 확보하기 위해 대조군을 어떻게 설계했고, 실험의 재현성은 어떻게 검증했나요?`,
        tip: '대조군 설정 기준과 데이터의 반복 측정 횟수 및 표준편차 언급',
        tails: ['재현성을 방해하는 가장 큰 외부 변수는 무엇이었나요?']
      })
    );
    out.push(
      Q({
        b: 'A',
        k: `${key}_exp_follow`,
        p: 2.4 + s.score * 0.25,
        type: '후속실험',
        tplId: 'exp_followup',
        text: `${L3} 이 실험 결과를 바탕으로 학문적 호기심을 확장해 추가로 시도해 보고 싶은 후속 실험이 있다면 제안해 보세요.`,
        tip: '기존 실험의 한계점을 디딤돌 삼아 새로운 조작 변인을 적용하는 후속 설계 제시',
        tails: ['그 후속 실험을 위해 대학에서 배우고 싶은 연구 장비나 이론은 무엇인가요?']
      })
    );
  }

  // 3. Inquiry / Topic (4 angles)
  if (topic && (f.inquiry || f.report || f.present)) {
    const L0 = lead(s, topic.q, 0), L1 = lead(s, topic.q, 1), L2 = lead(s, topic.q, 2), L3 = lead(s, topic.q, 3);
    out.push(
      Q({
        b: 'A',
        k: `${key}_inq_concl`,
        p: 2.7 + s.score * 0.3,
        type: '탐구결론',
        tplId: 'inq_conclusion',
        text: `${L0} ‘${topic.q}’ 탐구에서 도출한 최종 결론과 이를 입증하는 가장 결정적인 근거는 무엇이었나요?`,
        tip: '결론 두괄식 제시 → 정량적 데이터나 학술 문헌 근거 2가지 제시',
        tails: [pick(TAIL.process)]
      })
    );
    out.push(
      Q({
        b: 'A',
        k: `${key}_inq_cred`,
        p: 2.5 + s.score * 0.25,
        type: '자료검증',
        tplId: 'inq_credibility',
        text: `${L1} ${josa(`‘${topic.q}’`, '을/를')} 탐구하며 활용한 자료나 데이터의 출처는 무엇이며, 신뢰성을 어떻게 검증했나요?`,
        tip: '단순 인터넷 검색이 아닌 공공기관 통계, 학술 데이터베이스 논문 교차 검증 강조',
        tails: ['서로 상충되는 자료를 발견했을 때는 어느 쪽을 채택했나요?']
      })
    );
    out.push(
      Q({
        b: 'A',
        k: `${key}_inq_diff`,
        p: 2.4 + s.score * 0.25,
        type: '탐구차별성',
        tplId: 'inq_different',
        text: `${L2} ‘${topic.q}’ 주제에 대한 기존 연구나 일반적 시각과 비교할 때 본인 탐구만의 차별점은 무엇인가요?`,
        tip: '기존 내용 요약에 그치지 않고 학생만의 새로운 해석이나 적용 사례 제시',
        tails: ['그 차별점이 기존 견해보다 우수하다고 확신하는 근거는 무엇인가요?']
      })
    );
    out.push(
      Q({
        b: 'A',
        k: `${key}_inq_lim`,
        p: 2.3 + s.score * 0.2,
        type: '탐구한계',
        tplId: 'inq_limit',
        text: `${L3} ‘${topic.q}’ 탐구를 마친 후 스스로 느낀 학업적 한계점과 이를 보완하기 위한 방안은 무엇인가요?`,
        tip: '부족했던 지점(표본 크기, 이론적 깊이 등) 인정 및 대학 진학 후 보완 계획 연결',
        tails: [pick(TAIL.limit)]
      })
    );
  }

  // 4-0. Hardware / Engineering Device (make_hw: 냉실, 아쿠아포닉스, 센서, 펠티어, 회로 등)
  if (f.make_hw) {
    const L0 = lead(s, anc, 0), L1 = lead(s, anc, 1), L2 = lead(s, anc, 2);
    out.push(
      Q({
        b: 'A',
        k: `${key}_make_hw_arch`,
        p: 2.7 + s.score * 0.3,
        type: '공학설계',
        tplId: 'make_hw_arch',
        text: `${L0} 제작한 장치(하드웨어)의 핵심 작동 원리와 회로 및 시스템 구성 요소를 단계별로 설명해 주세요.`,
        tip: '센서 입력-제어부 처리-구동부 출력의 하드웨어 메커니즘을 이론에 기반해 답변',
        tails: ['설계 단계에서 가장 중요하게 고려한 물리적·전기적 제약 조건은 무엇이었나요?']
      })
    );
    out.push(
      Q({
        b: 'A',
        k: `${key}_make_hw_spec`,
        p: 2.6 + s.score * 0.25,
        type: '부품선정',
        tplId: 'make_hw_spec',
        text: `${L1} 기기 제작에 사용한 핵심 소자나 부품을 선정한 기술적 기준과 스펙 검증 과정은 어떠했나요?`,
        tip: '단순 사용에 그치지 않고 정격 용량, 효율, 호환성을 검토한 공학적 판단 제시',
        tails: ['해당 부품 대신 다른 소자를 썼다면 어떤 문제가 생겼을까요?']
      })
    );
    out.push(
      Q({
        b: 'A',
        k: `${key}_make_hw_debug`,
        p: 2.5 + s.score * 0.25,
        type: '기기보완',
        tplId: 'make_hw_debug',
        text: `${L2} 장치 작동 및 테스트 과정에서 발생한 오작동이나 한계점을 어떻게 측정하고 개선했나요?`,
        tip: '오작동 원인 분석 → 회로/구조 수정 → 재측정 검증 과정 강조',
        tails: ['대학에서 배울 공학 이론을 적용한다면 이 기기를 어떻게 상용화 수준으로 고도화하겠습니까?']
      })
    );
  }

  // 4-1. Software / Algorithm / Engineering (make_sw)
  if (f.make_sw) {
    const L0 = lead(s, anc, 0), L1 = lead(s, anc, 1), L2 = lead(s, anc, 2), L3 = lead(s, anc, 3);
    out.push(
      Q({
        b: 'A',
        k: `${key}_make_arch`,
        p: 2.6 + s.score * 0.3,
        type: '설계구조',
        tplId: 'make_arch',
        text: `${L0} 제작한 결과물의 핵심 알고리즘 구조와 데이터 처리 흐름을 단계별로 설명해 주세요.`,
        tip: '입력-처리-출력 단계의 핵심 메커니즘을 구조화하여 명확히 답변',
        tails: ['직접 구현한 코드와 외부 라이브러리 사용 영역을 구분해 말해 주세요.']
      })
    );
    out.push(
      Q({
        b: 'A',
        k: `${key}_make_rsn`,
        p: 2.5 + s.score * 0.25,
        type: '기술선택',
        tplId: 'make_reason',
        text: `${L1} 구현 과정에서 다른 도구나 방식 대신 현재의 기술 스택을 선택한 명확한 기준은 무엇이었나요?`,
        tip: '효율성, 처리 속도, 개발 편의성 등 비교 평가 기준 제시',
        tails: ['다른 방식을 썼다면 어떤 문제가 발생했을 것으로 보나요?']
      })
    );
    out.push(
      Q({
        b: 'A',
        k: `${key}_make_dbg`,
        p: 2.4 + s.score * 0.25,
        type: '문제해결',
        tplId: 'make_debug',
        text: `${L2} 구현 중 발생한 가장 까다로웠던 기술적 오류(버그)는 무엇이었고, 이를 어떻게 디버깅했나요?`,
        tip: '증상 파악 → 가설 수립 → 코드 수정 및 검증 단계의 디버깅 역량 부각',
        tails: ['그 오류를 해결하면서 새롭게 터득한 프로그래밍 원리는 무엇인가요?']
      })
    );
    out.push(
      Q({
        b: 'A',
        k: `${key}_make_use`,
        p: 2.3 + s.score * 0.2,
        type: '성능개선',
        tplId: 'make_usability',
        text: `${L3} 제작한 결과물을 실제 환경이나 사용자에게 적용했을 때 어떤 피드백이 있었고 무엇을 개선했나요?`,
        tip: '사용자 관점 피드백과 시스템 최적화(예외 처리, 메모리 최적화 등) 노력 연결',
        tails: ['상용화 수준으로 끌어올린다면 어떤 기능을 추가하고 싶나요?']
      })
    );
  }

  // 4-2. Content / Media Creation (Infographics, Posters, Card News, Booklets, UCC etc.)
  if (f.make_content && !f.make_sw && !f.make_hw) {
    const L0 = lead(s, anc, 0), L1 = lead(s, anc, 1), L2 = lead(s, anc, 2);
    out.push(
      Q({
        b: 'A',
        k: `${key}_content_msg`,
        p: 2.5 + s.score * 0.25,
        type: '시각화구조',
        tplId: 'content_msg',
        text: `${L0} 제작물에서 전달하고자 한 핵심 메시지와, 이를 대상 독자(또는 급우들)에게 효과적으로 전달하기 위해 어떤 구조와 방식을 취했는지 설명해 주세요.`,
        tip: '정보 전달 목적에 맞게 핵심 개념을 시각화하고 구조화한 논리적 근거 제시',
        tails: ['자료를 구성하면서 가장 강조하고 싶었던 포인트는 무엇이었나요?']
      })
    );
    out.push(
      Q({
        b: 'A',
        k: `${key}_content_diff`,
        p: 2.4 + s.score * 0.25,
        type: '차별성',
        tplId: 'content_diff',
        text: `${L1} 제작 과정에서 기존의 일반적인 설명 자료나 매체와 비교했을 때 본인만의 차별화된 접근법은 무엇이었나요?`,
        tip: '기존 자료의 한계를 보완하여 독창적인 관점이나 창의성을 발휘한 지점 강조',
        tails: ['완성된 자료를 접한 급우나 선생님의 피드백 중 가장 기억에 남는 것은 무엇인가요?']
      })
    );
    out.push(
      Q({
        b: 'A',
        k: `${key}_content_effect`,
        p: 2.3 + s.score * 0.2,
        type: '파급효과',
        tplId: 'content_effect',
        text: `${L2} 해당 제작물을 통해 학급이나 학교 공동체에서 이끌어내고자 했던 긍정적인 변화나 영향력은 무엇이었나요?`,
        tip: '단순 제작에 그치지 않고 공동체에 미친 선한 영향력과 소통 역량 연결',
        tails: ['이 활동을 더 확장한다면 어떤 후속 캠페인이나 활동으로 발전시키고 싶나요?']
      })
    );
  }

  // 5. Debate (2 angles)
  if (f.debate) {
    const L0 = lead(s, anc, 0), L1 = lead(s, anc, 1);
    out.push(
      Q({
        b: 'M',
        k: `${key}_deb_cntr`,
        p: 2.5 + s.score * 0.25,
        type: '토론반론',
        tplId: 'deb_counter',
        text: `${L0} 토론 당시 상대측이 제기한 가장 강력한 반론은 무엇이었고, 이를 어떤 논리로 재반박했나요?`,
        tip: '상대 논리의 일리를 인정하고 내 주장의 전제와 근거를 들어 설득',
        tails: ['지금 다시 토론한다면 어떤 새로운 근거를 보강하겠습니까?']
      })
    );
    out.push(
      Q({
        b: 'M',
        k: `${key}_deb_neut`,
        p: 2.3 + s.score * 0.2,
        type: '토론절충',
        tplId: 'deb_neutral',
        text: `${L1} 양측의 극단적인 대립 속에서 양쪽 입장을 모두 고려한 현실적 절충안이나 대안을 제시해 보세요.`,
        tip: '단순 타협이 아닌 양측의 핵심 가치를 포섭하는 제3의 대안 제시',
        tails: ['그 절충안이 가져올 수 있는 부작용은 무엇인가요?']
      })
    );
  }

  // 6. Book (2 angles)
  if (book) {
    const L0 = lead(s, book.q, 0), L1 = lead(s, book.q, 1);
    out.push(
      Q({
        b: f.read && s.rel ? 'C' : 'A',
        k: `${key}_book_core`,
        p: 2.4 + s.score * 0.25,
        type: '독서비평',
        tplId: 'book_core',
        text: `${L0} ‘${book.q}’에서 저자가 던진 핵심 질문에 대해 본인은 어떻게 생각하며, 동의하지 않는 부분이 있다면 무엇인가요?`,
        tip: '줄거리 나열 금지. 저자의 주장에 대한 본인의 주체적 평가 한 가지',
        tails: ['그 책을 읽기 전과 읽은 후 본인의 생각은 어떻게 달라졌나요?']
      })
    );
    out.push(
      Q({
        b: 'C',
        k: `${key}_book_grow`,
        p: 2.3 + s.score * 0.2,
        type: '독서확장',
        tplId: 'book_growth',
        text: `${L1} ${josa(`‘${book.q}’`, '을/를')} 읽은 후 생긴 호기심을 다른 교과 탐구나 후속 활동으로 확장한 구체적 경험을 말씀해 주세요.`,
        tip: '독서가 실천이나 심화 연구로 이어진 선순환 과정 제시',
        tails: ['이와 관련해 대학 입학 후 찾아 읽고 싶은 전공 원서는 무엇인가요?']
      })
    );
  }

  // 7. Leadership & Conflict & Community
  if (f.leader) {
    const L0 = lead(s, anc, 0), L1 = lead(s, anc, 1);
    out.push(
      Q({
        b: 'P',
        k: `${key}_lead_conf`,
        p: 2.6 + s.score * 0.2,
        type: '리더십조율',
        tplId: 'lead_conflict',
        text: `${L0} 팀을 이끌며 구성원 간 의견 충돌이나 갈등이 발생했을 때 이를 어떤 대화 방식으로 조율했나요?`,
        tip: '권위가 아닌 경청과 설득으로 합의를 이끌어낸 구체적 일화 제시',
        tails: ['끝까지 설득되지 않은 팀원이 있었다면 어떻게 대처했나요?']
      })
    );
    out.push(
      Q({
        b: 'P',
        k: `${key}_lead_mot`,
        p: 2.4 + s.score * 0.2,
        type: '리더십동기',
        tplId: 'lead_motivation',
        text: `${L1} 활동에 소극적이거나 참여도가 낮은 팀원의 자발적 참여를 이끌어내기 위해 어떤 배려와 동기부여를 했나요?`,
        tip: '해당 친구의 특기나 관심사를 파악해 역할을 부여한 세심한 리더십 강조',
        tails: ['그 친구가 실제로 변화된 모습을 보여주었나요?']
      })
    );
  }
  if (f.conflict) {
    const L0 = lead(s, anc, 0);
    out.push(
      Q({
        b: 'P',
        k: `${key}_conf_root`,
        p: 2.8 + s.score * 0.2,
        type: '갈등해결',
        tplId: 'conf_root',
        text: `${L0} 당시 갈등의 근본적인 원인은 무엇이었으며, 감정적 대립을 넘어 실질적인 합의를 이끌어낸 원칙은 무엇이었나요?`,
        tip: '남 탓이 아닌 공통 목표 재확인을 통한 중재 과정 설명',
        tails: ['지금 다시 같은 상황을 겪는다면 더 개선할 소통 방식은 무엇인가요?']
      })
    );
  }
  if (f.coop && !f.leader && !f.conflict) {
    const L0 = lead(s, anc, 0);
    out.push(
      Q({
        b: 'P',
        k: `${key}_coop_role`,
        p: 2.2 + s.score * 0.2,
        type: '팀워크기여',
        tplId: 'coop_role',
        text: `${L0} 협업 과정에서 본인이 맡았던 고유한 역할은 무엇이었으며, 개인 작업을 넘어 팀 전체의 완성도를 높인 기여점은 무엇인가요?`,
        tip: '‘우리’가 아닌 ‘내가’ 솔선수범해 팀의 빈틈을 메운 장면 제시',
        tails: ['동료와의 협업을 통해 스스로 새롭게 배운 점은 무엇인가요?']
      })
    );
  }
  if (f.plan && !f.leader) {
    const L0 = lead(s, anc, 0);
    out.push(
      Q({
        b: 'P',
        k: `${key}_plan_risk`,
        p: 2.2 + s.score * 0.2,
        type: '기획실행',
        tplId: 'plan_risk',
        text: `${L0} 활동을 기획하는 과정에서 예상치 못한 변수나 제약 조건을 극복하기 위해 어떤 현실적인 대안(Plan B)을 마련했나요?`,
        tip: '치밀한 사전 준비성과 돌발 상황 대처 능력 강조',
        tails: ['그 기획의 파급 효과는 참여자들에게 어떻게 나타났나요?']
      })
    );
  }
  if (s.sec === '행특') {
    const t = s.text.replace(/\.$/, '');
    const short = t.length > 70 ? t.slice(0, 68) + '…' : t;
    out.push(
      Q({
        b: 'P',
        k: `${key}_trait_inst`,
        p: 2.4,
        type: '행특사례',
        tplId: 'trait_instance',
        text: `${recordLabel(s)} 담임선생님께서 ‘${short}’라고 기재하셨는데, 본인의 어떤 구체적 행동 때문에 그렇게 평가하셨다고 생각하나요?`,
        tip: '선생님의 칭찬을 담담하게 뒷받침할 수 있는 고교 생활 속 실천 사례 제시',
        tails: ['그 인성적 강점이 대학 전공 학습과 단체 생활에 어떤 기여를 할까요?']
      })
    );
  }

  // 8. Career & Academic Growth (4 angles)
  if (!MANDATORY_EDU_RE.test(s.text) && (s.rel || s.area === '진로활동' || (topic && s.score > 2.5))) {
    const isSimplePractical = SIMPLE_PRACTICAL_ACTIVITY_RE.test(s.text);
    const hasMajor = !isUnsetMajor(M);
    const majorConn = hasMajor
      ? `${M}에 입학한 뒤 전공 과목을 수강하는 데`
      : '대학에 입학한 뒤 관심 분야의 전공 과목을 수강하는 데';
    const majorCurr = hasMajor
      ? `${M} 교육과정에 있는 특정 전공 과목이나 연구 분야와 연결해`
      : '대학 교육과정 속 관심 전공 과목이나 연구 분야와 연결해';

    const L0 = lead(s, anc, 0), L1 = lead(s, anc, 1), L2 = lead(s, anc, 2), L3 = lead(s, anc, 3);
    if (!isSimplePractical) {
      out.push(
        Q({
          b: 'C',
          k: `${key}_exp_conn`,
          p: 2.6 + s.score * 0.35 + s.rel * 0.4,
          type: '전공연계',
          tplId: 'exp_major_conn',
          text: `${L0} 이 탐구에서 길러진 학업적 역량이 ${majorConn} 어떤 기초 체력이 될 것이라 보나요?`,
          tip: '단순 흥미가 아닌, 지원 전공의 기초·심화 커리큘럼을 소화할 수 있는 학업 기초 역량 연결',
          tails: ['그 역량을 대학 입학 전까지 더 보강하기 위한 계획이 있나요?']
        })
      );
    }
    out.push(
      Q({
        b: 'C',
        k: `${key}_exp_acad`,
        p: 2.5 + s.score * 0.3 + s.rel * 0.3,
        type: '학업성장',
        tplId: 'exp_academic_grow',
        text: `${L1} 교과서 수준의 지식을 넘어 주도적으로 심화 탐구를 이어가게 만든 내적 동기는 무엇이었으며, 어떤 방식으로 지평을 넓혔나요?`,
        tip: '호기심의 발생 순간과 이를 충족하기 위해 찾아본 원서·논문 등 지적 집요함 서술',
        tails: ['그 심화 과정에서 가장 크게 깨달은 학문적 즐거움은 무엇인가요?']
      })
    );
    if (!isSimplePractical) {
      out.push(
        Q({
          b: 'C',
          k: `${key}_exp_curr`,
          p: 2.3 + s.score * 0.25 + s.rel * 0.3,
          type: '교과연계',
          tplId: 'exp_curriculum',
          text: `${L2} 이 활동에서 마주한 호기심을 ${majorCurr} 설명해 주세요.`,
          tip: '지원 학과의 1~2학년 전공기초 및 심화 과목명을 정확히 언급하며 학업 포부 제시',
          tails: ['그 과목에서 특히 깊이 탐구하고 싶은 세부 토픽은 무엇인가요?']
        })
      );
      out.push(
        Q({
          b: 'C',
          k: `${key}_exp_goal`,
          p: 2.2 + s.score * 0.2 + s.rel * 0.2,
          type: '진로목표',
          tplId: 'exp_research_goal',
          text: `${L3} 대학 입학 후 학부 과정에서 이 주제를 더 발전시켜 진행해 보고 싶은 구체적인 연구 과제나 프로젝트가 있나요?`,
          tip: '현실성 있는 학부 수준의 프로젝트 아이디어와 달성 목표 제시',
          tails: ['그 연구를 성공시키기 위해 어떤 교수님의 연구실에 관심이 있나요?']
        })
      );
    }
  }

  return out;
}

// ============================================================
// 7. 내장 기출 DB (`UNIV_Q`, `QB`, `CASES`) 연동 및 안전 필터
// ============================================================
const FIELD_KW: Record<string, string> = {
  biz: '경영 경제 기업 마케팅 소비 시장 브랜드 광고 회계 금융 투자 무역 유통 창업 수요 공급 가격 ESG 산업',
  hum: '문학 작품 언어 번역 역사 철학 문화 작가 소설 시 고전 어휘 문법',
  soc: '사회 정책 제도 법 정치 행정 복지 인권 불평등 민주 시민 국제',
  media: '미디어 광고 언론 기사 콘텐츠 영상 뉴스 홍보',
  edu: '교육 수업 학습 교사 학생 멘토 가르 교실',
  welfare: '복지 상담 아동 노인 청소년 가족 취약',
  sci: '실험 원리 이론 수학 물리 화학 생명 지구 통계',
  eng: '공학 설계 제작 회로 전기 전자 반도체 기계 에너지 소재 구조 로봇',
  cs: '프로그램 코딩 알고리즘 데이터 인공지능 AI 소프트웨어 파이썬 앱 네트워크 보안',
  nurse: '간호 환자 건강 질병 의료 병원 생명',
  med: '의학 질병 환자 약 세포 면역 의료 생명',
  health: '건강 재활 치료 의료 환자 보건',
  bio: '생명 세포 유전 식품 미생물 바이오 효소 단백'
};

export function fieldsOf(major?: string): any[] {
  if (!major) return [];
  const cleanMajor = major.replace(/자[유율]전공학?부?|무전공/g, '').trim();
  if (!cleanMajor) return [];
  return FIELDS.filter((f) => f.re.test(cleanMajor));
}

const PAST_ACTIVITY_RE = /(?:[가-힣]*(?:했|하였|았|었|였|셨|됐|갔|봤|왔|났|탔|섰|앉|있|없)(?:는데|으며|고|네요|더군요|다던데|다고|던|어요|었나요|었지요|나요|군요|지요|습니까|습니다|다면서요|다는데|라는데|라던데|대요|래요)|(?:작성|진행|발표|연구|탐구|제작|수행|조사|설계|참여|제출|언급|개발|기획|활동)한|(?:만든|배운|읽은|들은|맡은|나간)|적혀|기록되|기록이|되어 ?있|생기부|학생부|세특|개세특|보니까|보니|들었는데|읽으셨는데|활동했던|(?:[1-3]학년|[1-3]학년도|동아리|진로활동|자율활동|봉사활동|수업\s*시간|교과\s*시간|보고서|소논문|발표대회|탐구보고서))/;

const GENERIC_SUBJECT_NOUNS = new Set([
  '수학', '과학', '물리', '화학', '생명', '지구', '정보', '국어', '영어', '사회',
  '교과', '수업', '과목', '학교', '학생', '자신', '본인', '친구', '동아리',
  '컴퓨터', '인공지능', '프로그래밍', '파이썬', '알고리즘', '데이터', '소프트웨어',
  '코딩', '모둠', '팀원', '역할', '활동', '탐구', '실험', '결과', '과정', '이유'
]);

export function checkForeignProject(qStr: string, recTxt: string): boolean {
  const projMatches = [...qStr.matchAll(/([가-힣A-Za-z0-9]{2,12})\s*(?:프로그램|시스템|프로젝트|모델|장치|키트|기기|로봇|어플|앱|게임|센서|회로|활동|실험|보고서|소논문|동아리|대회|기업|회사|플랫폼|서비스|알고리즘)/g)];
  for (const m of projMatches) {
    const noun = m[1].trim();
    if (/^[1-3]학년(?:도)?$/.test(noun)) continue;
    if (!GENERIC_SUBJECT_NOUNS.has(noun) && !recTxt.includes(noun)) {
      return false;
    }
  }

  const actMatches = [...qStr.matchAll(/([가-힣A-Za-z0-9]{2,12})(?:을|를|에 대해|에 관한|에서)\s*(?:제작|만들|설계|구현|작성|수행|진행|개발|조사|탐구|분석)/g)];
  for (const m of actMatches) {
    const noun = m[1].trim();
    if (/^[1-3]학년(?:도)?$/.test(noun)) continue;
    if (!GENERIC_SUBJECT_NOUNS.has(noun) && !recTxt.includes(noun)) {
      return false;
    }
  }
  return true;
}

export function isQuestionFieldCompatible(qStr: string, targetMajor: string, recTxt: string): boolean {
  const isCS = /컴퓨터|소프트웨어|SW|인공지능|AI|데이터|정보|보안|전자|전기|ICT/.test(targetMajor);
  if (isCS) {
    const PURE_OTHER_RE = /(?:화학\s*분야|화학과|화학공학|시그마.*파이|오비탈|이온화\s*에너지|화학\s*평형|의예과|간호사|간호학과|유치원\s*교사|초등교사|사범대|시각\s*디자인|미술관|사회복지사|문학\s*작품|어문학)/;
    if (PURE_OTHER_RE.test(qStr)) {
      const m = qStr.match(PURE_OTHER_RE);
      if (m && !recTxt.includes(m[0])) return false;
    }
  }

  const isBiz = /경영|경제|상경|무역|통상|회계|세무|금융|마케팅|비즈니스/.test(targetMajor);
  if (isBiz) {
    const PURE_STEM_RE = /(?:코딩|파이썬|알고리즘|회로|물리학|화학|생명과학|지구과학|의예|간호|미적분|역학|유전자|반도체)/;
    if (PURE_STEM_RE.test(qStr)) {
      const m = qStr.match(PURE_STEM_RE);
      if (m && !recTxt.includes(m[0])) return false;
    }
  }
  return true;
}

function cleanNoun(w: string): string {
  return w.replace(/(에서|으로|에게|이라는|라는|이란|이라|와의|과의|에는|에도|까지|부터|처럼|보다|이나|이며|이고|하고|하는|하게|하며|했던|했고|했는데|했다|이다|에|은|는|이|가|을|를|의|와|과|도|로|만|요)$/, '');
}

export function cleanPastAnswer(ansText?: string | null): string | null {
  if (!ansText) return null;
  let t = stripHtmlTags(ansText).trim();
  if (t.length < 15 || t.length > 800) return null;
  if (/^[•∙·\-]/.test(t)) return null;
  if (/TIP|특수목적대학|진로진학지원센터|부산대학교|울산진로|부산진로|면접후기|합격수기|\{|\}/i.test(t)) return null;
  if (/(?:껄어|여쑤어|득히|신자생|학습하겠음|어려웠음)/.test(t)) return null;
  if (/(?:혁생|선골|독득|퍼이지|닌도|범랍|상성형|고촬|확습|역할은및|좋은및것|때이\s|(?<![가-힣])입하(?![가-힣])|형징|폭날게|층미|개획|경철행정|목묘|(?<![가-힣])하당(?![가-힣])|수단만으로대하는)/.test(t)) return null;
  if (/(?:질문\s*및\s*을|국제\s*답변\s*사회|답변\s+[가-힣]+의)/.test(t)) return null;
  if (/(?:기억이\s*나지|기억안|모르겠|없음|작성하지\s*않음|해당\s*없음)/.test(t)) return null;
  t = t.replace(/^(?:답변\s*[:：]|학생\s*[:：]|지원자\s*[:：]|답변\s*☞\s*)\s*/, '').trim();
  if (!/[.?!]$/.test(t)) return null;
  return t;
}

export function isValidAnswerMatch(qText: string, ansText: string | null): boolean {
  if (!ansText || !qText) return false;
  const cleanAns = ansText.trim();
  if (/^[∙•·-]/.test(cleanAns)) return false;
  if (/^(?:산업공학과|컴퓨터공학과|물리학과|의예과|기계공학과|경영학과|행정학과)\s*[•∙·-]/.test(cleanAns)) return false;

  const rawWords = qText.match(/[가-힣A-Za-z0-9]{2,}/g) || [];
  const STOP_WORDS = new Set(['질문', '답변', '생각', '학생', '본인', '자신', '우리', '설명', '이유', '대해', '관련', '통해', '가장', '어떤', '어떻게', '무엇', '개념']);
  const qNouns = rawWords.map(cleanNoun).filter((w) => !STOP_WORDS.has(w) && w.length >= 2);

  return qNouns.some((n) => cleanAns.includes(n));
}

export function isMajorCompatible(dept: string, targetMajor: string, flds: any[], qText?: string): boolean {
  const isEducationPedagogy = /(?:디지털\s*교과서|교사\s*임용|수업\s*지도안|교권|교육학|교직|학생\s*지도|학교\s*현장|교사의\s*자질|예비\s*교사)/.test(qText || '');
  if (isEducationPedagogy && !/(?:교육|사범|교대|교원)/.test(targetMajor)) {
    return false;
  }

  const isFreeMajor = /자[유율]전공|무전공/.test(targetMajor);
  if (isFreeMajor) {
    // 자유전공/무전공 지원 시 자연과학/공학/어문 특정 기출 질문 및 특정 학과 차단
    if (qText && /(?:촉매|전고체|배터리|이차전지|2차\s*전지|광촉매|연료전지|반도체|화학적|한국어의\s*발전|미분|적분|양자|전기차|리튬|소설\s*구성|작품에서|전기회로|전자회로|리포좀|약물\s*전달|광해군|인조|임진왜란|조선\s*왕조|아두이노|작곡)/.test(qText)) {
      return false;
    }
    if (dept && /(?:공학|이과|자연|생명|화학|물리|의예|간호|약학|전자|기계|배터리|신소재|어문|국문|영문|중문|일문)/.test(dept)) {
      return false;
    }
    return true;
  }

  if (!dept) return true;
  const cleanDept = dept.replace(/자[유율]전공/g, '').trim();
  const mk = targetMajor.replace(/(학과|학부|전공|과|계열)$/, '');
  if (mk && (dept.includes(mk) || mk.includes(dept.replace(/(학과|학부|전공|과|계열)$/, '')))) return true;

  const isTargetCS = /컴퓨터|소프트웨어|SW|인공지능|AI|데이터|정보|보안/.test(targetMajor);
  if (isTargetCS) {
    return /컴퓨터|소프트웨어|SW|인공지능|AI|데이터|정보|보안|전산|ICT|IT|전자|전기/.test(cleanDept);
  }

  if (flds && flds.some((f) => f.re.test(cleanDept))) return true;
  return false;
}

export function stripQPrefix(str: string): string {
  let s = (str || '').trim();
  const BULLET_PREFIX_RE = /^[•⦁▪■□▶▷◆◇○●★☆※•∙\-\–—\d.)\]]+\s*/;
  const PREFIX_RE = /^\s*(?:(?:\d+(?:-\(?\d+\)?|\.\d+)?|Q\d*)\s*[.):?!+\-]|(?:\(\d+\)|\[\d+\]|[①-⑮]))\s*/i;
  let prev = '';
  while (prev !== s) {
    prev = s;
    s = s.replace(/^\[[^\]]+\]\s*/, '').trim();
    s = s.replace(PREFIX_RE, '').trim();
    s = s.replace(BULLET_PREFIX_RE, '').trim();
    s = s.replace(/^[-•⦁▪·▶+?]\s*/, '').trim();
    s = s.replace(/^질문\s*[:：]?\s*/i, '').trim();
    s = s.replace(/^(?:전공|인성|공통|기초|심화)\s*[-–—:：]\s*/, '').trim();
  }
  return s.trim();
}

const NOISE_RE = /(?:기억(?:은|이)?\s*안|기억(?:나지|이\s*나지)|잘\s*기억|고사실|대기실|입실|착석|퇴실|면접관|진행방식|후기|분위기|팁|꿀팁|생략|^\(?꼬리|모르겠|질문\s*없음|자소서|자기\s*소개서|생기부\s*질문|생기부\s*관련|교과\s*질문|전공\s*질문|답변\s*못함|말씀을 들어보니|기억(?:이|은)?\s*나나요|기억나나요|기억\s*나시나요|바운\s*지|바운\s*거|답변\s*☞|논리적\s*사고력\s*[-–]|오는\s*길|코로나|학급\s*신문|\[질문\d*\]|면접\s*준비\s*TIP|여쑤어|득히|부산대학교∙\d+|특수목적대학|기본소양[ⅠⅡI0-9_]*|보조질문\d*|한중\s*문화갈등|조사를\s*했는데|질문\s*및\s*을|국제\s*답변\s*사회|답변\s+[가-힣]+의)/i;
const QUESTION_CHECK_RE = /(?:\?|인가요|무엇인가요|어떤가요|설명해\s*(?:보세요|주세요|바랍니다|볼래요)|말해\s*(?:보세요|주세요|봐요)|있나요|했나요|있었나요|했었나요|되었나요|있는지|했는지|어떻게|이유는|이유가|까\?|요\?|나\?|은\?|는\?|어떤|무엇|왜)/;
const SYMBOL_PLACEHOLDER_RE = /[■●◆▶▷◀◁□○◎★☆※•∙]|학생부종합|학생부교과|OO|○○|〇〇|00|XX|××|□□|___/;
const CONTEXT_DEPENDENT_START_RE = /^(?:뭐 하는|어떤 기업|그|그때|이때|이전|관찰 이전|그럼|그러면|그렇다면|아까|방금|혹시 그|왜 그렇게|그래서|근데|그런데|어떤 물질)\b/;
const BAD_START_RE = /^(?:이루어져|그러[며면한]|구성원이 |A의 |B의 |\(|그리고\s*사실|하지만\s*|따라서\s*|그에\s*따라|이에\s*따라|한편\s*|그런\s*이유로|이\s*프로젝트에서)/;
const BAD_PAST_TERMS_RE = /(?:생기부\s*보니까|생기부에\s*나와있|나와있는데|평가되어|성적이|캠퍼스|선도부|급식지도|수소\s*연료전지|전기차|순자\s*말고|과외\s*관련|객체\s*지향|공확|팀구|3화년|인상\s*깊은더|역할객체|지의류|농구|AI수리학|진행한\s*거\s*같은데|많은\s*것\s*같은데|말씀해\s*주셨는데|목표라고\s*했으니|관심\s*많은\s*거\s*알겠|연구하셨던[가-힣]|하셨던[가-힣]|다문화\s*가정.*교육봉사|체력에\s*대해\s*말씀|국제관계\s*전문가|한\s*것\s*같은데|한것\s*같은데|탐구\s*했는데|거기에\s*대해\s*자세히)/;
const VALID_QUESTION_END_RE = /(?:\?|인가요|무엇인가요|어떤가요|설명해\s*(?:보세요|주세요|바랍니다|볼래요)|말해\s*(?:보세요|주세요|봐요)|있나요|했나요|있었나요|했었나요|되었나요|있는지\s*(?:말씀|설명)|했는지\s*(?:말씀|설명)|어떤\s*(?:점|이유)|무엇이었나요|이유는\s*무엇인가요)\s*$/;
const BROKEN_TEXT_RE = /[가-힣],[가-힣]{6,}|인공지는/;
const BROKEN_OR_DEPENDENT_RE = /(?:[①-⑮]|B가\s|은호|제시된\s*(?:기술|방안|자료|문제)|이러한\s*(?:질병|기술|문제|현상)|제기된\s*방안|이렇게\s*어려움을|그\s*지식은|그렇게\s*생각하게\s*된|^[가-힣]{1,2}\s*생겨|공통\s*\d+번|답변고등|반영\s*비율|\d{2}%)/;
const OCR_BROKEN_RE = /(?:혁생|선골|독득|퍼이지|닌도|범랍|상성형|고촬|확습|역할은및|좋은및것|때이\s|(?<![가-힣])입하(?![가-힣])|형징|폭날게|층미|개획|경철행정|목묘|(?<![가-힣])하당(?![가-힣])|수단만으로대하는|동역사|위첩|요즘\s*시가\s*발달|이유런던|역물|수및있을까요)/;
const PDF_CORRUPT_RE = /(?:[가-힣](?:학업|진로|공동체|인성)역량|(?:학업|진로|공동체)역량\s*[가-힣]|[가-힣]+\s+\d+\.\s+|만약\s*이\s*갈등|만약이\s*갈등|위\s*제시문|다음\s*자료|아래\s*글|이\s*사례에서|[•⦁▪■□▶▷◆◇○●★☆※])/;
const OTHER_STUDENT_PREMISE_RE = /(?:(?:작곡|기숙사|봉사활동|교육봉사|멘토링|동아리|대회|실험|프로젝트|보고서|발표|탐구|연구|독서|활동|역할|경험|반장|부반장|학생회|리더|조장).{0,25}(?:했다고\s*했는데|을\s*했는데|를\s*했는데|했는데[,?\s]|하셨는데|하셨던|한\s*것\s*같은데|한것\s*같은데|경험이\s*많은데|말씀해\s*주셨는데)|했다고\s*했는데|하셨던\s*데|경험이\s*많은데|목표라고\s*했으니)/;
const UNIV_NAMES_RE = /(?:서울대|연세대|고려대|성균관대|서강대|한양대|중앙대|경희대|한국외대|시립대|이화여대|건국대|동국대|홍익대|숙명여대|국민대|숭실대|세종대|단국대|아주대|인하대|부산대|경북대|전남대|충남대|충북대|전북대|강원대|제주대|가톨릭대|가천대|우송대|교원대|한국교원대|대구교대|경인교대|서울교대|공주교대|광주교대|청주교대|춘천교대|진주교대|전주교대)/;
const DISALLOWED_PAST_ACTIVITIES_RE = /(?:수상|상을|환선굴|범람원|한국\s*지리|서계\s*지리|중학교\s*역사|기술\s*가정|파이선|통역사|고추\s*농사|도핑|방위산업|예술작품|특수학급.*지리|파리\s*주택|멘토링|또래교사|쓰여\s*있는데|내용을\s*보면|보니까)/;
const PAST_OTHER_ACTIVITY_RE = /(?:했을\s*때|했네요|했다는데|하였는데|하셨다는데|하셨다\s*하는데|하셨다고|하셨는데|하셨나요|수행평가로|수행평가|동아리\s*시간에|수업\s*시간에|적혀\s*있|적혀있|했다고\s*(?:적혀|하는|되어|들었|하셨)|(?:연구|조사|탐구|실험|발표|제작|개발|작성|확인|정리)\s*(?:했다고|하셨다고|하셨다|했다|하였다)|알아봤다고|배웠다고|들었다고|적혔다고|적혀있다고|했던데|했더군요|하셨던데|개발하였|개발했|을\s*읽고|를\s*읽고|관찰하여|비교하고\s*정리|을\s*제작했|를\s*제작했|을\s*분석했|를\s*분석했|을\s*발표했|를\s*발표했|을\s*만들었|를\s*만들었|을\s*진행했|를\s*진행했|을\s*조사했|를\s*조사했|을\s*탐구했|를\s*탐구했|에서\s*본인이|에서\s*자신이|만들\s*때\s*어떤|활동들을\s*했던데|보고서를\s*제출한|보고서를\s*(?:작성|제출)|활동에서\s*.*조사|활동에서\s*.*실험|동아리\s*활동에서|진로활동에서|자율활동에서|봉사활동에서|[1-3]학년\s*(?:때|[가-힣]+시간)|(?:생기부|세특|개세특|학생부|자소서)에\s*(?:적힌|있는|나온|기록된))/;
const ROLE_QUESTION_RE = /(부장|반장|회장|팀장|동아리장|모둠장|조장|대표|리더)(?:으로서|의|역할)/;

export function isCleanQuestion(qStr: string, recTxt: string, validKeywords: string[], targetMajor: string, targetUniv?: string): boolean {
  if (!qStr) return false;
  const nonSpaceLen = qStr.replace(/\s/g, '').length;
  if (nonSpaceLen < 18 || qStr.length > 200) return false;

  // 1. 괄호 열림/닫힘 불일치(깨진 크롤링 텍스트) 차단
  const openParen = (qStr.match(/\(/g) || []).length;
  const closeParen = (qStr.match(/\)/g) || []).length;
  if (openParen !== closeParen) return false;

  const openBracket = (qStr.match(/\[/g) || []).length;
  const closeBracket = (qStr.match(/\]/g) || []).length;
  if (openBracket !== closeBracket) return false;

  if (NOISE_RE.test(qStr)) return false;
  if (SYMBOL_PLACEHOLDER_RE.test(qStr)) return false;
  if (CONTEXT_DEPENDENT_START_RE.test(qStr.trim())) return false;
  if (BAD_START_RE.test(qStr.trim())) return false;
  if (BAD_PAST_TERMS_RE.test(qStr)) return false;
  if (BROKEN_TEXT_RE.test(qStr)) return false;
  if (BROKEN_OR_DEPENDENT_RE.test(qStr)) return false;
  if (OCR_BROKEN_RE.test(qStr)) return false;
  if (PDF_CORRUPT_RE.test(qStr)) return false;
  if (OTHER_STUDENT_PREMISE_RE.test(qStr)) return false;
  if (DISALLOWED_PAST_ACTIVITIES_RE.test(qStr)) return false;
  if (PAST_OTHER_ACTIVITY_RE.test(qStr)) return false;
  if (/<[^>]+>|class\s*=|span\s+class/i.test(qStr)) return false;
  if (qStr.length < 25 && /(?:한 건가요|인지 아시나요|했나요)\??$/.test(qStr.trim())) return false;
  if (/^<.*>$/.test(qStr.trim())) return false;
  if (!QUESTION_CHECK_RE.test(qStr) || !VALID_QUESTION_END_RE.test(qStr.trim())) return false;

  // 자유전공/무전공 지원 시 자연과학/공학 심화 기출 및 특정 어문 기출 차단
  if (/자[유율]전공|무전공/.test(targetMajor)) {
    if (/(?:촉매|전고체|배터리|이차전지|2차\s*전지|광촉매|연료전지|반도체|화학적|한국어의\s*발전|미분|적분|양자|전기차|리튬|소설\s*구성|작품에서|전기회로|전자회로|리포좀|약물\s*전달|광해군|인조|임진왜란|조선\s*왕조|아두이노|작곡)/.test(qStr)) {
      return false;
    }
  }

  // 타 대학명 차단
  const uMatch = qStr.match(UNIV_NAMES_RE);
  if (uMatch) {
    if (!targetUniv || !targetUniv.includes(uMatch[0].replace(/대학교?$/, ''))) {
      return false;
    }
  }
  if (!targetUniv && /(?:본교|우리\s*대학|우리\s*학교|캠퍼스)/.test(qStr)) {
    return false;
  }

  // 타 전공 및 특정 직종 타인 활동 차단
  if (qStr.includes('생물교사') && !targetMajor.includes('생물')) return false;
  if (qStr.includes('유아교육') && !targetMajor.includes('유아')) return false;
  if (/(?:수학과|미분)/.test(qStr) && !/(?:수학|통계|인공지능|컴퓨터|전자|기계|물리|공학)/.test(targetMajor)) return false;
  if (qStr.includes('약사로써') && !targetMajor.includes('약')) return false;
  if (/(?:의사의\s*역할|의료용\s*인공지능)/.test(qStr) && !/(?:의예|의학|간호|약학|치의|한의)/.test(targetMajor)) return false;
  if (/(?:암모니아|몰랄농도|올농도|화학\s*연구원)/.test(qStr) && !/(?:화학|생명|화공|신소재|재료|바이오)/.test(targetMajor)) return false;

  const roleMatch = qStr.match(ROLE_QUESTION_RE);
  if (roleMatch && !recTxt.includes(roleMatch[1])) return false;

  // 타 계열 전용 질문 차단
  if (/(?:환자|처방|의사로서|임상시험|투약)/.test(qStr) && !/의예|의학|간호|약학|치의|한의/.test(targetMajor)) {
    return false;
  }
  if (/(?:교사|선생님|수업\s*지도안|학생\s*지도|수학교육|교사가\s*되었을\s*때|교원|사범|디지털\s*교과서|교사\s*임용|교권|교육학|교직|학교\s*현장|교사의\s*자질|예비\s*교사)/.test(qStr) && !/교육|교대|사범|유아|초등|교원/.test(targetMajor)) {
    return false;
  }
  if (/(?:건축가|건축설계|건축시공)/.test(qStr) && !/건축|토목|도시/.test(targetMajor)) {
    return false;
  }
  if (/(?:러시아|우크라이나|국제분쟁|외교관)/.test(qStr) && !/정치|외교|국제|사회/.test(targetMajor)) {
    return false;
  }
  if (/(?:소프트웨어\/AI|알고리즘\s*대회)/.test(qStr) && !/(?:컴퓨터|소프트웨어|SW|AI|인공지능|데이터|정보기술|정보통신|전산)/.test(targetMajor)) {
    return false;
  }
  if (/(?:자율\s*주행)/.test(qStr) && !/(?:자동차|기계|모빌리티|컴퓨터|전자|전기|AI|인공지능|로봇)/.test(targetMajor)) {
    return false;
  }

  // 2. 타 학과 명시적 전공 접두사 차단 (예: (수학과), (철학과), (경영학과), (화학공학과) 등)
  const specificDeptMatch = qStr.match(/\(?([가-힣]{2,8}(?:학과|학부|과|전공))\)?/);
  if (specificDeptMatch && targetMajor) {
    const dName = specificDeptMatch[1].replace(/(학과|학부|전공|과)$/, '');
    const tName = targetMajor.replace(/(학과|학부|전공|과|계열)$/, '');
    if (tName && !tName.includes(dName) && !dName.includes(tName)) {
      return false;
    }
  }

  if (/^(?:무엇|어떤\s*것|어떻게|왜)\s*(?:이라고|라고)?\s*(?:생각하나요|보나요|생각합니까)\??$/.test(qStr.trim())) return false;

  const qQuotes = qStr.match(/[‘'"“「『<《]([^’'"”」』>》]{2,100})[’'"”」』>》]/g);
  if (qQuotes) {
    for (const qq of qQuotes) {
      const cleanQQ = qq.replace(/[‘'"“「『<《’'"”」』>》]/g, '').trim();
      if (cleanQQ.length >= 2 && !recTxt.includes(cleanQQ)) {
        return false;
      }
    }
  }

  const deptMatch = qStr.match(/([가-힣]{2,10}(?:학과|학부))/);
  if (deptMatch && targetMajor) {
    const mk = targetMajor.replace(/(학과|학부|전공|과|계열)$/, '');
    if (!deptMatch[1].includes(mk) && !mk.includes(deptMatch[1].replace(/(학과|학부|전공|과|계열)$/, ''))) {
      return false;
    }
  }

  if (targetMajor && !isQuestionFieldCompatible(qStr, targetMajor, recTxt)) {
    return false;
  }

  if (/실험/.test(qStr) && !recTxt.includes('실험')) {
    return false;
  }

  if (!checkForeignProject(qStr, recTxt)) {
    return false;
  }

  if (PAST_ACTIVITY_RE.test(qStr)) {
    const hit = validKeywords.some((kw) => hasTerm(qStr, kw));
    if (!hit) return false;
  }
  return true;
}

export function splitCaseQs(qTxt: string, aTxt: string, recTxt: string, validKeywords: string[], targetMajor: string, targetUniv?: string): Array<{ qText: string; ans: string | null }> {
  if (!qTxt) return [];
  const qLines = qTxt.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const pairs: Array<{ qText: string; ans: string | null }> = [];
  for (const ql of qLines) {
    const cleanQ = stripQPrefix(ql);
    if (!isCleanQuestion(cleanQ, recTxt, validKeywords, targetMajor, targetUniv)) continue;

    let matchedAns: string | null = null;
    const numMatch = ql.match(/^\s*([0-9]+(?:-[0-9]+|\([0-9]+\))?)\s*[.)]/);
    if (numMatch && aTxt) {
      const qNum = numMatch[1].replace(/[()]/g, '');
      const re = new RegExp('(?:^|[\\r\\n]+)\\s*' + qNum.replace('-', '\\-') + '\\s*[.)]\\s*([\\s\\S]*?)(?=(?:[\\r\\n]+\\s*[0-9]+(?:-[0-9]+|\\([0-9]+\\))?\\s*[.)])|$)');
      const am = aTxt.match(re);
      if (am && am[1].trim()) {
        matchedAns = am[1].trim();
      }
    }
    pairs.push({ qText: cleanQ, ans: matchedAns });
  }
  return pairs;
}

export function extractUnivQTails(
  univ: string,
  pastData?: PastExamData | null
): Array<{ cat: string; b: 'A' | 'C' | 'P'; tail: string; orig: string; head: string }> {
  const data = pastData || getPastExamData();
  const d = data && data.UNIV_Q && data.UNIV_Q[univ] ? data.UNIV_Q[univ] : null;

  let academicScore = 0;
  let careerScore = 0;
  let commScore = 0;

  if (d) {
    const allQs = Object.values(d).flat().join(' ');
    academicScore = (allQs.match(/(?:원리|개념|이유|한계|증명|심화|원인|학업|분석|근거|탐구)/g) || []).length;
    careerScore = (allQs.match(/(?:전공|진로|지원|발전|목표|학과|관심|계기|역량)/g) || []).length;
    commScore = (allQs.match(/(?:공동체|인성|협력|갈등|배려|소통|모둠|구성원|역할)/g) || []).length;
  }

  // [구조 개선 1] 어느 교과·활동 문장 뒤에 붙여도 100% 자연스러운 화이트리스트 화법 뱅크
  const aTails = [
    { cat: '학업', b: 'A' as const, tail: '해당 탐구에서 활용한 핵심 개념과 원리를 본인의 말로 명확하게 설명해 주세요.', orig: '해당 탐구에서 활용한 핵심 개념과 원리를 본인의 말로 명확하게 설명해 주세요.', head: '' },
    { cat: '학업', b: 'A' as const, tail: '활동 과정에서 가장 어려웠던 점이나 예상과 달랐던 점은 무엇이었으며, 이를 어떻게 해결했는지 구체적으로 설명해 주세요.', orig: '활동 과정에서 가장 어려웠던 점이나 예상과 달랐던 점은 무엇이었으며, 이를 어떻게 해결했는지 구체적으로 설명해 주세요.', head: '' },
    { cat: '학업', b: 'A' as const, tail: '이 탐구를 통해 도출한 결론을 뒷받침하는 핵심 근거와, 스스로 보완하고 싶은 한계점은 무엇인지 말씀해 주세요.', orig: '이 탐구를 통해 도출한 결론을 뒷받침하는 핵심 근거와, 스스로 보완하고 싶은 한계점은 무엇인지 말씀해 주세요.', head: '' }
  ];

  const cTails = [
    { cat: '전공', b: 'C' as const, tail: '이 주제를 대학에 입학해 더 깊이 있게 발전시킨다면 어떤 연구나 전공 과목으로 연결하고 싶은가요?', orig: '이 주제를 대학에 입학해 더 깊이 있게 발전시킨다면 어떤 연구나 전공 과목으로 연결하고 싶은가요?', head: '' },
    { cat: '전공', b: 'C' as const, tail: '이 탐구를 통해 지원 전공에서 필요로 하는 어떤 핵심 역량을 길렀다고 생각하는지 구체적으로 설명해 주세요.', orig: '이 탐구를 통해 지원 전공에서 필요로 하는 어떤 핵심 역량을 길렀다고 생각하는지 구체적으로 설명해 주세요.', head: '' },
    { cat: '전공', b: 'C' as const, tail: '이 활동에서 생긴 문제의식이 자신의 진로 목표나 전공 선택을 구체화하는 데 어떤 영향을 미쳤나요?', orig: '이 활동에서 생긴 문제의식이 자신의 진로 목표나 전공 선택을 구체화하는 데 어떤 영향을 미쳤나요?', head: '' }
  ];

  const pTails = [
    { cat: '인성', b: 'P' as const, tail: '역할을 수행하는 과정에서 구성원 간 의견 차이나 어려움이 생겼을 때, 이를 극복하기 위해 어떻게 소통하고 조율했는지 설명해 주세요.', orig: '역할을 수행하는 과정에서 구성원 간 의견 차이나 어려움이 생겼을 때, 이를 극복하기 위해 어떻게 소통하고 조율했는지 설명해 주세요.', head: '' },
    { cat: '인성', b: 'P' as const, tail: '이 활동을 추진하면서 공동체와 구성원을 위해 가장 중요하게 생각한 가치는 무엇이었고, 이를 실천하기 위해 어떤 노력을 했는지 설명해 주세요.', orig: '이 활동을 추진하면서 공동체와 구성원을 위해 가장 중요하게 생각한 가치는 무엇이었고, 이를 실천하기 위해 어떤 노력을 했는지 설명해 주세요.', head: '' }
  ];

  if (commScore > academicScore && commScore > careerScore) {
    return [pTails[0], cTails[0], aTails[0], pTails[1], cTails[1], aTails[1], cTails[2], aTails[2]];
  } else if (careerScore > academicScore) {
    return [cTails[0], aTails[0], cTails[1], aTails[1], cTails[2], aTails[2], pTails[0], pTails[1]];
  } else {
    return [aTails[0], cTails[0], aTails[1], cTails[1], aTails[2], cTails[2], pTails[0], pTails[1]];
  }
}

export function matchCases(univ: string, major: string, field: any, pastData?: PastExamData | null): Array<{ i: number; s: number; r: any }> {
  const data = pastData || getPastExamData();
  const cases = data ? data.CASES : [];
  if (!cases || !cases.length) return [];
  const mk = (major || '').replace(/(학과|학부|전공|과|계열)$/, '');
  const scored = cases
    .map((r, i) => {
      let s = 0;
      const isUnivMatch = univ && r[0] === univ;
      const isExactMajor = mk && r[2].includes(mk);
      const isPartialMajor = mk && mk.length >= 2 && mk.slice(0, 2) && r[2].includes(mk.slice(0, 2));
      const isFieldMatch = field && field.re.test(r[2]);

      // 전공 또는 계열이 전혀 맞지 않는 경우, 같은 대학이라도 남의 전공 복기 탈락!
      if (mk && !isExactMajor && !isPartialMajor && !isFieldMatch) {
        return { i, s: 0 };
      }

      // 자유전공/무전공 지원 시 타 전공(공학, 자연과학 등) 복기 전면 차단
      if (/자[유율]전공|무전공/.test(major) && !/자[유율]전공|무전공/.test(r[2])) {
        return { i, s: 0 };
      }

      if (isUnivMatch) s += 3;
      if (isExactMajor) s += 4;
      else if (isPartialMajor) s += 1.5;
      if (isFieldMatch) s += 1.5;
      return { i, s };
    })
    .filter((x) => x.s >= 3)
    .sort((a, b) => b.s - a.s);
  return scored.map((x) => ({ ...x, r: cases[x.i] }));
}

export const QB_KIND = ['면접후기', '학과별 기출', '인적성·MMI', '제시문·구술', '가이드 예시'];
const QB_STOP = new Set('그리고 그러면 그럼 무엇 어떤 어떻게 생각 이유 설명 본인 자신 가장 활동 경험 대해 관련 통해 학생 지원 학과 질문 내용 과목 교과 학교 노력 과정 결과 사실 구체적 의미 말씀 부분 혹시 진로 배운 느낀 점은 점이 점을 계기 동기 이야기 하고 싶은 것을 것이 것은 있다면 무엇이 중요 필요 방법 사람 이런 그런 저런 여러 다른 많이 조금 정말 혹시 지금 나중 이후 이전 이상 이하'.split(' '));
const QB_REF = /(적혀|기록되|기록이|되어 ?있|했는데|했네요|하셨는데|하셨네요|했던데|읽었는데|생기부|학생부|세특|보니까|보니|탐구했|했다고|하셨다고|말했는데|했다는데|쓰여|아까|방금)/;

export function qbNouns(t: string): string[] {
  return [
    ...new Set(
      (t.match(/[가-힣A-Za-z0-9]{2,}/g) || [])
        .map((w) =>
          w.replace(
            /(에서|으로|에게|이라는|라는|이란|이라|와의|과의|에는|에도|까지|부터|처럼|보다|이나|이며|이고|하고|하는|하게|하며|했던|했고|했는데|했다|이다|에|은|는|이|가|을|를|의|와|과|도|로|만|요)$/,
            ''
          )
        )
        .filter((w) => w.length >= 2 && !QB_STOP.has(w))
    )
  ];
}

export function qbMatch(
  univ: string,
  major: string,
  flds: any[],
  kw: string[],
  recText: string,
  pastData?: PastExamData | null,
  opts: { pool?: boolean; min?: number } = {}
): Array<{ i: number; s: number; r: any }> {
  const data = pastData || getPastExamData();
  const qb = data ? data.QB : { S: [], U: [], R: [] };
  if (!qb || !qb.R || !qb.R.length) return [];

  const mk = (major || '').replace(/(학과|학부|전공|과|계열)$/, '');
  const ui = qb.U.indexOf(univ || '@@');
  const med = /의예|의학|치의|한의|약학|수의|간호/.test(major || '');
  const teach = /교육|교대|사범|유아|초등/.test(major || '') || /교육대학교|교원대/.test(univ || '');
  const rec = recText || '';
  const kwl = (kw || []).filter((k) => k.length >= 2).slice(0, 40);
  const out: Array<{ i: number; s: number; r: any }> = [];

  for (let i = 0; i < qb.R.length; i++) {
    const r = qb.R[i];
    if (opts.pool && (r[8] || r[4] === 3 || (r[4] === 4 && !r[2]))) continue;
    if (opts.pool && /자[유율]전공|무전공/.test(major)) {
      if (/(?:촉매|전고체|배터리|이차전지|2차\s*전지|광촉매|연료전지|반도체|화학적|한국어의\s*발전|미분|적분|양자|전기차|리튬|소설\s*구성|작품에서|전기회로|전자회로|리포좀|약물\s*전달|광해군|인조|임진왜란|조선\s*왕조|아두이노|작곡)/.test(r[0])) continue;
      if (r[2] && /(?:공학|이과|자연|생명|화학|물리|의예|간호|약학|전자|기계|배터리|신소재|어문|국문|영문|중문|일문)/.test(r[2])) continue;
    }
    if (opts.pool && r[4] === 2 && !(med || teach) && !/협력|갈등|배려|봉사|리더|공동체|인성|윤리|도움|소통|소외|규칙|규정|정직|도덕|가치|태도/.test(r[0])) continue;
    if (opts.pool && !teach && /(?:디지털\s*교과서|교사\s*임용|수업\s*지도안|교권|교육학|교직|학생\s*지도|학교\s*현장|교사의\s*자질|예비\s*교사)/.test(r[0])) continue;
    let s = 0;
    if (ui >= 0 && r[1] === ui) s += 3;
    const m = r[2] || '';
    if (mk && m) {
      if (m.includes(mk) || mk.includes(m.replace(/(학과|학부|전공|과|계열)$/, ''))) s += 4;
      else if (mk.length >= 2 && m.includes(mk.slice(0, 2))) s += 1.5;
      else if (flds && flds.some((f) => f.re.test(m))) s += 1.5;
    }
    if (r[4] === 2 && ((med && /의|약|간호|MMI|인적성/.test(qb.S[r[5]] + m)) || (teach && /교원|교직|교육/.test(qb.S[r[5]] + m)))) s += 3;
    let hit = 0;
    if (rec || kwl.length) {
      const ns = qbNouns(r[0]);
      for (const n of ns) {
        if (n.length >= 2 && rec.includes(n)) hit += n.length >= 3 ? 1 : 0.5;
        else if (kwl.some((k) => k === n)) hit += 0.4;
      }
    }
    s += Math.min(hit, 4);
    if (/협력|갈등|배려|봉사|리더|공동체|팀|친구|구성원|학급|동료|멘토|나눔|기여|규칙|인성|도움|화합|타인|소통|양보|인간관계|사회생활|생활|어려움|대처|프리라이더|존경|역할|조율|경청|수업/.test(r[0])) {
      s += 1.5;
    }
    if (opts.pool && QB_REF.test(r[0]) && hit < 2) continue;
    if (!opts.pool && r[8]) s -= 1;
    if (s >= (opts.min || 2)) out.push({ i, s, r });
  }

  out.sort((a, b) => b.s - a.s);
  return out;
}

export function classifyText(q: string): 'A' | 'C' | 'P' | 'M' | 'D' {
  if (/부장|반장|회장|팀장|동아리장|모둠장|조장|리더|갈등|협업|협동|모둠|팀원|배려|봉사|프리라이더|무임승차|친구|공동체|소통|의견\s*조율|조율|중재|화합|타인|양보|인간관계|사회생활|나눔|기여|멘토|멘티|규칙|도덕|인성|도움/.test(q)) return 'P';
  if (/지원|진로|전공|학과|입학 후|졸업|꿈|장래|목표|희망|직업/.test(q)) return 'C';
  if (/성장|극복|실패|스스로|계획|발전|노력/.test(q)) return 'D';
  if (/요약|설득|토론|입장|찬반/.test(q)) return 'M';
  return 'A';
}

function mulberry(seed: number) {
  let s = seed >>> 0;
  return function () {
    let t = (s += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============================================================
// 8. 룰 엔진 후보 풀 빌더 (buildRuleCandidatePool)
// ============================================================
export const P_INTERACTION_POSITIVE_RE = /(?:모둠원|팀원|조원|학급\s*반장|부반장|학생회|조장|모둠장|동아리장|구성원|급우|학우|친구들|동료|멘토|멘티|후배|선배|스터디그룹|협업|협동|역할\s*분담|의견을?\s*(?:수렴|조율|경청)|갈등을?\s*(?:해결|조율|중재)|자발적\s*참여를\s*이끌|도움을?\s*주|배려하|나눔|봉사)/;
export const P_INTERACTION_NEGATIVE_RE = /(?:소감을\s*작성|활동을\s*설계|가사를\s*찾아|견해를\s*논리적으로|심화\s*탐구를\s*진행|법\s*개정\s*방향|제도를?\s*검토|정책을?\s*제안|선의\s*간격|리듬감|곡선의\s*흐름|시각적\s*밀도|작품을\s*제작|구상권|피해자\s*중심|갈등\s*사례|민원\s*갈등|사회적\s*갈등|인물\s*간\s*갈등)/;

export function isStrictCommunitySentence(s: SentenceItem): boolean {
  if (!s || !s.text) return false;
  const t = s.text;
  if (P_INTERACTION_NEGATIVE_RE.test(t)) return false;
  return P_INTERACTION_POSITIVE_RE.test(t);
}

export function buildRuleCandidatePool(
  records: StudentRecordItem[],
  targetMajor: string,
  targetUniversity: string,
  customKeywords?: string[],
  pastData?: PastExamData | null
): CandidateQuestion[] {
  const hasUniv = Boolean(targetUniversity && !isUnsetUniv(targetUniversity));
  const hasMajor = Boolean(targetMajor && !isUnsetMajor(targetMajor));
  const U = hasUniv ? targetUniversity.trim() : '우리 대학';
  const M = hasMajor ? targetMajor.trim() : '지원 전공';
  const univShort = hasUniv ? targetUniversity.trim().replace(/대학교$/, '대') : '우리 대';
  const fusionBadge = hasUniv ? `[${univShort} 예시화법]` : '[실전 면접화법]';
  const flds = fieldsOf(M);
  const fld = flds[0] || null;

  // 1. StudentRecordItem[]을 구조화된 SentenceItem[] 및 recs로 변환 (모든 HTML 태그 완전 소독)
  const sanitizedRecords = (records || []).map((r, ri) => ({
    ...r,
    subject: cleanLabelText(r.subject || ''),
    text: cleanKoreanSpacing(stripHtmlTags(r.text || '')).replace(/\s+\./g, '.')
  }));

  const recs = sanitizedRecords.map((r, ri) => {
    let sec: '교과' | '창체' | '행특' | '독서' | '기타' = '교과';
    if (r.type === '창의적 체험활동' || /진로|자율|동아리|봉사/.test(r.subject)) sec = '창체';
    else if (r.type === '행동특성및종합의견' || /행특|종합의견/.test(r.subject)) sec = '행특';
    else if (r.type === '독서활동' || /독서/.test(r.subject)) sec = '독서';

    const gMatch = String(r.grade || '').match(/([123])/);
    const grade = gMatch ? +gMatch[1] : 1;
    const area = sec === '창체' ? r.subject : undefined;
    const subj = sec === '교과' ? r.subject : undefined;
    const cleanText = r.text;

    return {
      id: r.id || `rec-${ri}`,
      sec,
      grade,
      area,
      subj,
      text: cleanText
    };
  });

  const quotesList: string[] = [];
  const qre = /[‘'"“「『<《]([^’'"”」』>》]{2,70})[’'"”」』>》]/g;
  recs.forEach((r) => {
    let m: RegExpExecArray | null;
    while ((m = qre.exec(r.text))) {
      let q = stripHtmlTags(m[1]).trim();
      q = q.replace(/^[<'"“「『]+|[>'”」』]+$/g, '').trim();
      if (
        q.length >= 2 &&
        !/^(?:span|class|highlight|div|mark|style|table|tbody|tr|td|br|p|html|body|span class)$/i.test(q) &&
        !/class\s*=/i.test(q)
      ) {
        quotesList.push(q);
      }
    }
  });

  const kwObjects = extractKeywordsAdvanced(recs, quotesList);
  const recTxt = recs.map((r) => r.text).join(' ');

  const validKeywords = kwObjects
    .filter((k) => k.score >= 1.35 && !CONCEPT_EXCLUDE.has(k.term))
    .map((k) => k.term);

  CONCEPTS.forEach(([term, al]) => {
    if (!CONCEPT_EXCLUDE.has(term) && hasTerm(recTxt, term)) validKeywords.push(term);
    if (al) {
      al.split('|').forEach((a) => {
        const at = a.trim();
        if (!CONCEPT_EXCLUDE.has(at) && hasTerm(recTxt, at)) validKeywords.push(at);
      });
    }
  });

  const majorKw = [
    ...new Set([
      ...(M ? [M.replace(/(학과|학부|전공|과)$/, '')] : []),
      ...flds.flatMap((f) => (FIELD_KW[f.id] || '').split(' ')),
      ...(customKeywords || []),
      ...kwObjects.slice(0, 30).map((k) => k.term)
    ].filter((k) => k && k.length >= 2))
  ];

  const ctx = {
    major: M,
    majorKw,
    dynamicKeywords: kwObjects
  };

  const rawSents: SentenceItem[] = [];
  recs.forEach((r, ri) => {
    let cleanText = stripHtmlTags(r.text || '');
    cleanText = cleanKoreanSpacing(cleanText);
    cleanText = cleanText.replace(/\s+\./g, '.');
    // 마침표 없이 명사형 종결 후 다음 활동 인용구가 바로 이어지는 경우 분리
    cleanText = cleanText.replace(/([가-힣]{2,}(?:함|음|돋보임|보임|나타냄|드러냄|확인됨|이루어짐|수행함|작성함|발표함|조사함|분석함))\s+(?=['‘"“])/g, '$1.\n');
    const parts = cleanText.replace(/([가-힣)'’"”])\.\s*(?=[가-힣A-Za-z'‘"“([<0-9])/g, '$1.\n').split('\n');
    parts.forEach((p, pi) => {
      let pt = stripHtmlTags(p).trim();
      pt = pt.replace(/^(?:계열|활동\s*내용|특기\s*사항|과목\s*세특\s*헤더|과목세특헤더|이수\s*단위|학기|교과|과목)\s*[:：]?\s*/, '');
      pt = pt.replace(/\(?\[?\d+시간\]?\)?/g, '').replace(/^(?:교사|과학|에서|에는)\s+/, '');
      pt = cleanKoreanSpacing(pt);
      pt = pt.replace(/\s+\./g, '.');
      if (pt.length >= 12) {
        rawSents.push({
          sec: r.sec,
          grade: r.grade,
          subj: r.subj,
          area: r.area,
          text: pt,
          qtext: pt,
          rid: ri,
          pi,
          rel: 0,
          score: 0,
          f: {},
          quotes: [],
          concepts: []
        });
      }
    });
  });

  const sents = rawSents.map((s) => analyze(s, ctx)).sort((a, b) => b.score - a.score);
  const pool: CandidateQuestion[] = [];

  // [1] Multi-hop Generator (순수 학술 개념어 또는 3글자 이상 순수 명사만 허용)
  const multiHopKwCandidates = kwObjects
    .filter((k) => k.crossSectionDF >= 2 && isEligibleForMultiHop(k.term, M, customKeywords))
    .map((k) => k.term);

  CONCEPTS.forEach(([term]) => {
    if (isEligibleForMultiHop(term, M, customKeywords) && !multiHopKwCandidates.includes(term)) {
      const matchCount = sents.filter((s) => !MANDATORY_EDU_RE.test(s.text) && s.text.includes(term)).length;
      if (matchCount >= 2) multiHopKwCandidates.push(term);
    }
  });

  multiHopKwCandidates.slice(0, 4).forEach((kw, mIdx) => {
    const hits = sents.filter((s) => !MANDATORY_EDU_RE.test(s.text) && s.text.includes(kw));
    if (hits.length >= 2) {
      let s1 = hits[0];
      let s2 = hits.find((h) => recordLabel(h) !== recordLabel(s1));
      if (!s2 && hits[0].rid !== hits[1].rid) {
        s2 = hits[1];
      }
      if (!s1 || !s2 || recordLabel(s1) === recordLabel(s2)) return;

      // 동음이의어 또는 완전히 다른 계열 간 잘못된 연계 방지 (예: '스트레스' - 식물 염분 스트레스 vs 심리 스트레스)
      const s1Subj = s1.subj || s1.area || '';
      const s2Subj = s2.subj || s2.area || '';
      const isS1Sci = /(?:물리|화학|생명|지구|과학|생물)/.test(s1Subj);
      const isS2Sci = /(?:물리|화학|생명|지구|과학|생물)/.test(s2Subj);
      const isS1Hum = /(?:국어|문학|화작|독서|사회|윤리|도덕|역사|지리|경제|정치)/.test(s1Subj);
      const isS2Hum = /(?:국어|문학|화작|독서|사회|윤리|도덕|역사|지리|경제|정치)/.test(s2Subj);
      if ((isS1Sci && isS2Hum) || (isS1Hum && isS2Sci)) {
        if (/스트레스|반응|변화|적응|조화|순환/.test(kw)) return;
      }

      // [마감 1] 체육/스포츠 vs 화학/생명 간 '호흡' 연계 금지
      const isS1Pe = /(?:체육|스포츠|운동|건강)/.test(s1Subj);
      const isS2Pe = /(?:체육|스포츠|운동|건강)/.test(s2Subj);
      if ((isS1Pe && isS2Sci) || (isS2Pe && isS1Sci)) {
        if (/호흡|스트레스|운동|체력|반응/.test(kw)) return;
      }
      // [마감 1] 역사 과목(삼국간섭 등)에서 '간섭' 연계 금지
      const isS1Hist = /(?:역사|한국사|동아시아사|세계사)/.test(s1Subj);
      const isS2Hist = /(?:역사|한국사|동아시아사|세계사)/.test(s2Subj);
      if (isS1Hist || isS2Hist || /삼국\s*간섭/.test(s1.text) || /삼국\s*간섭/.test(s2.text)) {
        if (/간섭/.test(kw)) return;
      }

      if (s1.grade > s2.grade) {
        const tmp = s1;
        s1 = s2;
        s2 = tmp;
      }
      const lab1 = recordLabel(s1), lab2 = recordLabel(s2);

      pool.push(
        Q({
          b: 'C',
          k: `mhop_${mIdx}`,
          p: 4.8,
          type: '종단연계',
          tplId: 'multihop_growth',
          src: '종단연계',
          srcBadge: '[학년·과목 연계]',
          catGroup: 'record',
          text: `${lab1}에서 다룬 ‘${kw}’ 주제를 ${lab2}에서 한 단계 더 확장해 탐구했는데, 두 과목의 활동을 연결하게 된 문제의식과 학업적 성장을 설명해 주세요.`,
          rtext: `${stripHtmlTags(s1.text)} / ${stripHtmlTags(s2.text)}`,
          rlab: `${lab1} ➔ ${lab2}`,
          sref: s2,
          ans: `${josa(`‘${kw}’`, '을/를')} 중심으로 ${lab1}에서 기초 원리를 탐구한 뒤, ${lab2}에서 심화 응용 과제로 확장했습니다. 이 연계를 통해 단순 지식 습득에 머물지 않고 학문 간 융합적 사고력과 자기주도적 연구 역량을 키울 수 있었습니다.`,
          ansLabel: '모범 답변 가이드',
          tip: '학년이 올라가며 탐구의 깊이와 문제의식이 어떻게 발전했는지 구체적 계기를 들어 답변',
          tails: ['두 활동 사이에 생긴 가장 결정적인 의문점은 무엇이었나요?']
        })
      );

      pool.push(
        Q({
          b: 'A',
          k: `mhop2_${mIdx}`,
          p: 4.6,
          type: '종단연계',
          tplId: 'multihop_expand',
          src: '종단연계',
          srcBadge: '[학년·과목 연계]',
          catGroup: 'record',
          text: `${lab1}의 ‘${kw}’ 탐구에서 마주한 한계나 의문점을 ${lab2}에서 어떻게 발전시켜 해결했는지 구체적인 계기를 말씀해 주세요.`,
          rtext: `${stripHtmlTags(s1.text)} / ${stripHtmlTags(s2.text)}`,
          rlab: `${lab1} ➔ ${lab2}`,
          sref: s2,
          ans: `${lab1} 탐구 당시 [한계나 궁금했던 점]이 남아있었습니다. 이를 해결하기 위해 ${lab2}에서 [새로운 접근법이나 도구]를 도입하여 해결했으며, 이 과정에서 전공 분야에 대한 문제 해결력을 확립했습니다.`,
          ansLabel: '모범 답변 가이드',
          tip: '이전 탐구의 한계를 후속 탐구에서 극복한 디딤돌 과정을 설득력 있게 제시',
          tails: ['대학에서 이 주제를 더 발전시킨다면 어떤 연구로 잇고 싶나요?']
        })
      );
    }
  });

  // [2] Pure Student Record Candidates (from candidatesFrom)
  sents.filter((s) => !s.skip).slice(0, 80).forEach((s) => {
    candidatesFrom(s, ctx).forEach((q) => {
      q.rtext = stripHtmlTags(s.text);
      q.rlab = recordLabel(s);
      q.sref = s;
      q.catGroup = 'record';
      q.srcBadge = '[학생부 심층검증]';
      pool.push(q);
    });
  });

  // [3] Fusion Questions (from Whitelist Phrasing Bank)
  const allTails = extractUnivQTails(U, pastData);
  let purePCount = 0;
  allTails.forEach((tObj, tIdx) => {
    const b: 'A' | 'C' | 'P' = tObj.b;
    let matchSent: SentenceItem | null = null;

    if (b === 'P') {
      const pCandidates = sents.filter(isStrictCommunitySentence);
      if (pCandidates.length === 0) {
        // [구조 개선 2] 폴백 완전 금지: 조건 통과 문장이 0개면 P [예시화법]은 0개만 생성 (억지 채움 절대 금지)
        return;
      }
      if (purePCount >= 1) {
        // 1개면 1개만 생성
        return;
      }
      matchSent = pCandidates[0];
    } else if (b === 'C') {
      const cCandidates = sents.filter((s) => 
        !isStrictCommunitySentence(s) && 
        !MANDATORY_EDU_RE.test(s.text) && 
        !SIMPLE_PRACTICAL_ACTIVITY_RE.test(s.text) && 
        (s.rel || s.area === '진로활동' || (s.f && s.f.read))
      );
      if (cCandidates.length > 0) {
        matchSent = cCandidates[tIdx % cCandidates.length];
      } else {
        matchSent = sents.find((s) => 
          !isStrictCommunitySentence(s) && 
          !MANDATORY_EDU_RE.test(s.text) && 
          !SIMPLE_PRACTICAL_ACTIVITY_RE.test(s.text)
        ) || null;
      }
    } else {
      const aCandidates = sents.filter((s) => !isStrictCommunitySentence(s) && (s.f?.experiment || s.f?.inquiry || s.f?.make || s.concepts.length > 0));
      if (aCandidates.length > 0) {
        matchSent = aCandidates[tIdx % aCandidates.length];
      } else {
        matchSent = sents.find((s) => !isStrictCommunitySentence(s)) || null;
      }
    }

    if (!matchSent) return;

    if (b === 'P') purePCount++;

    // Tail selection
    let tailText = tObj.tail;
    if (b === 'P') {
      if (matchSent.f && (matchSent.f.leader || matchSent.f.conflict)) {
        tailText = '역할을 수행하는 과정에서 구성원 간 의견 차이나 어려움이 생겼을 때, 이를 극복하기 위해 어떻게 소통하고 조율했는지 설명해 주세요.';
      } else if (matchSent.f && (matchSent.f.coop || matchSent.f.care)) {
        tailText = '이 활동을 추진하면서 공동체와 구성원을 위해 가장 중요하게 생각한 가치는 무엇이었고, 이를 실천하기 위해 어떤 노력을 했는지 설명해 주세요.';
      }
    } else if (b === 'A') {
      if (matchSent.f && (matchSent.f.experiment || matchSent.f.make_hw || matchSent.f.make_sw)) {
        if (tIdx % 2 === 0) {
          tailText = '설계·실험 과정에서 예상치 못한 변수나 오차가 발생했을 때 어떤 원리로 원인을 분석하고 개선했는지 설명해 주세요.';
        }
      }
    }

    const topicQ = matchSent.quotes.find((q) => !q.book && isValidInquiryTopic(q.q));
    const bookQ = matchSent.quotes.find((q) => q.book);
    const ancQ = (topicQ && topicQ.q) || (bookQ && bookQ.q) || (matchSent.concepts[0] && matchSent.concepts[0].term) || null;
    const L = lead(matchSent, ancQ, tIdx % 4);
    const fusedText = `${L} ${tailText}`;

    const builtinConcept = matchSent.concepts.find((c) => c.isBuiltin && c.def && !c.def.startsWith('학생부 속'));
    pool.push(
      Q({
        b,
        k: `ufus_${tIdx}_${matchSent.rid}`,
        p: 3.5 + matchSent.score * 0.2,
        type: '화법융합',
        tplId: `fusion_univ_${b.toLowerCase()}_${tIdx % 10}`,
        src: '융합',
        srcBadge: fusionBadge,
        catGroup: 'fusion',
        text: fusedText,
        rtext: stripHtmlTags(matchSent.text),
        rlab: recordLabel(matchSent),
        sref: matchSent,
        ans: builtinConcept ? builtinConcept.def : null,
        ansLabel: builtinConcept ? '관련 개념 정의' : '모범 답변 가이드',
        tip: '대학 입학사정관의 공식 질문 화법과 학생부 탐구를 연결한 융합 문항입니다.',
        tails: ['이 활동에서 본인이 주도적으로 해결한 부분을 설명해 주세요.']
      })
    );
  });

  // [4] Past Questions from CASES (지원 대학 입력 시에만 활성화)
  if (hasUniv) {
    const matchedCases = matchCases(U, M, fld, pastData);
    matchedCases.slice(0, 25).forEach((cItem, cIdx) => {
      const c = cItem.r;
      const isPass = (c[4] || '').includes('합');
      const pairs = splitCaseQs(c[5] || '', c[6] || '', recTxt, validKeywords, M, U);
      pairs.slice(0, 4).forEach((pItem, qIdx) => {
        const qText = pItem.qText;
        const rawAns = cleanPastAnswer(pItem.ans);
        const ansValid = rawAns && isValidAnswerMatch(qText, rawAns);
        const caseUniv = (c[0] || '').replace(/대학교$/, '대');
        const isCaseUnivMatch = hasUniv && caseUniv && targetUniversity.includes(caseUniv.replace(/대$/, ''));
        const caseBadge = isCaseUnivMatch
          ? `[${caseUniv} 합격선배 복기]`
          : `[실전 합격선배 복기]`;

        pool.push(
          Q({
            b: classifyText(qText) as any,
            k: `case_${cIdx}_${qIdx}`,
            p: 2.8 + (isPass ? 0.6 : 0) + (c[0] === U ? 0.5 : 0),
            type: '기출복기',
            tplId: `case_past_${cIdx}_${qIdx}`,
            src: '합격선배 복기',
            srcBadge: caseBadge,
            catGroup: 'past',
            text: qText,
            ans: ansValid ? rawAns : null,
            ansLabel: ansValid ? (isPass ? '실제 합격선배 답변 참고' : '선배 면접 답변 참고') : '모범 답변 가이드',
            tip: c[7] ? `[선배 면접 후기] ${c[7].slice(0, 100)}...` : '실제 면접 복기 문항 — 본인의 학생부 활동으로 바꿔 답변 준비',
            tails: ['그 활동을 통해 최종적으로 느낀 점은 무엇인가요?']
          })
        );
      });
    });
  }

  // [5] Past Questions from QB
  if (hasUniv || hasMajor) {
    const qm = qbMatch(U, M, flds, majorKw, recTxt, pastData, { pool: true, min: 3 });
    const seenQ = new Set<string>();
    let nMajor = 0;
    let nComm = 0;

    for (const x of qm) {
      const r = x.r;
      if (r[8]) continue;
      const cleanQ = stripQPrefix(r[0]);
      if (!isCleanQuestion(cleanQ, recTxt, validKeywords, M, U)) continue;
      if (!isMajorCompatible(r[2], M, flds, cleanQ)) continue;

      if (!hasUniv) {
        // 대학 미입력 시 특정 대학/캠퍼스/지역 언급 질문 100% 배제
        if (/(?:경희대|서울대|연세대|고려대|성균관대|서강대|한양대|중앙대|이화여대|한국외대|건국대|동국대|홍익대|숙명여대|국민대|숭실대|세종대|단국대|가톨릭대|아주대|인하대|경북대|부산대|전남대|전북대|충남대|충북대|강원대|제주대|건양대|인천대|계명대|대구교대|서울교대|경인교대|본교|캠퍼스)/.test(cleanQ)) {
          continue;
        }
      }

      const nk = cleanQ.replace(/[^가-힣A-Za-z0-9]/g, '').slice(0, 22);
      if (seenQ.has(nk)) continue;

      const isComm = r[4] === 2 || classifyText(cleanQ) === 'P';
      if (isComm) {
        const maxComm = hasUniv ? 30 : 8;
        if (nComm >= maxComm) continue;
        nComm++;
      } else {
        const maxMajor = hasUniv ? 45 : 15;
        if (nMajor >= maxMajor) continue;
        nMajor++;
      }
      seenQ.add(nk);

      const mmi = r[4] === 2;
      const uStr = ((pastData?.QB?.U && pastData.QB.U[r[1]]) || univShort).replace(/대학교$/, '대');
      const yearStr = r[6] ? `${r[6]} ` : '';

      const hasKwHit = validKeywords.some((kw) => hasTerm(cleanQ, kw));
      const catGroup = 'past';
      const isTargetUnivMatch = hasUniv && uStr && (targetUniversity.includes(uStr.replace(/대$/, '')) || (pastData?.QB?.U && r[1] === pastData.QB.U.indexOf(U)));
      const srcBadge = isTargetUnivMatch
        ? (hasKwHit ? `[${uStr} 기출융합]` : `[${yearStr}${uStr} 실제기출]`)
        : (hasKwHit ? '[실전 기출융합]' : '[전공 실전 기출]');
      const priority = 2.4 + (hasKwHit ? 3.5 : 0) + (hasUniv && r[1] === (pastData?.QB?.U ? pastData.QB.U.indexOf(U) : -1) ? 3.0 : 0) + (r[6] >= 2025 ? 0.8 : 0);

      const rawAns = cleanPastAnswer(r[7] || null);
      const ansValid = rawAns && isValidAnswerMatch(cleanQ, rawAns);

      pool.push(
        Q({
          b: mmi ? 'P' : (classifyText(cleanQ) as any),
          k: `qb_${x.i}`,
          p: priority,
          type: mmi ? '인적성·MMI' : '대학기출',
          tplId: `qb_item_${x.i}`,
          src: '실제기출',
          srcBadge,
          catGroup,
          text: cleanKoreanSpacing(stripHtmlTags(cleanQ)),
          ans: ansValid ? rawAns : null,
          ansLabel: ansValid ? '실제 합격생 답변 사례' : '모범 답변 가이드',
          tip: hasKwHit ? '내 학생부 탐구 주제와 직접 연결되는 실제 대학 기출입니다.' : '실제 대학 기출 문항입니다.',
          tails: mmi ? ['반대 입장의 사람을 어떻게 설득하겠습니까?'] : ['이 경험이 대학 학업에 어떤 영향을 줄 것이라 보나요?']
        })
      );
    }
  }

  // 중복 제거 및 점수 순 정렬
  pool.sort((a, b) => b.p - a.p);
  return pool;
}

// ============================================================
// 9. 오프라인 표준 룰베이스 질문 60개 생성 (generateStandardRuleQuestions)
// ============================================================
export const UNIVERSAL_FALLBACK_QUESTIONS: Record<CompetencyType | 'university', string[]> = {
  academic: [
    '고등학교 수업 중 가장 흥미롭게 탐구했던 교과 개념이나 원리를 하나 선택하고, 이를 깊이 있게 학습하게 된 계기를 설명해 주세요.',
    '교과 학습이나 탐구 활동 중 이론과 실제 현상이 일치하지 않아 의문이 생겼던 경험이 있다면, 이를 어떻게 해결했는지 말씀해 주세요.',
    '스스로 설정한 학업 목표를 달성하기 위해 자기주도적으로 학습 계획을 세우고 실천했던 대표적인 사례를 소개해 주세요.',
    '교과서 지식을 넘어 관련 도서나 논문, 학술 자료를 찾아보며 지적 호기심을 확장했던 구체적인 경험이 있나요?',
    '어려운 학업적 난관이나 이해하기 힘들었던 학습 과제를 끈기 있게 극복했던 본인만의 학습 노하우는 무엇인가요?',
    '서로 다른 두 개 이상의 교과목에서 배운 지식을 융합하여 새로운 시각으로 문제를 바라보았던 탐구 경험이 있나요?',
    '교과 수업 중 토론이나 발표를 준비하면서 자신의 주장을 설득력 있게 뒷받침하기 위해 활용했던 탐구 방법은 무엇인가요?',
    '자신이 작성한 탐구 보고서나 수행평가 결과물 중 가장 애착이 가고 스스로 성장했다고 느끼는 결과물은 무엇인가요?',
    '학습 과정에서 마주한 복잡한 이론이나 개념을 자신만의 언어나 도식으로 재해석해 이해했던 사례가 있다면 말씀해 주세요.',
    '수업 시간 교사나 급우의 질문에 대해 깊이 고민하고 추가 조사를 통해 답을 찾아냈던 경험을 소개해 주세요.',
    '관심 교과목에서 학업 성취도를 끌어올리기 위해 시도했던 학습 전략 중 가장 효과적이었던 방법은 무엇인가요?',
    '기존의 정형화된 풀이법이나 해석에서 벗어나 창의적인 방식으로 학업적 문제를 해결했던 경험이 있나요?',
    '실험이나 실습 과정에서 예상치 못한 변수로 인해 오차가 발생했을 때, 이를 학술적으로 검증하고 보완했던 과정을 설명해 주세요.',
    '학습한 원리를 일상생활 속 현상이나 사회적 문제에 적용해 보고자 시도했던 탐구 활동이 있다면 소개해 주세요.',
    '학업에 몰입하여 시간 가는 줄 모르고 탐구에 빠져들었던 경험과 그를 통해 얻은 지적 희열에 대해 말씀해 주세요.',
    '자신의 학업적 강점과 보완해야 할 약점은 무엇이라고 생각하며, 이를 어떻게 관리하고 발전시켜 왔나요?',
    '학습 내용을 장기 기억으로 전환하거나 깊이 있게 내면화하기 위해 활용했던 본인만의 복습 또는 정리 방식은 무엇인가요?',
    '교과서나 강의에서 배운 이론이 현실 세계에서 실제로 어떻게 작동하는지 호기심을 갖고 추적해 본 사례가 있나요?',
    '자신의 학업 역량을 스스로 평가해 보았을 때, 가장 자신 있는 역량과 앞으로 더 보완하고 싶은 역량은 무엇인가요?',
    '학업 수행 과정에서 예상했던 결론과 전혀 다른 결과가 나왔을 때, 원인을 분석하고 방향을 재설정했던 경험이 있나요?',
    '어떤 학문적 주제에 대해 깊이 파고들면서 스스로 질문을 만들고 그 답을 찾아갔던 자기주도적 학습 과정을 설명해 주세요.',
    '자신이 속한 전공 관련 교과에서 가장 기본적이면서도 중요하다고 생각하는 학문적 원리는 무엇인가요?',
    '수행평가나 과제 연구를 진행하면서 자료의 신뢰성과 타당성을 검증하기 위해 기울인 노력은 무엇이었나요?',
    '새로운 개념이나 학술 용어를 접했을 때 이를 직관적으로 이해하기 위해 어떤 노력을 기울였는지 말씀해 주세요.',
    '다양한 관점이 존재하는 학문적 쟁점에 대해 양측의 논거를 균형 있게 검토해 본 경험이 있나요?',
    '학습 과정에서 겪었던 가장 큰 지적 도전은 무엇이었으며, 이를 통해 어떻게 한 단계 성장할 수 있었나요?'
  ],
  career: [
    '자신의 진로 목표를 구체화하는 데 가장 큰 영향을 미친 고교 생활 속 경험이나 배움의 순간은 무엇이었나요?',
    '대학 입학 후 지원 분야의 전공 교육과정에서 특별히 깊이 있게 탐구해 보고 싶은 세부 학문 분야나 주제가 있나요?',
    '전공 적합성을 높이기 위해 교과 수업 및 학교 활동 속에서 주도적으로 노력했던 대표적인 활동을 소개해 주세요.',
    '해당 전공 분야의 전문가나 연구자로서 향후 사회에 기여하고 싶은 장기적인 포부와 목표는 무엇인가요?',
    '자신의 진로와 관련된 사회적 이슈나 최신 학문 트렌드 중 가장 주목하고 있는 주제와 본인의 생각을 말씀해 주세요.',
    '진로를 고민하는 과정에서 마주했던 불확실성이나 고민을 어떻게 극복하고 확신을 갖게 되었는지 설명해 주세요.',
    '관심 전공 분야에서 요구하는 핵심 역량이 무엇이라고 생각하며, 이를 기르기 위해 어떤 노력을 기울였나요?',
    '전공과 관련된 독서나 강연, 미디어 콘텐츠를 접하며 새로운 통찰을 얻었던 경험이 있다면 소개해 주세요.',
    '자신의 지원 전공이 미래 사회에서 어떤 가치와 역할을 지닐 것으로 보며, 본인은 어떤 역할을 담당하고 싶나요?',
    '전공 탐색 과정에서 본인의 흥미와 적성이 어떻게 일치하는지 확인했던 대표적인 탐구 사례를 말씀해 주세요.',
    '전공 분야에 진출하기 위해 대학 진학 후 학업 외적으로도 도전해 보고 싶은 대외활동이나 프로젝트가 있나요?',
    '자신이 롤모델로 삼고 있는 전공 분야의 인물이나 연구자가 있다면, 그 인물에게서 배우고 싶은 점은 무엇인가요?',
    '고교 시절 수행했던 여러 활동 중 자신의 진로 선택에 결정적인 이정표가 되어준 한 가지 경험을 꼽아주세요.',
    '지원 학과에서 다루는 학문이 본인의 인생관이나 가치관에 어떤 영향을 미칠 것이라 기대하나요?',
    '대학 졸업 후 첫 5년 동안 이루고 싶은 단기적 전문성 개발 목표와 이를 위한 실행 계획은 무엇인가요?',
    '전공 학습을 지속하는 과정에서 마주할 수 있는 어려움을 극복할 수 있는 본인만의 끈기와 원동력은 무엇인가요?',
    '지원 분야에서 일하게 되었을 때 지켜야 할 가장 중요한 직업 윤리나 사회적 책임은 무엇이라고 생각하나요?',
    '자신의 진로 분야가 직면하고 있는 가장 시급한 과제나 현안은 무엇이며, 이에 대해 어떤 생각을 갖고 있나요?',
    '자신이 꿈꾸는 진로를 위해 필요한 자질 중 현재 본인이 가장 잘 갖추고 있는 강점은 무엇인가요?',
    '진로와 관련된 관심 분야를 탐색하면서 새롭게 알게 된 사실 중 가장 흥미로웠던 점은 무엇이었나요?',
    '대학에서 전공 학업 외에 타 학과와의 융합이나 다학제적 연구를 시도해 보고 싶은 주제가 있나요?',
    '지원 전공의 발전이 일반 대중의 삶의 질 향상에 어떤 긍정적인 영향을 미칠 수 있다고 보나요?',
    '자신의 진로 희망이 고교 3년 동안 어떻게 변화하거나 구체화되었는지 그 흐름을 설명해 주세요.',
    '진로와 관련하여 롤모델로 삼고 있는 인물이나 서적을 통해 배운 가장 중요한 교훈은 무엇인가요?',
    '대학 진학 후 전공 역량을 키우기 위해 반드시 이수하고 싶은 교과목이나 참여하고 싶은 실험·실습은 무엇인가요?',
    '자신의 지원 전공을 통해 20~30년 후 우리 사회에 남기고 싶은 자신만의 발자취는 무엇인가요?'
  ],
  community: [
    '고등학교 생활 중 공동의 목표를 달성하기 위해 친구들과 협력하며 가장 크게 배운 점은 무엇인가요?',
    '모둠이나 동아리 활동 중 의견 차이나 갈등이 생겼을 때, 이를 원만하게 조율했던 구체적인 경험을 말씀해 주세요.',
    '자신의 이익보다 학급이나 동료를 위해 솔선수범하거나 배려했던 대표적인 사례를 설명해 주세요.',
    '고교 시절 지키기 어려운 규칙이나 원칙을 끝까지 준수했던 경험이 있다면 구체적으로 말씀해 주세요.',
    '타인과 소통할 때 본인이 가장 중요하게 생각하는 가치나 태도는 무엇이며, 이를 실천한 경험이 있나요?',
    '새로운 환경이나 낯선 팀원들과 함께 프로젝트를 시작할 때 구성원 간의 유대감을 형성하는 본인만의 방법은 무엇인가요?',
    '주변의 도움을 받아 어려움을 극복했던 경험이 있다면, 그 과정에서 느낀 고마움과 이를 다시 나눔으로 연결한 사례가 있나요?',
    '자신이 리더가 아니었음에도 팀의 목표 달성을 위해 묵묵히 기여했던 경험이 있다면 말씀해 주세요.',
    '친구들의 반대나 무관심 속에서도 공동체를 위해 꼭 필요하다고 생각하여 추진했던 일이 있나요?',
    '활동을 진행하면서 팀원 간에 감정적인 어려움이 발생했을 때 분위기를 전환하기 위해 어떤 노력을 했나요?',
    '다양한 배경이나 성향을 가진 동료들과 협업할 때 생기는 장단점과 이를 대하는 태도는 무엇인가요?',
    '학교 생활 중 가장 기억에 남는 봉사활동이나 나눔의 경험과 그를 통해 얻은 가치관의 변화는 무엇인가요?',
    '동료의 장점을 발견하고 이를 칭찬하거나 격려하여 팀의 시너지를 이끌어낸 경험이 있나요?',
    '갈등 상황에서 자신의 의견을 고집하기보다 상대방의 입장을 먼저 수용하고 양보했던 사례가 있나요?',
    '공동체 내에서 소외되거나 적응에 어려움을 겪는 동료를 돕기 위해 실천한 노력이 있다면 설명해 주세요.',
    '팀 활동 중 무임승차(프리라이더)나 불성실한 태도를 보이는 팀원을 만났을 때 어떻게 대처했나요?',
    '서로 다른 의견을 가진 친구들을 설득하거나 합의점을 도출하기 위해 발휘했던 본인만의 소통 방식은 무엇인가요?',
    '자신이 주도하지 않더라도 타인의 훌륭한 아이디어를 지지하고 팀의 성과로 연결되도록 도왔던 경험이 있나요?',
    '학급이나 동아리 내에서 규칙이나 약속이 잘 지켜지지 않았을 때 이를 개선하기 위해 제안했던 방법은 무엇인가요?',
    '어려움에 처한 친구에게 실질적인 도움을 주면서 배려와 연대의 가치를 깊이 깨달았던 사례가 있나요?',
    '단체 활동 중 예상치 못한 돌발 상황이 발생했을 때 침착하게 대처하여 팀을 안정시켰던 경험을 소개해 주세요.',
    '공동체의 발전이나 분위기 쇄신을 위해 자발적으로 아이디어를 내고 이를 행동으로 옮긴 경험이 있나요?',
    '모둠 과제에서 각자의 장점과 특기를 살려 역할을 효과적으로 분담하고 시너지를 낸 사례를 말씀해 주세요.',
    '친구들과의 협업 과정에서 피드백을 주고받을 때 상처를 주지 않고 건설적인 소통을 이끌어낸 방법은 무엇인가요?',
    '봉사나 나눔 활동을 통해 스스로의 가치관이나 타인을 대하는 태도에 긍정적인 변화가 일어난 경험이 있나요?',
    '공동체의 이익과 개인의 편의가 충돌했을 때, 공동체를 우선시하며 성숙한 시민 의식을 발휘한 사례를 설명해 주세요.'
  ],
  university: [
    '수많은 대학 중 특별히 우리 대학의 본 학과에 지원하게 된 가장 결정적인 동기와 계기는 무엇인가요?',
    '우리 대학의 인재상이나 교육 이념 중 본인의 가치관과 가장 잘 부합한다고 생각하는 부분은 무엇인가요?',
    '대학 입학 후 학과 동기나 선후배들과 함께 시도해 보고 싶은 공동 학업 또는 연구 프로젝트가 있나요?',
    '우리 대학에서 수학하기 위해 고등학교 시절부터 준비해 온 본인만의 특별한 강점은 무엇인가요?',
    '대학 생활 중 전공 공부 외에 꼭 경험해 보고 싶은 대학만의 특별한 프로그램이나 교내 활동이 있나요?',
    '우리 학과에 입학한 후 10년 뒤 어떤 전문가로 성장해 대학의 명예를 빛내고 싶은지 포부를 말씀해 주세요.'
  ]
};

export function generateStandardRuleQuestions(
  profile: Pick<StudentProfile, 'name' | 'targetUniversity' | 'targetMajor' | 'interviewType'> & { customKeywords?: string[] },
  records: StudentRecordItem[],
  pastData?: PastExamData | null
): QuestionItem[] {
  const U = profile.targetUniversity || '지원 대학';
  const M = profile.targetMajor || '지원 학과';
  const hasUniv = Boolean(profile.targetUniversity && !isUnsetUniv(profile.targetUniversity));
  const hasMajor = Boolean(profile.targetMajor && !isUnsetMajor(profile.targetMajor));
  const pool = buildRuleCandidatePool(records, M, U, profile.customKeywords, pastData);

  const sections = [
    { name: '학업역량', code: 'A', want: 20 },
    { name: '진로역량', code: 'C', want: 20 },
    { name: '공동체역량', code: 'P', want: 20 }
  ];

  const globalTplCnt = new Map<string, number>();
  const globalRecCnt = new Map<string, number>();
  let lastTakenRecKey = '';
  const used = new Set<CandidateQuestion>();
  const usedText = new Set<string>();

  const rng = mulberry(12345);

  const byBucket = (code: string) => {
    return pool
      .filter((q) => q.b === code || (code === 'P' && (q.b === 'P' || q.b === 'M' || q.b === 'T' || q.b === 'D')) || (code === 'C' && (q.b === 'C' || q.b === 'D')))
      .map((q) => {
        const tplUsed = globalTplCnt.get(q.tplId || q.type || '') || 0;
        const recKey = q.rtext || (q.sref && q.sref.text) || q.k || '';
        const recUsed = globalRecCnt.get(recKey) || 0;
        let extraScore = 0;
        if (code === 'C' && hasMajor) {
          if (q.sref && q.sref.rel > 0) extraScore += 1.5;
          if (q.sref && SIMPLE_PRACTICAL_ACTIVITY_RE.test(q.sref.text)) extraScore -= 2.0;
          if (q.sref && MANDATORY_EDU_RE.test(q.sref.text)) extraScore -= 5.0;
        }
        return {
          q,
          sc: q.p + extraScore - tplUsed * 1.8 - recUsed * 2.5 + (q.b === code ? 0.35 : 0) + (rng() - 0.5) * 0.4
        };
      })
      .sort((x, y) => y.sc - x.sc)
      .map((x) => x.q);
  };

  const finalQuestions: QuestionItem[] = [];

  sections.forEach((sec, sIdx) => {
    const list: CandidateQuestion[] = [];
    const secTplCnt = new Map<string, number>();
    const secTypeCnt = new Map<string, number>();
    const n = sec.want;

    const take = (q?: CandidateQuestion, allowRelaxed: boolean = false): boolean => {
      if (!q || used.has(q) || usedText.has(q.text.trim())) return false;

      // 기출 문항은 영역당 최대 1~2문항(전체 최대 5~6문항) 강제 제한. 대학 또는 학과 미입력 시 전체 최대 3문항. 둘 다 없으면 0건.
      if (q.catGroup === 'past') {
        if (!hasUniv && !hasMajor) return false;
        const pastInSec = list.filter((x) => x.catGroup === 'past').length;
        const totalPast = Array.from(used).filter((x) => x.catGroup === 'past').length;
        const maxPastSec = hasUniv && hasMajor ? 2 : 1;
        const maxPastTotal = hasUniv && hasMajor ? 6 : 3;
        if (!hasMajor && q.b !== 'P') return false;
        if (pastInSec >= maxPastSec || totalPast >= maxPastTotal) return false;
      }

      const recKey = q.rtext || (q.sref && q.sref.text) || q.k || '';
      const rCnt = globalRecCnt.get(recKey) || 0;
      // 동일 학생부 문장 전체 최대 2회 엄격 제한 (allowRelaxed 포함)
      if ((q.catGroup === 'record' || q.catGroup === 'fusion') && recKey && rCnt >= 2) return false;

      // 직전 문항과 동일한 생기부 문장 연속 인용 방지
      if (recKey && lastTakenRecKey === recKey) return false;

      const tpl = q.tplId || q.type || '';
      if (tpl) {
        const gCount = globalTplCnt.get(tpl) || 0;
        const maxG = tpl === 'exp_major_conn' ? 2 : (allowRelaxed ? 5 : 2);
        if (gCount >= maxG) return false;
        const sCount = secTplCnt.get(tpl) || 0;
        const maxS = tpl === 'exp_major_conn' ? 1 : (allowRelaxed ? 3 : 1);
        if (sCount >= maxS) return false;
      }

      // concept 그룹 한 평가영역 내 최대 2개 제한
      const isConcept = q.typeGroup === 'concept' || /^concept_/.test(tpl) || q.type === '개념원리' || q.type === '개념적용' || q.type === '개념한계' || q.type === '개념비교';
      if (isConcept) {
        const conceptCount = list.filter((x) => x.typeGroup === 'concept' || /^concept_/.test(x.tplId || '') || x.type === '개념원리' || x.type === '개념적용' || x.type === '개념한계' || x.type === '개념비교').length;
        if (!allowRelaxed && conceptCount >= 2) return false;
      }

      const qType = q.type || '';
      if (!allowRelaxed && qType) {
        const typeCount = secTypeCnt.get(qType) || 0;
        if (typeCount >= 2) return false;
      }

      used.add(q);
      usedText.add(q.text.trim());
      if (recKey) {
        globalRecCnt.set(recKey, rCnt + 1);
        lastTakenRecKey = recKey;
      }
      if (tpl) {
        globalTplCnt.set(tpl, (globalTplCnt.get(tpl) || 0) + 1);
        secTplCnt.set(tpl, (secTplCnt.get(tpl) || 0) + 1);
      }
      if (qType) {
        secTypeCnt.set(qType, (secTypeCnt.get(qType) || 0) + 1);
      }
      list.push(q);
      return true;
    };

    const cand = byBucket(sec.code);

    // 1. Multi-hop questions in Academic or Career section
    const mhopCand = cand.filter((q) => q.type === '종단연계');
    for (const q of mhopCand) {
      if (list.filter((x) => x.type === '종단연계').length >= 2 || list.length >= n) break;
      take(q);
    }

    const recCand = cand.filter((q) => q.catGroup === 'record' && q.type !== '종단연계');
    const fusCand = cand.filter((q) => q.catGroup === 'fusion');
    const pastCand = cand.filter((q) => q.catGroup === 'past');

    const hasTarget = Boolean(
      (profile.targetUniversity && !isUnsetUniv(profile.targetUniversity)) ||
      (profile.targetMajor && !isUnsetMajor(profile.targetMajor))
    );

    const wantPast = hasTarget ? Math.min(3, Math.round(n * 0.15)) : 0;
    const wantRec = hasTarget ? Math.max(1, Math.round(n * 0.60)) : Math.round(n * 0.70);
    const wantFus = n - wantRec - wantPast;

    // Pass 1: Record candidates up to wantRec
    for (const q of recCand) {
      if (list.filter((x) => x.catGroup === 'record').length >= wantRec || list.length >= n) break;
      take(q);
    }

    // Pass 2: Fusion candidates up to wantFus
    for (const q of fusCand) {
      if (list.filter((x) => x.catGroup === 'fusion').length >= wantFus || list.length >= n) break;
      take(q);
    }

    // Pass 3: Past candidates up to wantPast (목표 대학/학과 입력 시에만)
    if (hasTarget && wantPast > 0) {
      for (const q of pastCand) {
        if (list.filter((x) => x.catGroup === 'past').length >= wantPast || list.length >= n) break;
        take(q);
      }
    }

    // Fallback 1: Fill remaining with relaxed constraints
    if (list.length < n) {
      for (const q of fusCand) {
        if (list.length >= n) break;
        take(q, true);
      }
      if (hasTarget) {
        for (const q of pastCand) {
          if (list.length >= n) break;
          take(q, true);
        }
      }
      for (const q of recCand) {
        if (list.length >= n) break;
        take(q, true);
      }
    }

    // Fallback 2: Wider candidate pool within competency bucket
    if (list.length < n) {
      for (const q of cand) {
        if (list.length >= n) break;
        if (!hasTarget && q.catGroup === 'past') continue;
        take(q, true);
      }
    }

    // Fallback 4: Standard universal questions if pool is exhausted
    if (list.length < n && sec.code === 'A') {
      const standardAcademicQs = UNIVERSAL_FALLBACK_QUESTIONS.academic;
      for (let ai = 0; ai < standardAcademicQs.length && list.length < n; ai++) {
        const text = standardAcademicQs[ai];
        if (usedText.has(text.trim())) continue;
        take(
          Q({
            b: 'A',
            k: `acad_std_${ai}`,
            p: 1.5,
            type: '학업역량',
            tplId: `acad_std_${ai}`,
            src: '학업역량',
            srcBadge: '[학업기초 소양]',
            catGroup: 'common',
            text,
            ans: '자신의 실제 고교 학습 경험과 지적 호기심 극복 과정을 구체적 사례 중심으로 답변하세요.',
            ansLabel: '모범 답변 가이드',
            tip: '자기주도적 학습 능력과 학문적 집요함을 평가하는 표준 문항입니다.',
            tails: ['그 탐구를 통해 얻은 학문적 성취가 향후 대학 학업에 어떤 밑거름이 될까요?']
          }),
          true
        );
      }
    }

    if (list.length < n && sec.code === 'C') {
      const standardCareerQs = UNIVERSAL_FALLBACK_QUESTIONS.career;
      for (let ci = 0; ci < standardCareerQs.length && list.length < n; ci++) {
        const text = standardCareerQs[ci];
        if (usedText.has(text.trim())) continue;
        take(
          Q({
            b: 'C',
            k: `career_std_${ci}`,
            p: 1.5,
            type: '진로역량',
            tplId: `career_std_${ci}`,
            src: '진로역량',
            srcBadge: '[전공기초 소양]',
            catGroup: 'common',
            text,
            ans: '지원 분야에 대한 진정성 있는 관심과 구체적인 학업 계획을 논리적으로 설명하세요.',
            ansLabel: '모범 답변 가이드',
            tip: '전공에 대한 탐색 노력과 학문적 비전을 종합 평가하는 표준 문항입니다.',
            tails: ['그 비전을 실현하기 위해 입학 전까지 준비하고자 하는 학업 계획이 있나요?']
          }),
          true
        );
      }
    }

    // Fallback 4: Standard personality/community questions if pool is exhausted for P
    if (list.length < n && sec.code === 'P') {
      const standardCommunityQs = UNIVERSAL_FALLBACK_QUESTIONS.community;
      for (let ci = 0; ci < standardCommunityQs.length && list.length < n; ci++) {
        const text = standardCommunityQs[ci];
        if (usedText.has(text.trim())) continue;
        take(
          Q({
            b: 'P',
            k: `comm_std_${ci}`,
            p: 1.5,
            type: '공동체인성',
            tplId: `comm_std_${ci}`,
            src: '공동체역량',
            srcBadge: '[공동체·인성]',
            catGroup: 'common',
            text,
            ans: '자신의 경험을 바탕으로 경청, 배려, 책임감, 소통의 구체적 사례를 들어 두괄식으로 답변하세요.',
            ansLabel: '모범 답변 가이드',
            tip: '대학 인재상에서 중시하는 협업 능력, 배려심, 도덕성, 갈등 조율 역량을 평가하는 문항입니다.',
            tails: ['그 경험을 통해 형성된 가치관이 대학 입학 후 단체 생활에 어떻게 발휘될 것이라 보나요?']
          }),
          true
        );
      }
    }

    // QuestionItem으로 매핑
    const compType: CompetencyType = sec.code === 'A' ? 'academic' : sec.code === 'C' ? 'career' : 'community';
    list.forEach((q, qIdx) => {
      finalQuestions.push({
        id: `q-rule-${sec.code.toLowerCase()}-${qIdx + 1}-${Date.now()}-${sIdx}`,
        competency: compType,
        type: q.tplId === 'pres' || q.type === '오차분석' || q.type === '개념한계' ? 'pressure' : (q.type === '종단연계' || q.catGroup === 'fusion' ? 'deep' : 'record'),
        grade: q.sref?.grade ? `${q.sref.grade}학년` : undefined,
        subject: cleanLabelText(q.sref?.subj || q.sref?.area) || undefined,
        highlightText: stripHtmlTags(q.rtext || ''),
        question: stripHtmlTags(q.text || ''),
        intent: q.tip || `${sec.name} 검증 및 탐구 깊이 평가`,
        points: q.ans ? [q.ans] : (q.points && q.points.length ? q.points : ['핵심 개념과 자신의 탐구 역할을 두괄식으로 설명하세요.']),
        followUps: q.tails && q.tails.length ? q.tails : ['이 활동을 진행하면서 가장 크게 성장했다고 느낀 점은 무엇인가요?'],
        defense: q.tplId === 'pres' || q.type === '오차분석' || q.type === '개념한계' ? '결과의 한계나 예상 밖 상황을 솔직히 인정하고, 이를 보완하기 위해 시도한 논리적 해결책을 답변하세요.' : undefined,
        srcBadge: q.srcBadge,
        catGroup: q.catGroup,
        tplId: q.tplId,
        ansLabel: q.ansLabel || undefined,
        tip: q.tip || undefined,
        completed: false,
        starred: qIdx === 0 || q.type === '종단연계' // 각 영역 첫 문항 및 종단연계 문항 기본 핵심 체크
      });
    });
  });

  return finalQuestions;
}

// ============================================================
// 10. 추가 문항 생성 및 특정 과목 3문항 생성 (UI 호환 함수)
// ============================================================
export function generateAdditionalRuleQuestions(
  profile: Pick<StudentProfile, 'name' | 'targetUniversity' | 'targetMajor' | 'interviewType'> & { customKeywords?: string[] },
  records: StudentRecordItem[],
  existingQuestions: QuestionItem[],
  count: number = 10,
  targetCompetency?: CompetencyType | 'all'
): QuestionItem[] {
  const pool = buildRuleCandidatePool(
    records,
    profile.targetMajor || '지원 학과',
    profile.targetUniversity || '지원 대학',
    profile.customKeywords
  );

  const normKey = (str: string) => stripHtmlTags(str).replace(/[‘'“"”’]/g, '').replace(/\s+/g, ' ').trim();
  const existingTexts = new Set<string>();
  existingQuestions.forEach((q) => {
    existingTexts.add(normKey(q.question));
    existingTexts.add(q.question.trim());
  });
  const globalTplCnt = new Map<string, number>();
  const globalRecCnt = new Map<string, number>();

  existingQuestions.forEach((q) => {
    if (q.tplId) globalTplCnt.set(q.tplId, (globalTplCnt.get(q.tplId) || 0) + 1);
    const rKey = q.highlightText?.trim() || '';
    if (rKey) globalRecCnt.set(rKey, (globalRecCnt.get(rKey) || 0) + 1);
  });

  // 후보 풀을 미사용 생기부 문장 우선(globalRecCnt 작은 순) + 높은 점수 순으로 정렬
  const sortedPool = [...pool].sort((a, b) => {
    const aRecKey = a.rtext || (a.sref && a.sref.text) || a.k || '';
    const bRecKey = b.rtext || (b.sref && b.sref.text) || b.k || '';
    const aUsed = globalRecCnt.get(aRecKey) || 0;
    const bUsed = globalRecCnt.get(bRecKey) || 0;
    if (aUsed !== bUsed) return aUsed - bUsed;
    return b.p - a.p;
  });

  const additions: QuestionItem[] = [];
  let lastTakenRecKey = '';

  for (const cand of sortedPool) {
    if (additions.length >= count) break;
    const candComp: CompetencyType = cand.b === 'A' ? 'academic' : cand.b === 'C' ? 'career' : 'community';
    if (targetCompetency && targetCompetency !== 'all' && candComp !== targetCompetency) {
      continue;
    }
    const qTextTrimmed = cand.text.trim();
    const qNorm = normKey(cand.text);
    if (existingTexts.has(qTextTrimmed) || existingTexts.has(qNorm)) continue;

    // 추가 생성 질문은 기출 DB 출제 완전 0건 (100% 내 학생부 + 룰 템플릿으로만 생성)
    if (
      cand.catGroup === 'past' ||
      cand.src === '실제기출' ||
      cand.src === '합격선배 복기' ||
      cand.srcBadge?.includes('기출') ||
      cand.srcBadge?.includes('복기') ||
      cand.tplId?.startsWith('qb_') ||
      cand.tplId?.startsWith('case_')
    ) {
      continue;
    }

    const tpl = cand.tplId || cand.type || '';
    if (tpl) {
      const tCnt = globalTplCnt.get(tpl) || 0;
      // exp_major_conn("기초 체력이 될 것이라 보나요?") 누적 최대 3회 이하
      if (tpl === 'exp_major_conn' && tCnt >= 3) continue;
      // 일반 템플릿도 누적 최대 6회 이하
      if (tCnt >= 6) continue;
    }

    const recKey = cand.rtext || (cand.sref && cand.sref.text) || cand.k || '';
    if (recKey) {
      const rCnt = globalRecCnt.get(recKey) || 0;
      // 전 문서 통합 동일 문장 최대 2회 엄격 제한
      if (rCnt >= 2) continue;
      // 연속 출제 차단
      if (lastTakenRecKey === recKey) continue;
      globalRecCnt.set(recKey, rCnt + 1);
      lastTakenRecKey = recKey;
    }

    if (tpl) {
      globalTplCnt.set(tpl, (globalTplCnt.get(tpl) || 0) + 1);
    }

    existingTexts.add(qTextTrimmed);
    existingTexts.add(qNorm);
    additions.push({
      id: `q-add-${cand.b.toLowerCase()}-${additions.length + 1}-${Date.now()}`,
      competency: candComp,
      type: cand.tplId === 'pres' ? 'pressure' : (cand.type === '종단연계' || cand.catGroup === 'fusion' ? 'deep' : 'record'),
      grade: cand.sref?.grade ? `${cand.sref.grade}학년` : undefined,
      subject: cleanLabelText(cand.sref?.subj || cand.sref?.area) || undefined,
      highlightText: stripHtmlTags(cand.rtext || ''),
      question: stripHtmlTags(cand.text || ''),
      intent: cand.tip || `${candComp} 추가 검증 문항`,
      points: cand.ans ? [cand.ans] : (cand.points || ['핵심 키워드를 중심으로 답변하세요.']),
      followUps: cand.tails || [],
      defense: cand.tplId === 'pres' ? '자신의 역할과 문제 해결 과정을 수치와 함께 답변하세요.' : undefined,
      srcBadge: cand.srcBadge,
      catGroup: cand.catGroup,
      tplId: cand.tplId,
      ansLabel: cand.ansLabel || undefined,
      tip: cand.tip || undefined,
      completed: false,
      starred: false
    });
  }

  // 문항 풀 고갈 시 각 역량별 미사용 순수 보편 질문으로 중복 없이 보충
  if (additions.length < count) {
    const universalFallbacks = UNIVERSAL_FALLBACK_QUESTIONS;

    const compOrder: CompetencyType[] = targetCompetency && targetCompetency !== 'all' ? [targetCompetency] : ['academic', 'career', 'community'];
    
    // 남은 미사용 보편 질문만 수집 (이미 출제된 질문은 단 1건도 포함하지 않음)
    const availableFallbacks: Array<{ comp: CompetencyType; text: string }> = [];
    const maxLen = Math.max(...compOrder.map((c) => (universalFallbacks[c] || []).length));
    for (let i = 0; i < maxLen; i++) {
      for (const comp of compOrder) {
        const uList = universalFallbacks[comp] || [];
        if (i < uList.length) {
          const text = uList[i];
          const nText = normKey(text);
          if (!existingTexts.has(nText) && !existingTexts.has(text.trim())) {
            availableFallbacks.push({ comp, text });
          }
        }
      }
    }

    for (const item of availableFallbacks) {
      if (additions.length >= count) break;
      const nText = normKey(item.text);
      if (existingTexts.has(nText) || existingTexts.has(item.text.trim())) continue;
      existingTexts.add(nText);
      existingTexts.add(item.text.trim());
      additions.push({
        id: `q-add-fallback-${additions.length + 1}-${Date.now()}`,
        competency: item.comp,
        type: 'record',
        question: item.text,
        intent: item.comp === 'community'
          ? '공동체 내 협업·소통·배려·책임감을 평가하는 보편 심층 문항입니다.'
          : item.comp === 'academic'
          ? '학업적 지적 호기심과 자기주도적 탐구 역량을 평가하는 보편 심층 문항입니다.'
          : item.comp === 'career'
          ? '전공에 대한 관심과 진로 개척 의지를 평가하는 보편 심층 문항입니다.'
          : '대학 및 지원 전공에 대한 지원 동기와 포부를 평가하는 보편 심층 문항입니다.',
        points: ['자신의 경험을 바탕으로 진솔하고 구체적인 사례를 들어 답변하세요.'],
        followUps: ['이 경험을 통해 스스로 배운 점은 무엇인가요?'],
        srcBadge: '[보편 심층소양]',
        catGroup: 'common',
        completed: false,
        starred: false
      });
    }
  }

  return additions;
}

export function generateSubject3Questions(
  profile: Pick<StudentProfile, 'name' | 'targetUniversity' | 'targetMajor' | 'interviewType'> & { customKeywords?: string[] },
  records: StudentRecordItem[],
  existingQuestions: QuestionItem[]
): QuestionItem[] {
  if (records.length === 0) return [];
  const primaryRecord = records[0];
  const subjectName = cleanLabelText(primaryRecord.subject) || '교과';
  const gradeName = primaryRecord.grade || '공통';
  const majorName = profile.targetMajor?.trim() || '지원 학과';

  const pool = buildRuleCandidatePool(
    records,
    majorName,
    profile.targetUniversity || '지원 대학',
    profile.customKeywords
  );

  const existingTexts = new Set(existingQuestions.map((q) => q.question.trim()));
  const picked: QuestionItem[] = [];

  const recordCand = pool.find((q) => q.catGroup === 'record' && q.type !== '종단연계' && !existingTexts.has(q.text.trim()));
  const deepCand = pool.find((q) => (q.type === '종단연계' || q.catGroup === 'fusion' || q.type === '개념적용') && !existingTexts.has(q.text.trim()) && q !== recordCand);
  const pressureCand = pool.find((q) => (q.type === '개념한계' || q.type === '오차분석' || q.tplId === 'pres') && !existingTexts.has(q.text.trim()) && q !== recordCand && q !== deepCand);

  const fallbackCand = pool.filter((q) => !existingTexts.has(q.text.trim()));

  const targets = [
    { cand: recordCand || fallbackCand[0], label: '기록 진위 확인', type: 'record' as const },
    { cand: deepCand || fallbackCand[1], label: '심화 연계', type: 'deep' as const },
    { cand: pressureCand || fallbackCand[2], label: '약점 방어·압박', type: 'pressure' as const }
  ];

  targets.forEach((t, idx) => {
    const c = t.cand;
    if (c) {
      existingTexts.add(c.text.trim());
      picked.push({
        id: `q-subj-${idx + 1}-${Date.now()}`,
        competency: c.b === 'A' ? 'academic' : c.b === 'C' ? 'career' : 'community',
        type: t.type,
        grade: gradeName,
        subject: subjectName,
        highlightText: stripHtmlTags(c.rtext || ''),
        question: stripHtmlTags(c.text || ''),
        intent: c.tip || `${subjectName} 과목 ${t.label} 평가`,
        points: c.ans ? [c.ans] : (c.points || ['핵심 키워드를 중심으로 답변하세요.']),
        followUps: c.tails || [],
        defense: t.type === 'pressure' ? '활동 과정의 제약 조건과 이를 극복하기 위한 노력을 솔직하고 논리적으로 답변하세요.' : undefined,
        srcBadge: c.srcBadge || `[${subjectName} 맞춤]`,
        catGroup: c.catGroup,
        tplId: c.tplId,
        ansLabel: c.ansLabel || undefined,
        tip: c.tip || undefined,
        completed: false,
        starred: true
      });
    }
  });

  return picked;
}
