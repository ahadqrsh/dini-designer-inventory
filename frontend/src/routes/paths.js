/**
 * Single source of truth for where each role lands after authentication.
 * Used by the login page's guest guard, the protected-route guard, and the
 * catch-all redirect, so they can never disagree with each other.
 */

export const LOGIN_PATH = '/';

export const isAdminRole = (role) => role?.toLowerCase() === 'admin';

export const panelPathFor = (role) => (isAdminRole(role) ? '/admin/orders' : '/my-tasks');
