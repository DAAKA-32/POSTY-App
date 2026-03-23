/**
 * One-time script to configure CORS on the Firebase Storage bucket.
 * Run with: node scripts/set-cors.js
 */
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Load service account
const saPath = path.join(__dirname, "..", "service-account.json");
const serviceAccount = JSON.parse(fs.readFileSync(saPath, "utf-8"));

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const bucketName = "tink-dc3d4.firebasestorage.app";
const bucket = admin.storage().bucket(bucketName);

async function setCors() {
  console.log(`Setting CORS on bucket: ${bucketName}`);

  await bucket.setCorsConfiguration([
    {
      origin: [
        "https://postyapp.ai",
        "https://www.postyapp.ai",
        "http://localhost:3000",
        "http://localhost:3001",
      ],
      method: ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"],
      maxAgeSeconds: 3600,
      responseHeader: [
        "Content-Type",
        "Content-Length",
        "Authorization",
        "X-Requested-With",
        "x-goog-resumable",
        "x-firebase-storage-version",
      ],
    },
  ]);

  console.log("CORS configuration applied successfully!");

  // Verify
  const [metadata] = await bucket.getMetadata();
  console.log("Current CORS config:", JSON.stringify(metadata.cors, null, 2));
}

setCors().catch((err) => {
  console.error("Failed to set CORS:", err.message);
  process.exit(1);
});
