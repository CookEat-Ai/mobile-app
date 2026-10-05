// Disabled for Store delivery; retained as reference for future admin access.
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { sha256 } from '@noble/hashes/sha256';
// import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';
// import { REVIEWER_CODE_HASH, REVIEWER_ACCESS_EXPIRES_AT } from '../config/reviewerAccess';
//
// const STORAGE_KEY = 'app_review_access_hash';
// export async function activateReviewerAccess(code: string): Promise<boolean> {
//   if (Date.now() >= REVIEWER_ACCESS_EXPIRES_AT) return false;
//   const hash = bytesToHex(sha256(utf8ToBytes(code.trim())));
//   if (!REVIEWER_CODE_HASH || hash !== REVIEWER_CODE_HASH) return false;
//   await AsyncStorage.setItem(STORAGE_KEY, hash);
//   return true;
// }
// export async function hasReviewerAccess(): Promise<boolean> {
//   return Boolean(REVIEWER_CODE_HASH) && Date.now() < REVIEWER_ACCESS_EXPIRES_AT
//     && await AsyncStorage.getItem(STORAGE_KEY) === REVIEWER_CODE_HASH;
// }

// Fail closed even if a future caller imports this service by mistake.
export async function activateReviewerAccess(_code: string): Promise<boolean> {
  return false;
}
export async function hasReviewerAccess(): Promise<boolean> {
  return false;
}
