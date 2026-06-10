// 썸네일 로드 동시 실행 수 제한 — 스크롤 끊김 방지 (세션 캐시는 thumbSessionCache)
import { isThumbUiCached, markThumbUiCached } from './thumbSessionCache';

const MAX_CONCURRENT = 2;
const RELEASE_DELAY_MS = 48;

const waitQueue: string[] = [];
const activeKeys = new Set<string>();
const listeners = new Map<string, Set<() => void>>();

function notifyReady(key: string): void {
  markThumbUiCached(key);
  const subs = listeners.get(key);
  if (!subs) return;
  for (const cb of subs) cb();
}

function pump(): void {
  while (activeKeys.size < MAX_CONCURRENT && waitQueue.length > 0) {
    const key = waitQueue.shift();
    if (!key || isThumbUiCached(key) || activeKeys.has(key)) continue;

    activeKeys.add(key);
    notifyReady(key);

    setTimeout(() => {
      activeKeys.delete(key);
      pump();
    }, RELEASE_DELAY_MS);
  }
}

function enqueue(key: string): void {
  if (isThumbUiCached(key) || waitQueue.includes(key) || activeKeys.has(key)) return;
  waitQueue.push(key);
  pump();
}

/** 썸네일 로드 슬롯 요청 — cleanup 시 대기열에서 제거 */
export function subscribeThumbLoad(key: string, onReady: () => void): () => void {
  if (isThumbUiCached(key)) {
    onReady();
    return () => {};
  }

  let subs = listeners.get(key);
  if (!subs) {
    subs = new Set();
    listeners.set(key, subs);
  }
  subs.add(onReady);

  enqueue(key);

  return () => {
    subs?.delete(onReady);
    if (subs?.size === 0) listeners.delete(key);
    const qIdx = waitQueue.indexOf(key);
    if (qIdx >= 0) waitQueue.splice(qIdx, 1);
  };
}

/** 피커 닫을 때 대기열만 초기화 (세션 캐시는 유지) */
export function resetThumbLoadScheduler(): void {
  waitQueue.length = 0;
  activeKeys.clear();
  listeners.clear();
}
