#!/usr/bin/env node
/**
 * Apple Sign In — Supabase용 Client Secret (JWT) 생성
 *
 * .p8 키 + Team ID + Services ID 로 6개월 유효 JWT를 만듭니다.
 * Supabase → Authentication → Providers → Apple → Secret Key 에 붙여넣기
 *
 * 사용:
 *   APPLE_TEAM_ID=XXXXXXXXXX \
 *   APPLE_SERVICES_ID=com.forme.fitness.signin \
 *   node scripts/generateAppleSecret.js
 *
 * 또는 인자:
 *   node scripts/generateAppleSecret.js --team-id XXX --services-id YYY
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/** .env 에서 APPLE_* 등 로드 (dotenv 없이) */
function loadDotEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}
const DEFAULT_KEY_PATH = path.join(ROOT, 'AuthKey_R8S2XHD8K7.p8');
const DEFAULT_KEY_ID = 'R8S2XHD8K7';
const MAX_DAYS = 180; // Apple 최대 6개월

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--team-id') out.teamId = argv[++i];
    else if (a === '--services-id' || a === '--client-id') out.servicesId = argv[++i];
    else if (a === '--key-id') out.keyId = argv[++i];
    else if (a === '--key-path') out.keyPath = argv[++i];
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

function base64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function generateAppleClientSecret({ teamId, servicesId, keyId, privateKeyPem }) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + MAX_DAYS * 24 * 60 * 60;

  const header = base64Url(JSON.stringify({ alg: 'ES256', kid: keyId }));
  const payload = base64Url(
    JSON.stringify({
      iss: teamId,
      iat: now,
      exp,
      aud: 'https://appleid.apple.com',
      sub: servicesId,
    })
  );

  const signingInput = `${header}.${payload}`;
  const sign = crypto.createSign('SHA256');
  sign.update(signingInput);
  sign.end();

  const signature = sign.sign({ key: privateKeyPem, dsaEncoding: 'ieee-p1363' });
  return `${signingInput}.${base64Url(signature)}`;
}

function main() {
  loadDotEnv();
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(`
Apple Supabase Secret Key 생성기

필수:
  APPLE_TEAM_ID       Apple Developer Team ID (10자)
  APPLE_SERVICES_ID   Sign in with Apple Services ID (Identifier)

선택:
  APPLE_KEY_ID        기본: ${DEFAULT_KEY_ID}
  APPLE_KEY_PATH      기본: AuthKey_R8S2XHD8K7.p8

예:
  APPLE_TEAM_ID=ABCDE12345 APPLE_SERVICES_ID=com.forme.fitness.signin node scripts/generateAppleSecret.js
`);
    process.exit(0);
  }

  const teamId = args.teamId || process.env.APPLE_TEAM_ID?.trim();
  const servicesId = args.servicesId || process.env.APPLE_SERVICES_ID?.trim();
  const keyId = args.keyId || process.env.APPLE_KEY_ID?.trim() || DEFAULT_KEY_ID;
  const keyPath = args.keyPath || process.env.APPLE_KEY_PATH?.trim() || DEFAULT_KEY_PATH;

  if (!teamId || !servicesId) {
    console.error('❌ APPLE_TEAM_ID 와 APPLE_SERVICES_ID 가 필요합니다.');
    console.error('   Apple Developer → Membership(팀 ID) / Identifiers → Services ID');
    console.error('   .env 에 추가하거나 인자로 전달하세요.');
    process.exit(1);
  }

  if (!fs.existsSync(keyPath)) {
    console.error(`❌ .p8 키 파일을 찾을 수 없습니다: ${keyPath}`);
    process.exit(1);
  }

  const privateKeyPem = fs.readFileSync(keyPath, 'utf8');
  const secret = generateAppleClientSecret({
    teamId,
    servicesId,
    keyId,
    privateKeyPem,
  });

  const expiresAt = new Date(Date.now() + MAX_DAYS * 24 * 60 * 60 * 1000);

  console.log('\n✅ Supabase Apple Provider — Secret Key (JWT)\n');
  console.log(secret);
  console.log('\n---');
  console.log(`Key ID:       ${keyId}`);
  console.log(`Team ID:      ${teamId}`);
  console.log(`Services ID:  ${servicesId}`);
  console.log(`만료(약):     ${expiresAt.toISOString().slice(0, 10)} (${MAX_DAYS}일 후 재생성)`);
  console.log('\nSupabase → Auth → Providers → Apple');
  console.log('  Client ID  = Services ID');
  console.log('  Secret Key = 위 JWT 전체 복사');
  console.log('');
}

main();
