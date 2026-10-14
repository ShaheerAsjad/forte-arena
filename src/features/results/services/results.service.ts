import {
  ResultsRepository,
  type PublishedResultEvent,
  type EventWithResults,
  type SpotlightWinner,
} from "../repositories/results.repository";

export class ResultsService {
  static async getPublishedResultsEvents(): Promise<PublishedResultEvent[]> {
    return ResultsRepository.getPublishedResultsEvents();
  }

  static async getEventResults(slug: string): Promise<EventWithResults | null> {
    return ResultsRepository.getEventResults(slug);
  }

  static async getRecentSpotlightWinners(limit = 3): Promise<SpotlightWinner[]> {
    return ResultsRepository.getRecentSpotlightWinners(limit);
  }
}
