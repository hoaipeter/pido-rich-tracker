import { MongoClient, ServerApiVersion, type Db } from "mongodb";
import { env } from "./env";

const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  // Serverless-tuned pool: small cap, keep one warm to skip TLS handshake
  // on the second request, retire idle conns faster than the driver default.
  maxPoolSize: 10,
  minPoolSize: 1,
  maxIdleTimeMS: 60_000,
  serverSelectionTimeoutMS: 8_000,
  // Enforce TLS in code as a defence-in-depth backstop. Atlas SRV URIs
  // already imply tls=true, but a misconfigured override in the URI
  // string would otherwise downgrade silently.
  tls: true,
  tlsAllowInvalidCertificates: false,
  tlsAllowInvalidHostnames: false,
  // Wire compression cuts ~30-50% bandwidth on aggregation reads.
  compressors: ["zlib" as const],
};

declare global {
  // Cache the connect() promise across dev HMR reloads.
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  // Lazy connect so `next build` doesn't open a TCP socket to a build-time
  // placeholder URI.
  if (env.NODE_ENV === "development") {
    globalThis._mongoClientPromise ??= new MongoClient(
      env.MONGODB_URI,
      options,
    ).connect();
    return globalThis._mongoClientPromise;
  }
  // Prod: module-scope singleton per warm Lambda/container.
  if (!_prodClientPromise) {
    _prodClientPromise = new MongoClient(env.MONGODB_URI, options).connect();
  }
  return _prodClientPromise;
}

let _prodClientPromise: Promise<MongoClient> | undefined;

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(env.MONGODB_DB);
}
