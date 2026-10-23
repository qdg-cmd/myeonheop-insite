import { StudentProfile, ApiKeys } from '../types';

const DB_NAME = 'myeonjeop_on_local_db';
const DB_VERSION = 1;
const STORE_NAME = 'student_profiles';

const API_KEY_STORAGE = 'myeonjeop_insight_api_keys';

/**
 * IndexedDB 초기화
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 학생 프로필 저장 또는 갱신
 */
export async function saveStudent(profile: StudentProfile): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(profile);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * 모든 학생 목록 가져오기
 */
export async function getAllStudents(): Promise<StudentProfile[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 특정 학생 정보 조회
 */
export async function getStudentById(id: string): Promise<StudentProfile | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 특정 학생 삭제
 */
export async function deleteStudent(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * 개인정보 보호: 로컬 데이터 완전 삭제
 */
export async function clearAllData(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      // API 키는 보존하고 생기부 데이터만 초기화
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * API 키 로컬 스토리지 관리
 */
export function getStoredApiKeys(): ApiKeys {
  try {
    const raw = localStorage.getItem(API_KEY_STORAGE) || localStorage.getItem('myeonjeop_on_api_keys');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load api keys', e);
  }
  return {
    gemini: '',
    openai: '',
    claude: '',
    activeProvider: 'gemini',
  };
}

export function saveStoredApiKeys(keys: ApiKeys): void {
  try {
    localStorage.setItem(API_KEY_STORAGE, JSON.stringify(keys));
  } catch (e) {
    console.error('Failed to save api keys', e);
  }
}
