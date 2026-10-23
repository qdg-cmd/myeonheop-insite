import { StudentProfile } from '../types';

// CRC-32 Lookup Table for standard ZIP archive
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(u: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < u.length; i++) {
    c = CRC_TABLE[(c ^ u[i]) & 255] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// Minimal Store-only (uncompressed) ZIP Builder for browser
function createZipBlob(files: Array<{ name: string; data: Uint8Array }>): Blob {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  const le = (num: number, byteCount: number): Uint8Array => {
    const a = new Uint8Array(byteCount);
    for (let i = 0; i < byteCount; i++) {
      a[i] = (num >>> (8 * i)) & 255;
    }
    return a;
  };

  for (const f of files) {
    const nameBytes = enc.encode(f.name);
    const dataBytes = f.data;
    const checksum = crc32(dataBytes);

    // Local file header
    const localHeader = [
      le(0x04034b50, 4), // Local file header signature
      le(20, 2),         // Version needed to extract
      le(0x0800, 2),     // General purpose bit flag (UTF-8 filename)
      le(0, 2),          // Compression method (0 = store)
      le(0, 2),          // File last mod time
      le(0x21, 2),       // File last mod date
      le(checksum, 4),   // CRC-32
      le(dataBytes.length, 4), // Compressed size
      le(dataBytes.length, 4), // Uncompressed size
      le(nameBytes.length, 2), // File name length
      le(0, 2),          // Extra field length
      nameBytes,
      dataBytes,
    ];

    // Central directory header
    const centralHeader = [
      le(0x02014b50, 4), // Central directory file header signature
      le(20, 2),         // Version made by
      le(20, 2),         // Version needed to extract
      le(0x0800, 2),     // General purpose bit flag (UTF-8)
      le(0, 2),          // Compression method
      le(0, 2),          // File last mod time
      le(0x21, 2),       // File last mod date
      le(checksum, 4),   // CRC-32
      le(dataBytes.length, 4), // Compressed size
      le(dataBytes.length, 4), // Uncompressed size
      le(nameBytes.length, 2), // File name length
      le(0, 2),          // Extra field length
      le(0, 2),          // File comment length
      le(0, 2),          // Disk number start
      le(0, 2),          // Internal file attributes
      le(0, 4),          // External file attributes
      le(offset, 4),     // Relative offset of local header
      nameBytes,
    ];

    localHeader.forEach((x) => {
      parts.push(x);
      offset += x.length;
    });
    central.push(...centralHeader);
  }

  const centralSize = central.reduce((acc, x) => acc + x.length, 0);

  // End of central directory record
  const endRecord = [
    le(0x06054b50, 4),       // End of central dir signature
    le(0, 2),                // Number of this disk
    le(0, 2),                // Disk where central directory starts
    le(files.length, 2),     // Number of central directory records on this disk
    le(files.length, 2),     // Total number of central directory records
    le(centralSize, 4),      // Size of central directory
    le(offset, 4),           // Offset of start of central directory
    le(0, 2),                // Comment length
  ];

  return new Blob([...parts, ...central, ...endRecord] as any, {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

const escapeXml = (s: string) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c] || c));

export interface DocxParagraph {
  text?: string;
  style?: 'Title' | 'Heading1' | 'Heading2' | 'Normal' | 'Subtitle';
  runs?: Array<{ t: string; b?: boolean; color?: string; sz?: number; italic?: boolean }>;
  spacingAfter?: number;
  indentLeft?: number;
  keepNext?: boolean;
}

function renderDocxParagraph(p: DocxParagraph): string {
  const pPrParts: string[] = [];
  if (p.style) pPrParts.push(`<w:pStyle w:val="${p.style}"/>`);
  pPrParts.push(`<w:spacing w:after="${p.spacingAfter ?? 120}" w:line="300" w:lineRule="auto"/>`);
  if (p.indentLeft) pPrParts.push(`<w:ind w:left="${p.indentLeft}"/>`);
  if (p.keepNext) pPrParts.push('<w:keepNext/>');

  const pPr = `<w:pPr>${pPrParts.join('')}</w:pPr>`;
  const runs = p.runs || [{ t: p.text || '', b: false }];

  const runXml = runs
    .map((r) => {
      const rPrParts: string[] = [];
      if (r.b) rPrParts.push('<w:b/>');
      if (r.italic) rPrParts.push('<w:i/>');
      if (r.color) rPrParts.push(`<w:color w:val="${r.color}"/>`);
      if (r.sz) rPrParts.push(`<w:sz w:val="${r.sz}"/><w:szCs w:val="${r.sz}"/>`);
      const rPr = rPrParts.length ? `<w:rPr>${rPrParts.join('')}</w:rPr>` : '';
      return `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(r.t)}</w:t></w:r>`;
    })
    .join('');

  return `<w:p>${pPr}${runXml}</w:p>`;
}

export function generateDocxBlob(profile: StudentProfile, starredOnly: boolean = false): Blob {
  const enc = new TextEncoder();
  const paras: DocxParagraph[] = [];

  const questions = starredOnly
    ? profile.questions.filter((q) => q && q.starred)
    : profile.questions;

  // 문서 제목
  paras.push({
    style: 'Title',
    runs: [
      {
        t: starredOnly
          ? '대입 심층 모의면접 예상 질문지 (★ 핵심 질문 엄선집)'
          : '대입 심층 모의면접 예상 질문지',
        b: true,
        sz: 36,
        color: '1E3A8A',
      },
    ],
    spacingAfter: 80,
  });

  paras.push({
    style: 'Subtitle',
    runs: [
      { t: `수험생: ${profile.name} | 지원 대학: ${profile.targetUniversity} | 지원 학과: ${profile.targetMajor} (${profile.interviewType})`, sz: 20, color: '4B5563' },
    ],
    spacingAfter: 200,
  });

  // 개요 안내문
  paras.push({
    style: 'Normal',
    runs: [
      {
        t: starredOnly
          ? `* 본 문서는 학생부 원문에서 선별된 중요 핵심 면접 문항 모음입니다. (선별 ${questions.length}문항)`
          : `* 본 문서는 학생부 원문의 핵심 탐구 문장을 분석하여 학업역량, 진로역량, 공동체역량에 맞추어 자동 생성된 실전 면접 워크시트입니다. (총 ${questions.length}문항)`,
        sz: 19,
        italic: true,
        color: '6B7280',
      },
    ],
    spacingAfter: 280,
  });

  // 질문별 출력
  questions.forEach((q, idx) => {
    const compLabel =
      q.competency === 'academic'
        ? '학업역량'
        : q.competency === 'career'
        ? '진로역량'
        : q.competency === 'community'
        ? '공동체역량'
        : '대학맞춤';

    const typeLabel =
      q.type === 'deep' ? '심화 연계' : q.type === 'pressure' ? '약점 방어·압박' : '기록 진위 확인';

    // 문항 머리말
    paras.push({
      style: 'Heading1',
      runs: [
        ...(q.starred ? [{ t: '★ [핵심] ', b: true, sz: 26, color: 'D97706' }] : []),
        { t: `문항 ${idx + 1}. `, b: true, sz: 26, color: '1E40AF' },
        { t: `[${q.grade ? `${q.grade} ` : ''}${q.subject || '공통'}] `, b: true, sz: 24, color: '374151' },
        { t: `${compLabel} · ${typeLabel}`, sz: 22, color: '4B5563' },
      ],
      keepNext: true,
      spacingAfter: 80,
    });

    // 질문 본문
    paras.push({
      style: 'Normal',
      runs: [
        { t: `Q. ${q.question}`, b: true, sz: 24, color: '111827' },
      ],
      keepNext: true,
      spacingAfter: 80,
    });

    // 생기부 근거 원문
    if (q.highlightText) {
      paras.push({
        style: 'Normal',
        runs: [
          { t: `[생기부 근거 원문] `, b: true, sz: 20, color: 'B45309' },
          { t: `"${q.highlightText}"`, italic: true, sz: 20, color: '92400E' },
        ],
        indentLeft: 240,
        spacingAfter: 80,
      });
    }

    // 평가 의도
    if (q.intent) {
      paras.push({
        style: 'Normal',
        runs: [
          { t: `■ 면접관 평가 의도: `, b: true, sz: 20, color: '1D4ED8' },
          { t: q.intent, sz: 20, color: '374151' },
        ],
        indentLeft: 240,
        spacingAfter: 60,
      });
    }

    // 답변 포인트
    if (q.points && q.points.length > 0) {
      paras.push({
        style: 'Normal',
        runs: [
          { t: `■ 필수 답변 키워드 & 포인트:`, b: true, sz: 20, color: '047857' },
        ],
        indentLeft: 240,
        spacingAfter: 40,
      });

      q.points.forEach((pt) => {
        paras.push({
          style: 'Normal',
          runs: [
            { t: `  • ${pt}`, sz: 19, color: '374151' },
          ],
          indentLeft: 400,
          spacingAfter: 30,
        });
      });
    }

    // 꼬리 질문 (전체 출력)
    if (q.followUps && q.followUps.length > 0) {
      paras.push({
        style: 'Normal',
        runs: [
          { t: `■ 예상 심층 꼬리 질문:`, b: true, sz: 20, color: '6D28D9' },
        ],
        indentLeft: 240,
        spacingAfter: 40,
      });

      q.followUps.forEach((fu, fIdx) => {
        paras.push({
          style: 'Normal',
          runs: [
            { t: `  ↳ 꼬리 #${fIdx + 1}: ${fu}`, sz: 19, color: '4B5563' },
          ],
          indentLeft: 400,
          spacingAfter: 30,
        });
      });
    }

    // 압박 방어 팁
    if (q.defense) {
      paras.push({
        style: 'Normal',
        runs: [
          { t: `■ 압박 방어 가이드: `, b: true, sz: 20, color: 'BE123C' },
          { t: q.defense, sz: 19, color: '9F1239' },
        ],
        indentLeft: 240,
        spacingAfter: 60,
      });
    }

    // 나의 답변 구상 및 메모
    paras.push({
      style: 'Normal',
      runs: [
        { t: `■ 나의 답변 구상 (메모): `, b: true, sz: 20, color: '4B5563' },
        { t: q.userNotes || '(작성된 메모가 없습니다. 여기에 자필로 답변 개요를 정리하세요.)', italic: !q.userNotes, sz: 19, color: q.userNotes ? '1F2937' : '9CA3AF' },
      ],
      indentLeft: 240,
      spacingAfter: 200,
    });
  });

  // OpenXML 구성
  const bodyXml = paras.map(renderDocxParagraph).join('');
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${bodyXml}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="맑은 고딕" w:eastAsia="맑은 고딕" w:hAnsi="맑은 고딕" w:cs="맑은 고딕"/>
        <w:sz w:val="21"/>
        <w:szCs w:val="21"/>
        <w:lang w:val="en-US" w:eastAsia="ko-KR"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="80"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:spacing w:after="160"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="36"/><w:szCs w:val="36"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle">
    <w:name w:val="Subtitle"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:spacing w:after="240"/></w:pPr>
    <w:rPr><w:color w:val="4B5563"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr>
      <w:keepNext/>
      <w:spacing w:before="260" w:after="100"/>
      <w:pBdr>
        <w:bottom w:val="single" w:sz="6" w:space="2" w:color="2563EB"/>
      </w:pBdr>
    </w:pPr>
    <w:rPr><w:b/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr>
  </w:style>
</w:styles>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`;

  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const corePropertiesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXml(profile.name)} - 모의면접 예상 질문지</dc:title>
  <dc:creator>면접온 (Myeonjeop-On)</dc:creator>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
</cp:coreProperties>`;

  return createZipBlob([
    { name: '[Content_Types].xml', data: enc.encode(contentTypesXml) },
    { name: '_rels/.rels', data: enc.encode(rootRelsXml) },
    { name: 'word/document.xml', data: enc.encode(documentXml) },
    { name: 'word/_rels/document.xml.rels', data: enc.encode(docRelsXml) },
    { name: 'word/styles.xml', data: enc.encode(stylesXml) },
    { name: 'docProps/core.xml', data: enc.encode(corePropertiesXml) },
  ]);
}
