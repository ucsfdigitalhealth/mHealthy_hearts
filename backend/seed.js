#!/usr/bin/env node
// Seed script: populates all mHearts DB tables for a test user.
// Data is backdated to exactly 1 year ago from today.
// Usage: cd backend && node seed.js

const mysql    = require('mysql2/promise');
const bcrypt   = require('bcrypt');
const crypto   = require('crypto');
const readline = require('readline');

const DB_CONFIG = {
  user:       'root',
  password:   'root',
  database:   'mhearts',
  socketPath: '/Applications/MAMP/tmp/mysql/mysql.sock',
};

const TODAY        = new Date();
const ONE_YEAR_AGO = new Date(TODAY);
ONE_YEAR_AGO.setFullYear(ONE_YEAR_AGO.getFullYear() - 1);

function dateStr(d) {
  return d.toISOString().split('T')[0];
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function physicalActivityScore(steps) {
  if (steps >= 12500) return 100;
  if (steps >= 10000) return 75 + ((steps - 10000) / 2500) * 25;
  if (steps >= 7500)  return 50 + ((steps - 7500)  / 2500) * 25;
  if (steps >= 5000)  return 25 + ((steps - 5000)  / 2500) * 25;
  return (steps / 5000) * 25;
}

function sleepScore(minutesAsleep) {
  const h = minutesAsleep / 60;
  if (h >= 7 && h <= 9)  return 100;
  if (h >= 6 && h < 7)   return 70 + (h - 6) * 30;
  if (h > 9  && h <= 10) return 70 + (10 - h) * 30;
  if (h >= 5 && h < 6)   return 40 + (h - 5) * 30;
  return Math.max(0, 40 - (6 - h) * 20);
}

async function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim().toLowerCase()); }));
}

async function askRaw(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

async function getCredentials(userId) {
  console.log('\n  Credentials:');
  console.log(`  [a]  Auto  (username: seed_${userId.slice(0, 8)}, email: seed.${userId.slice(0, 8)}@example.com, password: SeedUser123!)`);
  console.log('  [c]  Custom — enter your own username, email, and password\n');
  const sub = await ask('Choice: ');
  if (sub === 'c') {
    const username = await askRaw('  Username: ');
    const email    = await askRaw('  Email:    ');
    const password = await askRaw('  Password: ');
    return { username, email, password };
  }
  return {
    username: `seed_${userId.slice(0, 8)}`,
    email:    `seed.${userId.slice(0, 8)}@example.com`,
    password: 'SeedUser123!',
  };
}

async function deleteOne(db) {
  const uuid = await ask('Enter UUID to delete: ');
  const [rows] = await db.execute('SELECT id, username, email FROM user_auth_testing WHERE id = ?', [uuid.trim()]);
  if (rows.length === 0) {
    console.log(`\nNo user found with UUID: ${uuid.trim()}`);
    return;
  }
  const { username, email } = rows[0];
  console.log(`\n  Found: ${username} <${email}>`);
  const confirm = await ask('Delete this user and ALL their data? [y/N] ');
  if (confirm !== 'y') { console.log('Aborted.'); return; }
  await db.execute('DELETE FROM user_auth_testing WHERE id = ?', [uuid.trim()]);
  console.log(`✓ Deleted user ${uuid.trim()} and all associated rows (CASCADE).`);
}

async function deleteAll(db) {
  const [rows] = await db.execute('SELECT COUNT(*) AS n FROM user_auth_testing');
  const count = rows[0].n;
  console.log(`\n  This will delete ALL ${count} user(s) and every row in every child table.`);
  const confirm = await ask('Type "yes" to confirm: ');
  if (confirm !== 'yes') { console.log('Aborted.'); return; }
  await db.execute('DELETE FROM user_auth_testing');
  console.log(`✓ Deleted all ${count} user(s) and all associated data (CASCADE).`);
}

async function insertChunks(db, sql, rows, chunkSize = 500) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    await db.query(sql, [rows.slice(i, i + chunkSize)]);
  }
}

