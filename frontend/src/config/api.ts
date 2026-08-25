/**
 * api.ts — single source of truth for the backend API origin.
 *
 * Every screen / hook / context imports API_ORIGIN instead of hardcoding the
 * local dev URL, so the backend target lives in ONE place.
 *
 * Resolution:
 *   - Dev (expo start, __DEV__ === true)   -> local Express server.
 *   - Production / standalone builds       -> deployed backend via CloudFront.
 *
 * __DEV__ is a React Native global (typed via @types/react-native): true in dev
 * bundles, false in published/standalone builds. So the target flips
 * automatically per build type — no manual flag to remember.
 *
 * To force a specific origin (e.g. point a physical device at your dev
 * machine's LAN IP, or test the prod backend from a dev build), change this one
 * line. Keeping that override here means the rest of the app never hardcodes a
 * URL.
 */
export const API_ORIGIN = __DEV__
  ? 'http://localhost:3000'
  : 'https://d1ptdtremi31ja.cloudfront.net';