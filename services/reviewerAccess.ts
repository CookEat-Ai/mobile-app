import apiService from './api';
// Access belongs to the authenticated installation and is checked by the server.
export async function activateReviewerAccess(code: string): Promise<boolean> {
  const result = await apiService.activateAdminAccess(code.trim());
  return result.data?.active === true;
}
export async function hasReviewerAccess(): Promise<boolean> {
  try {
    const result = await apiService.getAdminAccess();
    return result.data?.active === true;
  } catch { return false; }
}
