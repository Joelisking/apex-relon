/**
 * Quick smoke test for GCP Storage connectivity.
 * Run: dotenv -e .env.demo -- ts-node scripts/test-gcp-upload.ts
 */
import { Storage } from '@google-cloud/storage';
import * as path from 'path';
import * as fs from 'fs';

const projectId = process.env.GCP_PROJECT_ID;
const bucketName = process.env.GCP_STORAGE_BUCKET;
// Support both env var names
const keyFilename =
  process.env.GCP_SERVICE_ACCOUNT_KEY_PATH || process.env.GCP_KEY_FILE;

if (!projectId || !bucketName) {
  console.error('❌  GCP_PROJECT_ID and GCP_STORAGE_BUCKET must be set');
  process.exit(1);
}

const resolvedKey = keyFilename
  ? path.resolve(process.cwd(), keyFilename)
  : null;

if (resolvedKey) {
  if (!fs.existsSync(resolvedKey)) {
    console.error(`❌  Key file not found: ${resolvedKey}`);
    process.exit(1);
  }
  console.log(`✅  Key file found: ${resolvedKey}`);
} else {
  console.log('ℹ️   No key file — using Application Default Credentials');
}

const storage = new Storage(
  resolvedKey ? { projectId, keyFilename: resolvedKey } : { projectId },
);

const bucket = storage.bucket(bucketName);
const testPath = `_test/upload-test-${Date.now()}.txt`;
const testContent = Buffer.from(
  `GCP upload test — ${new Date().toISOString()}`,
);

async function run() {
  console.log(`\n🪣  Bucket : ${bucketName}`);
  console.log(`📁  Path   : ${testPath}\n`);

  // 1. Upload
  console.log('⬆️   Uploading test file…');
  const file = bucket.file(testPath);
  await new Promise<void>((resolve, reject) => {
    const stream = file.createWriteStream({
      resumable: false,
      metadata: { contentType: 'text/plain' },
    });
    stream.on('error', reject);
    stream.on('finish', resolve);
    stream.end(testContent);
  });
  console.log('✅  Upload succeeded');

  // 2. Verify exists
  const [exists] = await file.exists();
  console.log(`✅  File exists in bucket: ${exists}`);

  // 3. Read back
  const [contents] = await file.download();
  console.log(`✅  Downloaded content: "${contents.toString()}"`);

  // 4. Signed URL
  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + 5 * 60 * 1000,
  });
  console.log(`✅  Signed URL (5 min): ${url.substring(0, 80)}…`);

  // 5. Cleanup
  await file.delete();
  console.log('✅  Test file deleted — bucket is clean\n');

  console.log('🎉  All GCP Storage checks passed!');
}

run().catch((err) => {
  console.error('\n❌  GCP Storage test FAILED:');
  console.error(err.message || err);
  process.exit(1);
});
