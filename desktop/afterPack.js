/**
 * afterPack Hook
 *
 * Signs PyInstaller backend binaries BEFORE electron-builder signs the app.
 * PyInstaller's Python.framework is non-standard and requires --no-strict.
 *
 * Strategy:
 * 1. Sign all .so and .dylib files in _internal (excluding Python.framework)
 * 2. For Python.framework:
 *    a. Remove _CodeSignature directory (has stale metadata without timestamps)
 *    b. Sign ALL binaries inside (Python binary, dylibs in lib/) from inside out
 *    c. Sign the framework bundle (creates fresh _CodeSignature)
 *    d. Verify the signatures are valid
 * 3. Sign the main eclosion-backend executable
 *
 * electron-builder will then sign Electron.framework and the main app.
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
 * Remove any existing signature from a file
 * @param {string} filePath - Path to file
 */
function removeSignature(filePath) {
  try {
    execSync(`codesign --remove-signature "${filePath}"`, { stdio: 'pipe' });
  } catch {
    // Ignore errors - file might not have a signature
  }
}

/**
 * Verify a signature and return the result
 * @param {string} filePath - Path to file
 * @returns {object} - { valid: boolean, output: string }
 */
function verifySignature(filePath) {
  try {
    const output = execSync(`codesign -vvv --deep --strict "${filePath}" 2>&1`, { encoding: 'utf-8' });
    return { valid: true, output };
  } catch (e) {
    return { valid: false, output: e.stdout || e.stderr || e.message };
  }
}

/**
 * Sign a single file with the given flags
 * @param {string} filePath - Path to file
 * @param {string} identity - Signing identity
 * @param {string} entitlementsPath - Path to entitlements plist
 * @param {boolean} useNoStrict - Whether to use --no-strict flag
 * @param {boolean} useDeep - Whether to use --deep flag for recursive signing
 */
function signFile(filePath, identity, entitlementsPath, useNoStrict = false, useDeep = false) {
  const noStrictFlag = useNoStrict ? '--no-strict' : '';
  const deepFlag = useDeep ? '--deep' : '';
  const entitlementsFlag = entitlementsPath ? `--entitlements "${entitlementsPath}"` : '';

  const cmd = `codesign --sign "${identity}" --force --timestamp --options runtime ${deepFlag} ${noStrictFlag} ${entitlementsFlag} "${filePath}"`;

  execSync(cmd, { stdio: 'inherit' });
}

