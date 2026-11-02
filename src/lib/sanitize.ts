/**
 * XSS(Cross-Site Scripting) 방어를 위한 경량 HTML 새니타이저
 * - 브라우저 내장 DOMParser를 사용하여 안전한 텍스트 서식 태그만 허용
 * - script, iframe, object, embed 등 위험 태그 완전 제거
 * - onerror, onload 등 인라인 자바스크립트 이벤트 핸들러 및 javascript: URL 원천 차단
 */
export function sanitizeHtml(dirtyHtml: string): string {
  if (!dirtyHtml) return '';
  // HTML 태그가 없는 일반 문자열인 경우 불필요한 파싱 없이 즉시 반환
  if (!/<[a-z][\s\S]*>/i.test(dirtyHtml)) return dirtyHtml;

  const parser = new DOMParser();
  const doc = parser.parseFromString(dirtyHtml, 'text/html');

  // 학생부 형광펜 및 서식 표시에 필요한 안전한 태그만 허용 화이트리스트
  const ALLOWED_TAGS = new Set([
    'SPAN',
    'MARK',
    'B',
    'STRONG',
    'I',
    'EM',
    'U',
    'P',
    'BR',
    'FONT',
    'DIV',
    'SMALL',
  ]);

  // 안전한 서식 속성만 허용 (이벤트 핸들러 일체 불허)
  const ALLOWED_ATTRS = new Set(['class', 'style', 'color', 'size']);

  function cleanNode(node: Node) {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        const tagName = el.tagName.toUpperCase();

        if (!ALLOWED_TAGS.has(tagName)) {
          // 실행 가능한 고위험 스크립트/임베드 태그는 내용물까지 완전 삭제
          if (['SCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'STYLE', 'LINK'].includes(tagName)) {
            el.remove();
            continue;
          } else {
            // 그 외 미허용 태그는 껍질 태그만 벗기고 텍스트 노드로 치환
            const textNode = document.createTextNode(el.textContent || '');
            el.replaceWith(textNode);
            continue;
          }
        }

        // 허용되지 않은 속성 및 on- 으로 시작하는 이벤트 핸들러(onerror, onload, onclick 등) 전부 제거
        const attrs = Array.from(el.attributes);
        for (const attr of attrs) {
          const attrName = attr.name.toLowerCase();
          if (attrName.startsWith('on') || !ALLOWED_ATTRS.has(attrName)) {
            el.removeAttribute(attr.name);
          } else if (attrName === 'style') {
            // style 속성을 악용한 CSS 인젝션(javascript:, expression 등) 차단
            if (/expression|javascript:|behavior/i.test(attr.value)) {
              el.removeAttribute(attr.name);
            }
          }
        }

        cleanNode(el);
      }
    }
  }

  cleanNode(doc.body);
  return doc.body.innerHTML;
}
