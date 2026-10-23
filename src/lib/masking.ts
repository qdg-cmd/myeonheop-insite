/**
 * 학생부 개인정보 비식별화(블라인드 마스킹) 유틸리티
 */
export function maskPersonalInfo(
  rawText: string,
  targetStudentName?: string,
  targetSchoolName?: string
): { maskedText: string; detectedNames: string[]; detectedSchools: string[] } {
  let maskedText = rawText;
  const detectedNames = new Set<string>();
  const detectedSchools = new Set<string>();

  // 1. 지정된 학생 이름 마스킹
  if (targetStudentName && targetStudentName.trim() && targetStudentName !== '학생A') {
    const trimmed = targetStudentName.trim();
    detectedNames.add(trimmed);
    const regex = new RegExp(trimmed, 'g');
    maskedText = maskedText.replace(regex, '[학생A]');
  }

  // 2. 지정된 학교명 마스킹
  if (targetSchoolName && targetSchoolName.trim()) {
    const trimmed = targetSchoolName.trim();
    detectedSchools.add(trimmed);
    const regex = new RegExp(trimmed, 'g');
    maskedText = maskedText.replace(regex, '[○○고등학교]');
  }

  // 3. 학교명 패턴 자동 검출 (예: 충무고등학교, 서울여자고등학교, 대전예술고 등)
  const schoolRegex = /([가-힣]{2,8}(?:고등학교|여자고등학교|여고|외국어고등학교|외고|과학고등학교|과고|마이스터고|체육고|예술고|정보산업고))/g;
  let sMatch;
  while ((sMatch = schoolRegex.exec(rawText)) !== null) {
    detectedSchools.add(sMatch[1]);
  }
  for (const s of detectedSchools) {
    maskedText = maskedText.replaceAll(s, '[○○고등학교]');
  }

  // 4. 주민등록번호 / 생년월일 패턴
  maskedText = maskedText.replace(/\b\d{6}-[1-4]\d{6}\b/g, '[주민번호 마스킹]');
  maskedText = maskedText.replace(/\b\d{4}\.(?:0[1-9]|1[0-2])\.(?:0[1-9]|[12]\d|3[01])\b/g, '[0000.00.00]');

  // 5. 전화번호 마스킹
  maskedText = maskedText.replace(/\b01[016789]-\d{3,4}-\d{4}\b/g, '[010-0000-0000]');

  return {
    maskedText,
    detectedNames: Array.from(detectedNames),
    detectedSchools: Array.from(detectedSchools),
  };
}
