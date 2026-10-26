import { collection, collectionGroup, doc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const SUPPORT_COLLECTIONS = new Set(["supportEvents", "exchangePosts"]);

function assertSupportCollection(collectionName) {
  if (!SUPPORT_COLLECTIONS.has(collectionName)) {
    throw new Error(`Unsupported support collection: ${collectionName}`);
  }
}

// Firestore documents must alternate with collections. Support data is kept in
// its own sibling collection, separate from the concert documents:
// .../data/supportData/{concertId}/{collectionName}/{postId}.
export function getConcertSupportCollection(db, appId, concertId, collectionName) {
  assertSupportCollection(collectionName);
  return collection(db, "artifacts", appId, "public", "data", "supportData", concertId, collectionName);
}

export function getConcertSupportDoc(db, appId, concertId, collectionName, postId) {
  assertSupportCollection(collectionName);
  return doc(db, "artifacts", appId, "public", "data", "supportData", concertId, collectionName, postId);
}

export function getSupportCollectionGroup(db, collectionName) {
  assertSupportCollection(collectionName);
  return collectionGroup(db, collectionName);
}