exports.default = async function (context) {
  const { electronPlatformName, appOutDir } = context;

  // Only needed for macOS
  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appDir = path.join(appOutDir, `${appName}.app`);
  const backendDir = path.join(appDir, 'Contents', 'Resources', 'backend');
  const entitlementsPath = path.join(__dirname, 'entitlements.mac.plist');

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
  console.log(`  Entitlements: ${entitlementsPath}`);

  try {
    // Step 1: Find all .so and .dylib files in _internal (excluding Python.framework)
    const internalDir = path.join(backendDir, '_internal');
    const pythonFrameworkPath = path.join(internalDir, 'Python.framework');

    const binaries = findFiles(internalDir, (name, fullPath) => {
      // Skip anything inside Python.framework - we'll sign it as a bundle
      if (fullPath.includes('Python.framework')) return false;

      if (name.endsWith('.dylib') || name.endsWith('.so')) return true;
      // Check executables (no extension but are Mach-O)
      if (!name.includes('.') && isMachO(fullPath)) return true;
      return false;
    });

    console.log(`  Found ${binaries.length} binaries to sign in _internal`);

    // Sign binaries (deepest first by sorting by path depth)
    binaries.sort((a, b) => b.split('/').length - a.split('/').length);

    for (const binary of binaries) {
      const relativePath = path.relative(backendDir, binary);
      console.log(`  Signing: ${relativePath}`);
      try {
        signFile(binary, identity, entitlementsPath, true); // --no-strict for PyInstaller binaries
      } catch (e) {
        console.log(`    Warning: Failed to sign ${relativePath}: ${e.message}`);
      }
    }

    // Step 2: Sign Python.framework
    // PyInstaller's Python.framework has pre-existing signatures without timestamps.
    // We must: 1) remove stale signatures, 2) sign all binaries inside-out, 3) sign bundle
    if (fs.existsSync(pythonFrameworkPath)) {
      console.log('  Signing Python.framework...');

      // Step 2a: Remove the framework's _CodeSignature directory
      // It contains stale metadata with bad timestamps that can't be updated
      const codeSignatureDir = path.join(pythonFrameworkPath, '_CodeSignature');
      if (fs.existsSync(codeSignatureDir)) {
        console.log('    Removing _CodeSignature directory');
        fs.rmSync(codeSignatureDir, { recursive: true, force: true });
      }

      // Step 2b: Find ALL binaries inside Python.framework (not just the Python executable)
      const frameworkBinaries = findFiles(pythonFrameworkPath, (name, fullPath) => {
        if (name.endsWith('.dylib') || name.endsWith('.so')) return true;
        // The Python executable itself
        if (name === 'Python' && isMachO(fullPath)) return true;
        return false;
      });

      console.log(`    Found ${frameworkBinaries.length} binaries inside Python.framework`);

      // Sort by depth (deepest first = inside-out signing)
      frameworkBinaries.sort((a, b) => b.split('/').length - a.split('/').length);

      // Remove signatures from all binaries first
      console.log('    Removing all existing signatures...');
      for (const binary of frameworkBinaries) {
        removeSignature(binary);
      }

      // Sign all binaries inside-out
      console.log('    Signing all binaries inside Python.framework...');
      for (const binary of frameworkBinaries) {
        const relativePath = path.relative(pythonFrameworkPath, binary);
        console.log(`      Signing: ${relativePath}`);
        try {
          signFile(binary, identity, entitlementsPath, true); // --no-strict
        } catch (e) {
          console.log(`        Warning: Failed to sign ${relativePath}: ${e.message}`);
        }
      }

      // Step 2c: Sign the framework bundle to create _CodeSignature
      // This seals all the files and creates proper metadata for symlinks
      console.log('    Signing Python.framework bundle');
      try {
        signFile(pythonFrameworkPath, identity, entitlementsPath, true); // --no-strict
      } catch (e) {
        console.log(`      Warning: Failed to sign Python.framework bundle: ${e.message}`);
      }

      // Step 2d: Verify the signatures
      console.log('    Verifying Python.framework signatures...');
      const pythonBinaryPath = path.join(pythonFrameworkPath, 'Versions', '3.12', 'Python');
      if (fs.existsSync(pythonBinaryPath)) {
        const binaryResult = verifySignature(pythonBinaryPath);
        console.log(`      Versions/3.12/Python: ${binaryResult.valid ? 'VALID' : 'INVALID'}`);
        if (!binaryResult.valid) {
          console.log(`        ${binaryResult.output}`);
        }
      }
      const frameworkResult = verifySignature(pythonFrameworkPath);
      console.log(`      Python.framework: ${frameworkResult.valid ? 'VALID' : 'INVALID'}`);
      if (!frameworkResult.valid) {
        console.log(`        ${frameworkResult.output}`);
      }
    }

    // Step 3: Sign the main backend executable
    const mainExecutable = path.join(backendDir, 'eclosion-backend');
    if (fs.existsSync(mainExecutable)) {
      console.log('  Signing main executable: eclosion-backend');
      try {
        signFile(mainExecutable, identity, entitlementsPath, true);
      } catch (e) {
        console.log(`    Warning: Failed to sign eclosion-backend: ${e.message}`);
      }
    }

    console.log('Pre-signing complete');
  } catch (error) {
    console.error('Pre-signing failed:', error.message);
    throw error; // Fail the build if pre-signing fails
  }
};
