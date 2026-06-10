// 피커 세션 동안 한 번 로드된 썸네일·근육图 UI 상태 (앱 재시작 전까지 유지)
const loadedThumbKeys = new Set<string>();
const loadedBodyKeys = new Set<string>();

export function isThumbUiCached(key: string): boolean {
  return loadedThumbKeys.has(key);
}

export function markThumbUiCached(key: string): void {
  loadedThumbKeys.add(key);
}

export function isBodyUiCached(key: string): boolean {
  return loadedBodyKeys.has(key);
}

export function markBodyUiCached(key: string): void {
  loadedBodyKeys.add(key);
}
