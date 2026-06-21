// For the Electron build, OS delegates to the Electron iOS implementation,
// which handles window.tablet (set by electronClient.js) directly.
export { default } from './iOS';
