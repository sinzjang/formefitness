/**
 * workout_data.csv → workout_import.json 생성
 * 실행: node scripts/generateWorkoutImport.js
 */
const fs = require('fs');
const path = require('path');

const GEAR_TO_RESISTANCE = {
  Body: 'bodyweight',
  Band: 'band',
  Barbell: 'weight',
  Dumbbell: 'weight',
  Kettlebell: 'weight',
  Machine: 'weight',
  Plate: 'weight',
};

function parseCSVLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
      continue;
    }
    if (c === ',' && !inQ) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

function parseCsvDate(str) {
  if (!str?.trim()) return new Date().toISOString();
  const d = new Date(str.replace(',', ''));
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function normalize(s) {
  return s
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function loadCatalog() {
  const exFile = fs.readFileSync(path.join(__dirname, '../constants/exercises.ts'), 'utf8');
  const blocks = exFile.split(/\{\s*\n/).slice(1);
  const catalog = [];

  for (const block of blocks) {
    const name = block.match(/name: '([^']+)'/)?.[1];
    const nameEn = block.match(/nameEn: '([^']+)'/)?.[1];
    const muscleGroup = block.match(/muscleGroup: '([^']+)'/)?.[1];
    const gear = block.match(/gear: '([^']+)'/)?.[1];
    if (name && nameEn && muscleGroup && gear) {
      catalog.push({ name, nameEn, muscleGroup, gear });
    }
  }
  return catalog;
}

