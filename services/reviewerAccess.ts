import apiService from './api';
import { enablePresentationModeByDefault } from './presentationMode';
async function applyPresentationDefault(active: boolean): Promise<boolean> {
  if (active) await enablePresentationModeByDefault().catch(() => undefined);
  return active;
}
// Access belongs to the authenticated installation and is checked by the server.
export async function activateReviewerAccess(code: string): Promise<boolean> {
  const result = await apiService.activateAdminAccess(code.trim());
  return applyPresentationDefault(result.data?.active === true);
}
export async function hasReviewerAccess(): Promise<boolean> {
  try {
    const result = await apiService.getAdminAccess();
    return applyPresentationDefault(result.data?.active === true);
  } catch { return false; }
}
