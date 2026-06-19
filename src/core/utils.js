const fs = require('fs-extra');

/**
 * Shared file system utility methods
 */
class FileUtils {
  /**
   * Check if a file exists at the given path
   * @param {string} filePath - Absolute path to check
   * @returns {Promise<boolean>} True if file exists
   */
  static async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = FileUtils;
