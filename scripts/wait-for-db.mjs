import pg from 'pg';

const { Client } = pg;

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const maxAttempts = Number(process.env.DB_WAIT_ATTEMPTS || 60);
const delayMs = Number(process.env.DB_WAIT_DELAY_MS || 1000);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    console.log('Database is ready');
    process.exit(0);
  } catch (err) {
    try {
      await client.end();
    } catch {}
    console.log(`Waiting for database... (${attempt}/${maxAttempts})`);
    await sleep(delayMs);
  }
}

console.error('Database did not become ready in time');
process.exit(1);
