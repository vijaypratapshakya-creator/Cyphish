/**
 * Resolves and formats MongoDB connection string with automatic credential URL-encoding.
 * Handles passwords containing special characters (e.g., '@', '#', '%', ':', '/') seamlessly.
 */
export function getMongoUri() {
  const user = process.env.MONGO_APP_USERNAME || process.env.MONGO_USER;
  const pass = process.env.MONGO_APP_PASSWORD || process.env.MONGO_PASSWORD;
  const host = process.env.MONGO_HOST || 'mongodb';
  const port = process.env.MONGO_PORT || '27017';
  const dbName = process.env.MONGO_DATABASE || 'cyphish';
  const authSource = process.env.MONGO_AUTH_SOURCE || dbName;

  // 1. If discrete credentials and host are provided, build sanitized URI
  if (user && pass) {
    const encodedUser = encodeURIComponent(user);
    const encodedPass = encodeURIComponent(pass);
    return `mongodb://${encodedUser}:${encodedPass}@${host}:${port}/${dbName}?authSource=${authSource}`;
  }

  // 2. If DB_URL is explicitly set in env, parse and sanitize if needed
  const rawDbUrl = process.env.DB_URL;
  if (!rawDbUrl) {
    return `mongodb://${host}:${port}/${dbName}`;
  }

  // If DB_URL has multiple '@' characters (e.g. password contains '@' unencoded), repair it
  try {
    const prefixMatch = rawDbUrl.match(/^(mongodb(?:\+srv)?:\/\/)(.*)$/);
    if (!prefixMatch) return rawDbUrl;

    const scheme = prefixMatch[1];
    const rest = prefixMatch[2];

    // Find the last '@' which separates credentials from host
    const lastAtIndex = rest.lastIndexOf('@');
    if (lastAtIndex === -1) {
      return rawDbUrl; // No credentials in URI
    }

    const credsPart = rest.substring(0, lastAtIndex);
    const hostAndDbPart = rest.substring(lastAtIndex + 1);

    const firstColonIndex = credsPart.indexOf(':');
    if (firstColonIndex === -1) {
      // Username only
      const decodedUser = decodeURIComponent(credsPart);
      return `${scheme}${encodeURIComponent(decodedUser)}@${hostAndDbPart}`;
    }

    const rawUser = credsPart.substring(0, firstColonIndex);
    const rawPass = credsPart.substring(firstColonIndex + 1);

    // Decode first in case parts were partially encoded, then safely encode
    const safeUser = encodeURIComponent(decodeURIComponent(rawUser));
    const safePass = encodeURIComponent(decodeURIComponent(rawPass));

    return `${scheme}${safeUser}:${safePass}@${hostAndDbPart}`;
  } catch (error) {
    console.warn('Could not auto-sanitize DB_URL, using original:', error.message);
    return rawDbUrl;
  }
}
