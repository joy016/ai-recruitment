import { api } from "@/lib/api-client";
import BackendServer from "@/constant/server-address";
import {
  GetNotificationsParams,
  NotificationItem,
  NotificationPreference,
  NotificationPreferenceUpdate,
  PagedNotifications,
} from "../types/notification";

const NOTIFICATIONS_ENDPOINT = `${BackendServer}/api/notifications`;

type RawRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is RawRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const pickArray = <T>(raw: unknown, keys: string[]): T[] => {
  if (Array.isArray(raw)) return raw as T[];
  if (!isRecord(raw)) return [];
  for (const key of keys) {
    if (Array.isArray(raw[key])) return raw[key] as T[];
  }
  return [];
};

const pickNumber = (raw: unknown, keys: string[]): number | undefined => {
  if (typeof raw === "number") return raw;
  if (!isRecord(raw)) return undefined;
  for (const key of keys) {
    if (typeof raw[key] === "number") return raw[key] as number;
  }
  return undefined;
};

// TODO(verify): the paged list's field names weren't confirmed against the
// backend DTO. This accepts the shapes other list endpoints here use
// ({ data, totalCount } / { items, totalCount }); once confirmed, narrow it.
const toPagedNotifications = (raw: unknown): PagedNotifications => {
  const items = pickArray<NotificationItem>(raw, ["items", "data", "notifications"]);
  return {
    items,
    totalCount: pickNumber(raw, ["totalCount", "total", "count"]) ?? items.length,
  };
};

export const getNotifications = async ({
  page,
  pageSize,
  unreadOnly = false,
}: GetNotificationsParams): Promise<PagedNotifications> => {
  const raw = await api.get<unknown>(NOTIFICATIONS_ENDPOINT, {
    params: { page, pageSize, unreadOnly },
  });
  return toPagedNotifications(raw);
};

export const getUnreadNotificationCount = async (): Promise<number> => {
  const raw = await api.get<unknown>(`${NOTIFICATIONS_ENDPOINT}/unread-count`);
  return pickNumber(raw, ["unreadCount", "count"]) ?? 0;
};

export const markNotificationRead = async (id: string): Promise<void> => {
  await api.patch(`${NOTIFICATIONS_ENDPOINT}/${encodeURIComponent(id)}/read`);
};

export const markAllNotificationsRead = async (): Promise<void> => {
  await api.post(`${NOTIFICATIONS_ENDPOINT}/read-all`);
};

export const getNotificationPreferences = async (): Promise<
  NotificationPreference[]
> => {
  const raw = await api.get<unknown>(`${NOTIFICATIONS_ENDPOINT}/preferences`);
  return pickArray<NotificationPreference>(raw, ["preferences", "data", "items"]);
};

export const updateNotificationPreferences = async (
  updates: NotificationPreferenceUpdate[],
): Promise<NotificationPreference[]> => {
  const raw = await api.put<unknown, NotificationPreferenceUpdate[]>(
    `${NOTIFICATIONS_ENDPOINT}/preferences`,
    updates,
  );
  return pickArray<NotificationPreference>(raw, ["preferences", "data", "items"]);
};
