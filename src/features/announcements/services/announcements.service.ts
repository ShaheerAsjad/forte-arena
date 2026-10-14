import {
  AnnouncementsRepository,
  type AnnouncementItem,
} from "../repositories/announcements.repository";

export class AnnouncementsService {
  static async getLatestAnnouncements(limit = 4): Promise<AnnouncementItem[]> {
    return AnnouncementsRepository.getLatestAnnouncements(limit);
  }
}
