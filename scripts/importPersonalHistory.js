/**
 * 개인 workout 히스토리 → Supabase import (sinzjang@gmail.com 전용)
 * 실행: node scripts/importPersonalHistory.js [파일경로]
 * 기본 파일: src/data/workout_import_mapped.json
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');
const envVars = fs.readFileSync(envPath, 'utf8')
  .split('\n')
  .filter((l) => l.includes('=') && !l.startsWith('#'))
  .reduce((acc, line) => {
    const [k, ...v] = line.split('=');
    acc[k.trim()] = v.join('=').trim();
    return acc;
  }, {});

const SUPABASE_URL = envVars['EXPO_PUBLIC_SUPABASE_URL'];
const SERVICE_ROLE_KEY =
  envVars['SUPABASE_SERVICE_ROLE_KEY'] ||
  envVars['EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY'];
const TARGET_EMAIL = 'sinzjang@gmail.com';
const DEFAULT_DATA_PATH = path.join(__dirname, '../src/data/workout_import_mapped.json');
const { sanitizeSessions } = require('./lib/sanitizeWorkoutHistory');

function validatePayload(data) {
  const sessions = Array.isArray(data.sessions) ? data.sessions : [];
  const routines = Array.isArray(data.routines) ? data.routines : [];
  const routineIds = new Set(routines.map((r) => r.client_id || r.id));
  const sessionIds = new Set();
  const issues = [];

  for (const s of sessions) {
    const id = s.client_id || s.id;
    if (!id) issues.push('세션 ID(client_id) 없음');
    else if (sessionIds.has(id)) issues.push(`중복 세션 ID: ${id}`);
    sessionIds.add(id);

    const start = new Date(s.started_at || s.startedAt);
    const end = new Date(s.ended_at || s.endedAt);
    if (Number.isNaN(start.getTime())) issues.push(`${id}: started_at 형식 오류`);
    if (Number.isNaN(end.getTime())) issues.push(`${id}: ended_at 형식 오류`);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end < start) {
      issues.push(`${id}: 종료 시각이 시작보다 앞섬`);
    }
    const rid = s.routine_id || s.routineId;
    if (rid && !routineIds.has(rid)) issues.push(`${id}: 존재하지 않는 routine_id ${rid}`);
    if (!Array.isArray(s.exercises) || s.exercises.length === 0) {
      issues.push(`${id}: exercises 비어 있음`);
    }
  }

  return { sessions: sessions.length, routines: routines.length, issues };
}

async function upsertRoutineMap(supabase, userId, routines) {
  if (!routines.length) return new Map();

  const rows = routines.map((r) => ({
    user_id: userId,
    client_id: r.client_id || r.id,
    name: r.name,
    exercises: r.exercises ?? [],
    is_active: r.is_active ?? true,
    location_id: null,
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from('workout_routines')
    .upsert(rows, { onConflict: 'user_id,client_id' })
    .select('id, client_id');

  if (error) throw error;

  const map = new Map();
  for (const row of data ?? []) map.set(row.client_id, row.id);
  return map;
}

function buildSessionRows(chunk, userId, routineMap, includeStartedAt) {
  return chunk.map((s) => {
    const row = {
      user_id: userId,
      client_id: s.id,
      ended_at: s.endedAt,
      location_id: null,
      routine_id: s.routineId ? (routineMap.get(s.routineId) ?? null) : null,
      exercises: s.exercises,
    };
    if (includeStartedAt) row.started_at = s.startedAt;
    return row;
  });
}

async function main() {
  const dataPath = process.argv[2]
    ? path.resolve(process.argv[2])
    : DEFAULT_DATA_PATH;

  if (!SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY (또는 EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) 가 .env에 없습니다.');
    process.exit(1);
  }
  if (!fs.existsSync(dataPath)) {
    console.error(`❌ 데이터 파일 없음: ${dataPath}`);
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const raw = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const preCheck = validatePayload(raw);
  console.log(`📋 무결성 사전검사: sessions=${preCheck.sessions}, routines=${preCheck.routines}`);
  if (preCheck.issues.length > 0) {
    console.error('❌ 무결성 오류:');
    preCheck.issues.slice(0, 20).forEach((m) => console.error('  -', m));
    if (preCheck.issues.length > 20) {
      console.error(`  ... 외 ${preCheck.issues.length - 20}건`);
    }
    process.exit(1);
  }
  console.log('✅ 사전검사 통과');

  const sanitized = sanitizeSessions(raw.sessions);
  console.log(`📦 정규화: ${sanitized.in} → ${sanitized.out} 세션`);
  if (sanitized.out === 0) {
    console.error('❌ import 가능한 세션이 없습니다.');
    process.exit(1);
  }
  if (sanitized.in !== sanitized.out) {
    console.warn(`⚠️  ${sanitized.in - sanitized.out}개 세션이 정규화 중 제외됨`);
  }

  const { data: { users }, error: userErr } = await supabase.auth.admin.listUsers();
  if (userErr) {
    console.error('❌ 유저 조회 실패:', userErr.message);
    process.exit(1);
  }
  const user = users.find((u) => u.email === TARGET_EMAIL);
  if (!user) {
    console.error(`❌ ${TARGET_EMAIL} 계정을 찾을 수 없습니다.`);
    process.exit(1);
  }
  console.log(`✅ 유저 확인: ${user.id} (${TARGET_EMAIL})`);

  const customExercises = raw.customExercises ?? [];
  if (customExercises.length > 0) {
    const rows = customExercises.map((ex) => ({
      user_id: user.id,
      client_id: ex.id,
      name: ex.name,
      muscle_group: ex.muscleGroup,
      gear: ex.gear,
      created_at: ex.createdAt,
    }));
    const { error } = await supabase
      .from('custom_exercises')
      .upsert(rows, { onConflict: 'user_id,client_id', ignoreDuplicates: true });
    if (error) console.warn('⚠️  custom_exercises:', error.message);
    else console.log(`✅ Custom exercises ${rows.length}개 저장`);
  }

  const routines = raw.routines ?? [];
  let routineMap = new Map();
  if (routines.length > 0) {
    routineMap = await upsertRoutineMap(supabase, user.id, routines);
    console.log(`✅ Routines ${routineMap.size}개 저장`);
  }

  const BATCH = 20;
  let inserted = 0;
  let includeStartedAt = true;

  for (let i = 0; i < sanitized.sessions.length; i += BATCH) {
    const chunk = sanitized.sessions.slice(i, i + BATCH);
    let rows = buildSessionRows(chunk, user.id, routineMap, includeStartedAt);
    let { error } = await supabase
      .from('workout_sessions')
      .upsert(rows, { onConflict: 'user_id,client_id' });

    if (error?.message.includes('started_at') && includeStartedAt) {
      console.warn('\n⚠️  workout_sessions.started_at 컬럼 없음 — ended_at만 저장합니다.');
      console.warn('   Supabase SQL Editor에서 supabase/migrations/003_session_started_at.sql 실행 후 재import하면 시작 시각이 반영됩니다.');
      includeStartedAt = false;
      rows = buildSessionRows(chunk, user.id, routineMap, false);
      ({ error } = await supabase
        .from('workout_sessions')
        .upsert(rows, { onConflict: 'user_id,client_id' }));
    }

    if (error) {
      console.error(`❌ 배치 ${i}~${i + BATCH}:`, error.message);
      process.exit(1);
    }
    inserted += chunk.length;
    process.stdout.write(
      `\r진행 중: ${Math.min(i + BATCH, sanitized.sessions.length)}/${sanitized.sessions.length}`
    );
  }
  console.log(`\n✅ Sessions ${inserted}개 저장 완료 (${path.basename(dataPath)})`);
}

main().catch((err) => {
  console.error('❌ 오류:', err.message);
  process.exit(1);
});
