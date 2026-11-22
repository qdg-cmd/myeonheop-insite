export interface PastExamData {
  UNIV_Q: Record<string, Record<string, string[]>>;
  CASES: Array<[string, string, string, string, string, string, string, string]>;
  QB: {
    S: string[];
    U: string[];
    R: Array<[string, number, string, string, number, number, number, string, number]>;
  };
}

let cachedData: PastExamData | null = null;
let loadPromise: Promise<PastExamData> | null = null;

const EMPTY_DATA: PastExamData = {
  UNIV_Q: {},
  CASES: [],
  QB: { S: [], U: [], R: [] },
};

/**
 * public/data/pastExamData.json 파일을 1회 지연 로딩하고 메모리에 캐싱합니다.
 */
export async function loadPastExamData(): Promise<PastExamData> {
  if (cachedData) return cachedData;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      // 1. 브라우저 환경 (fetch)
      if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
        const baseUrl = import.meta.env.BASE_URL || './';
        const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
        const url = `${cleanBase}data/pastExamData.json`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
        }
        const json = (await res.json()) as PastExamData;
        cachedData = json;
        return json;
      }

      // 2. Node.js 환경 (테스트/스크립트 지원)
      const g = typeof globalThis !== 'undefined' ? (globalThis as any) : {};
      if (typeof g.process !== 'undefined' && g.process.versions?.node) {
        try {
          const req = g.require;
          if (typeof req === 'function') {
            const fs = req('fs');
            const path = req('path');
            const p = path.resolve(g.process.cwd(), 'public/data/pastExamData.json');
            if (fs.existsSync(p)) {
              const raw = fs.readFileSync(p, 'utf8');
              const json = JSON.parse(raw) as PastExamData;
              cachedData = json;
              return json;
            }
          }
        } catch {
          // Node fs 실패 시 무시
        }
      }

      cachedData = EMPTY_DATA;
      return EMPTY_DATA;
    } catch (err) {
      console.warn('[pastExamLoader] Warning: Failed to load pastExamData.json, using fallback.', err);
      cachedData = EMPTY_DATA;
      return EMPTY_DATA;
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

export function getPastExamData(): PastExamData | null {
  return cachedData;
}

export function setPastExamData(data: PastExamData): void {
  cachedData = data;
}
