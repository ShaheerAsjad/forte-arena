import {
  AnnouncementsRepository,
  type PublicAnnouncementItem,
  type AdminAnnouncementItem,
} from "../repositories/announcements.repository";

export class AnnouncementsService {
  static async getLatestAnnouncements(limit = 4): Promise<PublicAnnouncementItem[]> {
    return AnnouncementsRepository.getLatestAnnouncements(limit);
  }

  static async getPublicAnnouncements({
    page = 1,
    pageSize = 9,
  }: {
    page?: number;
    pageSize?: number;
  }) {
    return AnnouncementsRepository.getPublicAnnouncements({ page, pageSize });
  }

  static async getAnnouncementsForEvent(
    eventId: string
  ): Promise<PublicAnnouncementItem[]> {
    return AnnouncementsRepository.getAnnouncementsForEvent(eventId);
  }

  static async getAllAnnouncementsAdmin(): Promise<AdminAnnouncementItem[]> {
    return AnnouncementsRepository.getAllAnnouncementsAdmin();
  }
}