async function main() {
  const AUTO   = process.argv.includes('--auto');
  const userId = crypto.randomUUID();

  console.log('\n========================================');
  console.log('  mHealthy Hearts — Seed Script');
  console.log('========================================');
  console.log(`  UUID:       ${userId}`);
  console.log(`  Seed date:  ${dateStr(ONE_YEAR_AGO)}  (1 year ago)`);

  let choice;
  if (AUTO) {
    console.log('  Mode:       --auto (inserting with auto credentials)');
    console.log('========================================\n');
    choice = 'i';
  } else {
    console.log('----------------------------------------');
    console.log('  [i]  Insert — seed all tables with the UUID above');
    console.log('  [d]  Delete — remove a user and all their data');
    console.log('  [q]  Quit');
    console.log('========================================\n');
    choice = await ask('Choice: ');
  }

  if (choice === 'q' || choice === '') {
    console.log('Aborted.');
    process.exit(0);
  }

  const db = await mysql.createConnection(DB_CONFIG);

  if (choice === 'd') {
    console.log('\n  [1]  Delete one user by UUID');
    console.log('  [2]  Delete ALL users and data\n');
    const sub = await ask('Choice: ');
    try {
      if (sub === '1') await deleteOne(db);
      else if (sub === '2') await deleteAll(db);
      else console.log('Unknown choice. Aborted.');
    } finally {
      await db.end();
    }
    process.exit(0);
  }

  if (choice !== 'i') {
    console.log('Unknown choice. Aborted.');
    await db.end();
    process.exit(1);
  }

  const creds = AUTO
    ? { username: `seed_${userId.slice(0, 8)}`, email: `seed.${userId.slice(0, 8)}@example.com`, password: 'SeedUser123!' }
    : await getCredentials(userId);

  console.log('\nConnected. Seeding...\n');

  try {
    // ── 1. user_auth_testing ────────────────────────────────────────────
    const { username, email, password } = creds;
    const hashed = await bcrypt.hash(password, 10);

    await db.execute(
      `INSERT INTO user_auth_testing (id, username, email, password, created_at) VALUES (?, ?, ?, ?, ?)`,
      [userId, username, email, hashed, ONE_YEAR_AGO]
    );
    console.log(`✓ user_auth_testing        username=${username}  email=${email}  password=${password}`);

    // ── 2. fitbit_daily_data — 365 days ────────────────────────────────
    const fitbitDailyRows = [];
    for (let i = 0; i < 365; i++) {
      const steps = rand(4000, 13000);
      const pas   = parseFloat(physicalActivityScore(steps).toFixed(2));
      fitbitDailyRows.push([
        crypto.randomUUID(), userId, dateStr(addDays(ONE_YEAR_AGO, i)),
        steps, rand(10, 45), rand(5, 25), rand(2, 20), pas,
      ]);
    }
    await insertChunks(db,
      `INSERT INTO fitbit_daily_data
         (data_id, user_id, date, steps, minutes_lightly_active, minutes_fairly_active,
          minutes_very_active, physical_activity_score)
       VALUES ?`,
      fitbitDailyRows
    );
    console.log(`✓ fitbit_daily_data        (${fitbitDailyRows.length} rows)`);

    // ── 3. fitbit_sleep_data — 365 nights ──────────────────────────────
    const fitbitSleepRows = [];
    for (let i = 0; i < 365; i++) {
      const asleep = rand(300, 480);
      const inBed  = asleep + rand(20, 80);
      const eff    = parseFloat(((asleep / inBed) * 100).toFixed(2));
      const ss     = parseFloat(sleepScore(asleep).toFixed(2));
      fitbitSleepRows.push([
        crypto.randomUUID(), userId, dateStr(addDays(ONE_YEAR_AGO, i)), asleep, inBed, eff, ss,
      ]);
    }
    await insertChunks(db,
      `INSERT INTO fitbit_sleep_data
         (data_id, user_id, date, total_minutes_asleep, total_time_in_bed, sleep_efficiency, sleep_score)
       VALUES ?`,
      fitbitSleepRows
    );
    console.log(`✓ fitbit_sleep_data        (${fitbitSleepRows.length} rows)`);

    // ── 4. blood_sugar_assessments ─────────────────────────────────────
    await db.execute(
      `INSERT INTO blood_sugar_assessments
         (data_id, user_id, test_type, value, has_diabetes, commitment_to_change, importance, confidence, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), userId, 'fasting', 95.0, 0, 1, 7, 8, ONE_YEAR_AGO]
    );
    console.log(`✓ blood_sugar_assessments`);

    // ── 5. bmi_assessments ─────────────────────────────────────────────
    // weight=165 lbs, height=67 in → BMI = 703×165÷67² ≈ 25.86
    const bmi = parseFloat(((703 * 165) / (67 * 67)).toFixed(2));
    await db.execute(
      `INSERT INTO bmi_assessments
         (data_id, user_id, bmi_value, weight, height, previous_bmi, commitment_to_change, importance, confidence, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), userId, bmi, 165.0, 67.0, 26.5, 1, 6, 7, ONE_YEAR_AGO]
    );
    console.log(`✓ bmi_assessments`);

    // ── 6. blood_lipids_assessments ────────────────────────────────────
    await db.execute(
      `INSERT INTO blood_lipids_assessments
         (data_id, user_id, measure_type, value, medication, commitment_to_change, importance, confidence, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), userId, 'non_hdl', 125.0, 0, 1, 8, 7, ONE_YEAR_AGO]
    );
    console.log(`✓ blood_lipids_assessments`);

    // ── 7. smoking_assessments ─────────────────────────────────────────
    // category='never' → score=100, no frequency/commitment/importance/confidence needed
    await db.execute(
      `INSERT INTO smoking_assessments
         (data_id, user_id, category, frequency, time_quit, interest_in_quitting, score,
          commitment_to_change, importance, confidence, second_hand_exposure, type_smoker, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), userId, 'never', null, null, null, 100,
       null, null, null, 0, null, ONE_YEAR_AGO]
    );
    console.log(`✓ smoking_assessments`);

    // ── 8. diet_assessments ────────────────────────────────────────────
    await db.execute(
      `INSERT INTO diet_assessments
         (data_id, user_id, vegetables_per_day, fruit_per_day, red_meat_per_week,
          fish_per_week, butter_per_week, beans_per_week, whole_grains_per_day,
          sweets_per_week, fast_food_per_week, sugary_drinks_per_week,
          commitment_to_change, importance, confidence, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), userId, 2.5, 1.5, 2.0, 1.5, 1.0, 3.0, 2.0, 3.0, 1.0, 2.0,
       1, 7, 6, ONE_YEAR_AGO]
    );
    console.log(`✓ diet_assessments`);

    // ── 9. daily_goals — 365 rows ──────────────────────────────────────
    const stepTargetCycle = [6000, 7000, 8000, 10000];
    const dailyGoalRows = [];
    for (let i = 0; i < 365; i++) {
      const stepTarget = stepTargetCycle[i % 4];
      const steps      = fitbitDailyRows[i][3];
      const goalMet    = steps >= stepTarget ? 1 : 0;
      const prevTarget = i > 0 ? stepTargetCycle[(i - 1) % 4] : null;
      const prevDone   = i > 0 ? (fitbitDailyRows[i - 1][3] >= prevTarget ? 1 : 0) : null;
      dailyGoalRows.push([userId, dateStr(addDays(ONE_YEAR_AGO, i)), stepTarget, rand(1, 5), prevDone, goalMet]);
    }
    await insertChunks(db,
      `INSERT INTO daily_goals (user_id, goal_date, step_target, symptom_rating, completed_yesterday, goal_met) VALUES ?`,
      dailyGoalRows
    );
    console.log(`✓ daily_goals              (${dailyGoalRows.length} rows)`);

    // ── 10. activity_streaks ───────────────────────────────────────────
    await db.execute(
      `INSERT INTO activity_streaks (user_id, current_streak, longest_streak, last_goal_met_date) VALUES (?, ?, ?, ?)`,
      [userId, 5, 14, dateStr(addDays(ONE_YEAR_AGO, 364))]
    );
    console.log(`✓ activity_streaks`);

    // ── 11. le8_composite_scores ──────────────────────────────────────
    const le8Rows = [];
    for (let i = 0; i < 365; i++) {
      const pas       = parseFloat(fitbitDailyRows[i][7]);
      const ss        = parseFloat(fitbitSleepRows[i][6]);
      const parts     = [55.0, pas, 100.0, ss, 62.0, 100.0, 80.0];
      const composite = parseFloat((parts.reduce((a, b) => a + b, 0) / 7).toFixed(2));
      le8Rows.push([
        crypto.randomUUID(), userId, dateStr(addDays(ONE_YEAR_AGO, i)),
        55.0, pas, 100.0, ss, 62.0, 100.0, 80.0, null, composite, 7,
      ]);
    }
    await insertChunks(db,
      `INSERT INTO le8_composite_scores
         (id, user_id, score_date, diet_score, physical_activity_score, nicotine_score,
          sleep_score, bmi_score, blood_lipids_score, blood_sugar_score, blood_pressure_score,
          composite_score, components_counted)
       VALUES ?`,
      le8Rows, 200
    );
    console.log(`✓ le8_composite_scores     (${le8Rows.length} rows)`);

    // ── 14. symptom_disclaimer_log ─────────────────────────────────────
    await db.query(
      `INSERT INTO symptom_disclaimer_log (user_id, context, shown_at) VALUES ?`,
      [[[userId, 'login', ONE_YEAR_AGO], [userId, 'section_entry', ONE_YEAR_AGO]]]
    );
    console.log(`✓ symptom_disclaimer_log`);

    // ── 15. symptom_events ─────────────────────────────────────────────
    const eventsSpec = [
      { key: 'fatigue',     label: 'Fatigue',      type: 'event_log_ema', bucket: '1_hour_or_less',  intensity: 6 },
      { key: 'anxiety',     label: 'Anxiety',      type: 'event_log_ema', bucket: '10_min_or_less', intensity: 4 },
      { key: 'hot_flashes', label: 'Hot flashes',  type: 'event_log_ema', bucket: '10_min_or_less', intensity: 5 },
    ];
    const insertedEvents = [];
    for (const [idx, spec] of eventsSpec.entries()) {
      const occurred = addDays(ONE_YEAR_AGO, idx * 30);
      const [res] = await db.execute(
        `INSERT INTO symptom_events
           (user_id, symptom_key, symptom_label, tracking_type, occurred_at,
            duration_bucket, activities, intensity_score, safety_modal_shown, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, spec.key, spec.label, spec.type, occurred,
         spec.bucket, JSON.stringify(['sitting', 'resting']), spec.intensity, 0, occurred]
      );
      insertedEvents.push({ insertId: res.insertId, key: spec.key });
    }
    console.log(`✓ symptom_events           (${insertedEvents.length} rows)`);

    // ── 16. weekly_symptom_plans ───────────────────────────────────────
    await db.execute(
      `INSERT INTO weekly_symptom_plans
         (user_id, symptom_keys, day_of_week, time, notification_channel, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, JSON.stringify(['fatigue', 'anxiety', 'hot_flashes']), 1, '09:00', 'email', 1, ONE_YEAR_AGO]
    );
    console.log(`✓ weekly_symptom_plans`);

    // ── 17. ema_enrollments ────────────────────────────────────────────
    const instrumentMap = {
      fatigue:     'promis_fatigue_4a',
      anxiety:     'promis_anxiety_4a',
      hot_flashes: 'hfrdis',
    };
    const enrollmentIds = [];
    for (const evt of insertedEvents) {
      const [res] = await db.execute(
        `INSERT INTO ema_enrollments
           (user_id, symptom_event_id, instrument_response_id, symptom_key, instrument_key,
            schedule, frequency, schedule_type, notification_channel, is_active, enrolled_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId, evt.insertId, null, evt.key, instrumentMap[evt.key],
          JSON.stringify([{ day_of_week: 1, time: '09:00' }]),
          'ongoing', 'weekly_day_time', 'email', 1, ONE_YEAR_AGO,
        ]
      );
      enrollmentIds.push(res.insertId);
    }
    console.log(`✓ ema_enrollments          (${enrollmentIds.length} rows)`);

    // ── 18. symptom_instrument_responses ──────────────────────────────
    const instrQCount = { promis_fatigue_4a: 4, promis_anxiety_4a: 4, hfrdis: 8 };
    for (const [idx, evt] of insertedEvents.entries()) {
      const instrId   = instrumentMap[evt.key];
      const nQ        = instrQCount[instrId];
      const responses = {};
      for (let q = 1; q <= nQ; q++) responses[`q${q}`] = rand(1, 4);
      const rawScore  = Object.values(responses).reduce((a, b) => a + b, 0);
      const responded = addDays(ONE_YEAR_AGO, idx * 30 + 7);
      await db.execute(
        `INSERT INTO symptom_instrument_responses
           (patient_id, symptom_key, instrument_id, raw_responses, raw_score, t_score,
            severity_label, enrollment_id, weekly_plan_id, responded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, evt.key, instrId, JSON.stringify(responses), rawScore,
         52.3, 'mild', enrollmentIds[idx], null, responded]
      );
    }
    console.log(`✓ symptom_instrument_responses (${insertedEvents.length} rows)`);

    // ── Summary ────────────────────────────────────────────────────────
    console.log('\n========================================');
    console.log('  Seed complete!');
    console.log('========================================');
    console.log(`  User ID:  ${userId}`);
    console.log(`  Username: ${username}`);
    console.log(`  Email:    ${email}`);
    console.log(`  Password: ${password}`);
    console.log('========================================\n');

  } catch (err) {
    console.error('\n[SEED ERROR]', err.sqlMessage || err.message);
    if (err.sql) console.error('Near:', err.sql.slice(0, 120));
    process.exit(1);
  } finally {
    await db.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
