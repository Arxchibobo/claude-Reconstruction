/**
 * Suppress Node.js deprecation warnings
 *
 * This file should be imported at the top of each serverless function entry point.
 * It suppresses the DEP0169 warning from url.parse() which is used by dependencies.
 */

// Suppress the specific DEP0169 deprecation warning
const originalEmitWarning = process.emitWarning;
process.emitWarning = function (warning, ...args) {
  if (
    typeof warning === 'string' &&
    (warning.includes('DEP0169') || warning.includes('url.parse()'))
  ) {
    // Suppress url.parse() deprecation warning
    return;
  }
  return originalEmitWarning.call(this, warning, ...args);
};
