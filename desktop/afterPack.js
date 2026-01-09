/**
 * afterPack Hook
 *
 * Fixes PyInstaller backend signing issues before electron-builder signs the app.
 * PyInstaller bundles include Python.framework and many shared libraries that
 * need to be signed for notarization.
 *
 * Strategy:
 * 1. Find all Mach-O binaries (executables, dylibs, .so files)
 * 2. Sign each one with hardened runtime and timestamp
 * 3. Sign any frameworks/bundles after their contents
 * 4. Don't verify strictly since PyInstaller's Python.framework is non-standard
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Recursively find all files matching a predicate
 */
function findFiles(dir, predicate, results = []) {
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // Skip symlinks to avoid signing the same file multiple times
    if (entry.isSymbolicLink()) continue;

    if (entry.isDirectory()) {
      findFiles(fullPath, predicate, results);
    } else if (predicate(entry.name, fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Check if a file is a Mach-O binary
 */
function isMachO(filePath) {
  try {
    const result = execSync(`file "${filePath}"`, { encoding: 'utf-8' });
    return result.includes('Mach-O');
  } catch {
    return false;
  }
}

/**
 * Sign a single file
 */
function signFile(filePath, identity, isFramework = false) {
  const flags = isFramework ? '--deep --no-strict' : '';
  const cmd = `codesign --sign "${identity}" --force --timestamp --options runtime ${flags} "${filePath}"`;
  execSync(cmd, { stdio: 'inherit' });
}

exports.default = async function (context) {
  const { electronPlatformName, appOutDir } = context;

  // Only needed for macOS
  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const backendDir = path.join(
    appOutDir,
    `${appName}.app`,
    'Contents',
    'Resources',
    'backend'
  );

  if (!fs.existsSync(backendDir)) {
    console.log('No backend directory found, skipping pre-sign');
    return;
  }

  // Get the signing identity from environment or find it
  let identity = process.env.CSC_NAME;

  if (!identity) {
    try {
      const result = execSync(
        'security find-identity -v -p codesigning | grep "Developer ID Application" | head -1 | sed \'s/.*"\\(.*\\)".*/\\1/\''
      ).toString().trim();
      if (result) {
        identity = result;
      }
    } catch {
      console.log('Could not find signing identity, skipping pre-sign');
      return;
    }
  }

  if (!identity) {
    console.log('No signing identity available, skipping pre-sign');
    return;
  }

  console.log('Pre-signing PyInstaller backend binaries...');
  console.log(`  Identity: ${identity}`);
  console.log(`  Backend: ${backendDir}`);

  try {
    // Step 1: Find and sign all Mach-O binaries (dylibs, .so files, executables)
    // These need to be signed before any containing bundles
    const binaries = findFiles(backendDir, (name, fullPath) => {
      // Match common binary extensions
      if (name.endsWith('.dylib') || name.endsWith('.so')) return true;
      // Check executables (no extension but are Mach-O)
      if (!name.includes('.') && isMachO(fullPath)) return true;
      return false;
    });

    console.log(`  Found ${binaries.length} binaries to sign`);

    // Sign binaries (deepest first by sorting by path depth)
    binaries.sort((a, b) => b.split('/').length - a.split('/').length);

    for (const binary of binaries) {
      const relativePath = path.relative(backendDir, binary);
      console.log(`  Signing: ${relativePath}`);
      try {
        signFile(binary, identity);
      } catch (e) {
        console.log(`    Warning: Failed to sign ${relativePath}: ${e.message}`);
      }
    }

    // Step 2: Sign Python.framework if it exists (with --deep --no-strict)
    const pythonFramework = path.join(backendDir, '_internal', 'Python.framework');
    if (fs.existsSync(pythonFramework)) {
      console.log('  Signing Python.framework (with --deep --no-strict)');
      try {
        signFile(pythonFramework, identity, true);
      } catch (e) {
        console.log(`    Warning: Framework signing issue: ${e.message}`);
      }
    }

    // Step 3: Sign the main backend executable
    const mainExecutable = path.join(backendDir, 'eclosion-backend');
    if (fs.existsSync(mainExecutable)) {
      console.log('  Signing main executable: eclosion-backend');
      signFile(mainExecutable, identity);
    }

    console.log('Pre-signing complete');
  } catch (error) {
    console.error('Pre-signing failed:', error.message);
    // Don't throw - let electron-builder continue
  }
};
