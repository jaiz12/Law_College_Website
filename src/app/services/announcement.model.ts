/** One row of Law_College_API's /api/Announcements (active) or
 *  /api/Announcements/ArchiveNewsAndEvents (archived). */
export interface Announcement {
  id: number;
  title: string;
  category: string;
  urgent: boolean;
  startDate: string | null;
  endDate: string | null;
  /** Absolute URL of the attached file, if any. */
  fileUrl: string | null;
}

export interface AnnouncementTag {
  text: string;
  kind: string;
}

/** Cycled onto each announcement's category tag by list position. */
const CATEGORY_TAG_KINDS = ['blue', 'green', 'purple', 'orange'];

export function announcementTags(item: Announcement, index: number): AnnouncementTag[] {
  const tags: AnnouncementTag[] = [];
  if (item.category) {
    tags.push({ text: item.category, kind: CATEGORY_TAG_KINDS[index % CATEGORY_TAG_KINDS.length] });
  }
  if (item.urgent) {
    tags.push({ text: 'Urgent', kind: 'red' });
  }
  return tags;
}

export function mapAnnouncement(item: any, imageBaseUrl: string): Announcement {
  const filePath: string | null = item.filePath ?? item.FilePath ?? null;
  return {
    id: item.id ?? item.Id ?? 0,
    title: item.title ?? item.Title ?? '',
    category: item.category ?? item.Category ?? '',
    urgent: item.urgent ?? item.Urgent ?? false,
    startDate: item.startDate ?? item.StartDate ?? null,
    endDate: item.endDate ?? item.EndDate ?? null,
    fileUrl: filePath ? imageBaseUrl + filePath : null
  };
}
