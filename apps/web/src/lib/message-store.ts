import type { Message } from './types';

/**
 * Pure message store logic (PRD §33): duplicate realtime events are a no-op,
 * ordering follows createdAt then id.
 */
export function appendMessage(messages: Message[], incoming: Message): Message[] {
  if (messages.some((message) => message.id === incoming.id)) {
    return messages;
  }
  return [...messages, incoming];
}

export function updateMessage(messages: Message[], incoming: Message): Message[] {
  return messages.map((message) => (message.id === incoming.id ? incoming : message));
}

export function deleteMessage(messages: Message[], messageId: string): Message[] {
  return messages.filter((message) => message.id !== messageId);
}

/** Merges a fetched page on top of realtime arrivals without duplicates. */
export function mergePage(messages: Message[], page: Message[]): Message[] {
  const byId = new Map(messages.map((message) => [message.id, message]));
  for (const message of page) {
    if (!byId.has(message.id)) {
      byId.set(message.id, message);
    }
  }
  return [...byId.values()].sort(sortByCreated);
}

function sortByCreated(a: Message, b: Message): number {
  const time = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  return time !== 0 ? time : a.id.localeCompare(b.id);
}
