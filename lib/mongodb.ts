import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI belum diset di .env.local");
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var _mongoDbPromise: Promise<Db> | undefined;
}

async function initDb(): Promise<Db> {
  const client = await clientPromise;
  const dbName = process.env.MONGODB_DB || "jadwal_jumat";
  const db = client.db(dbName);

  /**
   * ===========================
   * TTL INDEX (2 TAHUN)
   * ===========================
   * Auto hapus jadwal_history
   */
  const col = db.collection("jadwal_history");
  const indexes = await col.indexes();

  const hasTTL = indexes.some(
    (i) => i.key?.createdAt === 1 && typeof i.expireAfterSeconds === "number"
  );

  if (!hasTTL) {
    await col.createIndex(
      { createdAt: 1 },
      {
        expireAfterSeconds: 60 * 60 * 24 * 365 * 2, // 2 tahun
        name: "ttl_createdAt_2y",
      }
    );
    console.log("✅ TTL index jadwal_history aktif (2 tahun)");
  }

  return db;
}

// =======================
// MongoClient Singleton
// =======================
if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise!;
} else {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

// =======================
// Export getDb()
// =======================
export async function getDb() {
  if (!global._mongoDbPromise) {
    global._mongoDbPromise = initDb();
  }
  return global._mongoDbPromise;
}
