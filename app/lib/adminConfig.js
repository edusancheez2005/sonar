/**
 * Admin Configuration
 * 
 * Centralized admin access control.
 * Only emails listed here can access admin routes and features.
 */

export const ADMIN_EMAILS = [
  'eduardo@sonartracker.io',
  'edusancheez2005@gmail.com'
]

/**
 * Check if an email has admin access
 * @param {string} email - Email to check
 * @returns {boolean} - True if email is an admin
 */
export function isAdmin(email) {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase().trim())
}

/**
 * Throw error if user is not admin
 * @param {string} email - Email to check
 * @throws {Error} - If not admin
 */
export function requireAdmin(email) {
  if (!isAdmin(email)) {
    throw new Error('Forbidden - Admin access only')
  }
}

