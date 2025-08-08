import { getOrganizationRole } from '@/lib/repositories/user-repository';
import { getOrganizationAiSettings, updateOrganizationAiSettings, UpdateAiSettingsPayload, AiSettings } from '@/lib/repositories';
import { badRequest, forbidden } from '@/lib/api-errors';

export class AiSettingsService {
  static async get(userId: string, organizationId: number): Promise<AiSettings> {
    const role = await getOrganizationRole(userId, organizationId);
    if (!role || (role !== 'admin' && role !== 'owner')) {
      throw forbidden('User does not have permission to view AI settings for this organization');
    }
    return getOrganizationAiSettings(organizationId);
  }

  static async update(userId: string, organizationId: number, payload: UpdateAiSettingsPayload) {
    const role = await getOrganizationRole(userId, organizationId);
    if (!role || (role !== 'admin' && role !== 'owner')) {
      throw forbidden('User does not have permission to update AI settings for this organization');
    }

    if (payload.categoryThreshold !== undefined) {
      const v = payload.categoryThreshold;
      if (typeof v !== 'number' || v < 0 || v > 100) {
        throw badRequest('categoryThreshold must be a number between 0 and 100');
      }
    }

    await updateOrganizationAiSettings(organizationId, payload);
    return { success: true } as const;
  }
}

