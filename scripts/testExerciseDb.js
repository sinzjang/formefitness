#!/usr/bin/env node
/** ExerciseDB RapidAPI 연결 테스트 */
const KEY = process.env.EXPO_PUBLIC_RAPIDAPI_KEY;
const HOST = 'exercisedb.p.rapidapi.com';

async function get(path) {
  const res = await fetch(`https://${HOST}${path}`, {
    headers: { 'X-RapidAPI-Key': KEY, 'X-RapidAPI-Host': HOST },
  });
  const text = await res.text();
  return { status: res.status, text };
}

async function main() {
  if (!KEY) {
    console.log('export EXPO_PUBLIC_RAPIDAPI_KEY=... 후 실행');
    return;
  }
  console.log('GET /status');
  console.log(await get('/status'));
  console.log('\nGET /exercises/name/bench%20press');
  console.log((await get('/exercises/name/bench%20press')).text.slice(0, 300));
  console.log('\nGET /exercises/bodyPart/chest (first 200 chars)');
  console.log((await get('/exercises/bodyPart/chest')).text.slice(0, 200));
}

main().catch(console.error);