function inferMuscleGear(csvName) {
  const lower = csvName.toLowerCase();
  let gear = 'Dumbbell';
  if (/\bband\b|\(band\)/i.test(csvName)) gear = 'Band';
  else if (/bodyweight|push up|pushup|push-up|pull up|pullup|plank|dip|hang|squat \(body/i.test(lower))
    gear = 'Body';
  else if (/machine|smith|cable|pulldown|lat pull/i.test(lower)) gear = 'Machine';
  else if (/barbell|ez bar/i.test(lower)) gear = 'Barbell';
  else if (/kettlebell/i.test(lower)) gear = 'Kettlebell';

  let muscleGroup = 'chest';
  if (/shoulder|lateral|delt|pike|overhead press/i.test(lower)) muscleGroup = 'shoulder';
  else if (/back|row|pull|lat|scapular|chin up|dead hang/i.test(lower)) muscleGroup = 'back';
  else if (/curl|tricep|bicep|hammer|kickback|dip|arm/i.test(lower)) muscleGroup = 'arms';
  else if (/squat|leg|glute|lunge|calf|hip/i.test(lower)) muscleGroup = 'legs';
  else if (/crunch|plank|vacuum|vacumm|ab |core|leg raise/i.test(lower)) muscleGroup = 'core';

  return { muscleGroup, gear };
}

function findCatalogMatch(csvName, catalog) {
  const n = normalize(csvName);
  const nCore = n.replace(/\s/g, '');

  let best = null;
  let bestScore = 0;

  for (const ex of catalog) {
    const a = normalize(ex.nameEn);
    const aCore = a.replace(/\s/g, '');
    if (nCore === aCore) return ex;
    if (nCore.includes(aCore) || aCore.includes(nCore)) {
      const score = aCore.length;
      if (score > bestScore) {
        bestScore = score;
        best = ex;
      }
    }
  }
  return best;
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function main() {
  const catalog = loadCatalog();
  const csvPath = path.join(__dirname, '../src/data/workout_data.csv');
  const csv = fs.readFileSync(csvPath, 'utf8');
  const lines = csv.trim().split('\n');
  const header = parseCSVLine(lines[0]);
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));

  const exerciseRegistry = new Map();
  const customExercises = [];
  const sessionsMap = new Map();
  const routineExercises = new Map();

  const resolveExercise = (csvTitle) => {
    if (exerciseRegistry.has(csvTitle)) return exerciseRegistry.get(csvTitle);

    const catalogHit = findCatalogMatch(csvTitle, catalog);
    let resolved;

    if (catalogHit) {
      resolved = {
        exerciseKey: catalogHit.name,
        exerciseName: { ko: catalogHit.name, en: catalogHit.nameEn },
        muscleGroup: catalogHit.muscleGroup,
        resistanceType: GEAR_TO_RESISTANCE[catalogHit.gear] ?? 'weight',
        isCustom: false,
      };
    } else {
      const inferred = inferMuscleGear(csvTitle);
      const customId = `import_custom_${slugify(csvTitle)}`;
      const custom = {
        id: customId,
        name: csvTitle,
        muscleGroup: inferred.muscleGroup,
        gear: inferred.gear,
        createdAt: new Date().toISOString(),
      };
      customExercises.push(custom);
      resolved = {
        exerciseKey: `custom:${customId}`,
        exerciseName: { ko: csvTitle, en: csvTitle },
        muscleGroup: inferred.muscleGroup,
        resistanceType: GEAR_TO_RESISTANCE[inferred.gear] ?? 'weight',
        isCustom: true,
        customId,
      };
    }

    exerciseRegistry.set(csvTitle, resolved);
    return resolved;
  };

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    const title = row[idx.title];
    const startTime = row[idx.start_time];
    const endTime = row[idx.end_time];
    const exerciseTitle = row[idx.exercise_title];
    const setIndex = parseInt(row[idx.set_index] ?? '0', 10) || 0;
    const weightRaw = row[idx.weight_lbs]?.trim();
    const repsRaw = row[idx.reps]?.trim();
    const durationRaw = row[idx.duration_seconds]?.trim();

    const sessionKey = `${title}|||${startTime}`;
    if (!sessionsMap.has(sessionKey)) {
      sessionsMap.set(sessionKey, {
        id: `import_${slugify(title)}_${slugify(startTime)}`,
        endedAt: parseCsvDate(endTime || startTime),
        startedAt: parseCsvDate(startTime),
        title,
        locationId: 'loc_gym',
        exercisesMap: new Map(),
      });
    }

    const session = sessionsMap.get(sessionKey);
    const exMeta = resolveExercise(exerciseTitle);

    if (!session.exercisesMap.has(exerciseTitle)) {
      session.exercisesMap.set(exerciseTitle, {
        ...exMeta,
        sets: [],
      });
    }

    const weight = weightRaw ? parseFloat(weightRaw) : undefined;
    const reps = repsRaw ? parseInt(repsRaw, 10) : durationRaw ? 0 : 0;
    const hasData = (reps > 0) || (weight && weight > 0) || (durationRaw && parseInt(durationRaw, 10) > 0);

    if (hasData) {
      session.exercisesMap.get(exerciseTitle).sets.push({
        setNumber: setIndex + 1,
        weightLb: weight && exMeta.resistanceType === 'weight' ? weight : undefined,
        bwAddedLb:
          weight && exMeta.resistanceType === 'bodyweight' ? weight : undefined,
        reps: reps > 0 ? reps : 1,
        completed: true,
      });
    }

    if (!routineExercises.has(title)) routineExercises.set(title, new Map());
    routineExercises.get(title).set(exerciseTitle, exMeta);
  }

  const sessions = [...sessionsMap.values()]
    .map((s) => {
      const exercises = [...s.exercisesMap.values()]
        .map((ex) => ({
          exerciseKey: ex.exerciseKey,
          exerciseName: ex.exerciseName,
          muscleGroup: ex.muscleGroup,
          resistanceType: ex.resistanceType,
          isCustom: ex.isCustom,
          customId: ex.customId,
          sets: ex.sets
            .sort((a, b) => a.setNumber - b.setNumber)
            .map((set, i) => ({ ...set, setNumber: i + 1 })),
        }))
        .filter((ex) => ex.sets.length > 0);

      return {
        id: s.id,
        endedAt: s.endedAt,
        startedAt: s.startedAt,
        locationId: s.locationId,
        title: s.title,
        exercises,
      };
    })
    .filter((s) => s.exercises.length > 0)
    .sort((a, b) => b.endedAt.localeCompare(a.endedAt));

  const routines = [...routineExercises.entries()].map(([name, exMap], i) => ({
    id: `import_routine_${slugify(name)}`,
    locationId: 'loc_gym',
    name,
    createdAt: new Date().toISOString(),
    exercises: [...exMap.values()].map((ex) => ({
      exerciseKey: ex.exerciseKey,
      exerciseName: ex.exerciseName,
      muscleGroup: ex.muscleGroup,
      resistanceType: ex.resistanceType,
      defaultRestSeconds: 60,
      isCustom: ex.isCustom,
      customId: ex.customId,
    })),
  }));

  const dedupedCustom = [...new Map(customExercises.map((c) => [c.id, c])).values()];

  const output = {
    version: 1,
    generatedAt: new Date().toISOString(),
    stats: {
      sessions: sessions.length,
      customExercises: dedupedCustom.length,
      routines: routines.length,
    },
    customExercises: dedupedCustom,
    sessions: sessions.map(({ title, startedAt, ...rest }) => rest),
    routines,
  };

  const outPath = path.join(__dirname, '../src/data/workout_import.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log('Generated:', outPath);
  console.log('Sessions:', output.stats.sessions);
  console.log('Custom exercises:', output.stats.customExercises);
  console.log('Routines:', output.stats.routines);
}

main();
