const DEVELOPMENT_DATABASE_NAME = "fitness_subscription_dev";

export function getDevelopmentMongoUri({
  developmentUri = process.env.MONGODB_DEV_URI,
  applicationUri = process.env.MONGODB_URI,
} = {}) {
  let uri = developmentUri;
  if (!uri && applicationUri) {
    const parts = applicationUri.match(
      /^(mongodb(?:\+srv)?:\/\/[^/]+)(?:\/[^?]*)?(\?.*)?$/i,
    );
    if (parts) {
      uri = `${parts[1]}/${DEVELOPMENT_DATABASE_NAME}${parts[2] ?? ""}`;
    }
  }

  const database = uri?.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^/?]+)/i)?.[1];
  if (!database || decodeURIComponent(database) !== DEVELOPMENT_DATABASE_NAME) {
    throw new Error(
      "Provide a MongoDB URI for the separate fitness_subscription_dev database.",
    );
  }

  return uri;
}
