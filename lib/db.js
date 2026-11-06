import mongoose from "mongoose";

const globalWithMongoose = globalThis;
const cached = globalWithMongoose.mongoose ?? {
  connection: null,
  promise: null,
};

if (!globalWithMongoose.mongoose) {
  globalWithMongoose.mongoose = cached;
}

export async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("Missing required environment variable: MONGODB_URI");
  }

  if (cached.connection?.connection.readyState === 1) {
    return cached.connection;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, { bufferCommands: false })
      .then((instance) => instance)
      .catch((error) => {
        cached.promise = null;
        throw new Error("Unable to connect to MongoDB.", { cause: error });
      });
  }

  try {
    cached.connection = await cached.promise;
    return cached.connection;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
}
