// In-memory event hub
type Event = { type: string, payload?: any };
type Subscriber = (event: Event) => void;

const channels = new Map<string, Set<Subscriber>>();

export function subscribe(channel: string, callback: Subscriber) {
  if (!channels.has(channel)) {
    channels.set(channel, new Set());
  }
  channels.get(channel)!.add(callback);
  return () => {
    channels.get(channel)?.delete(callback);
    if (channels.get(channel)?.size === 0) {
      channels.delete(channel);
    }
  };
}

export function publish(channel: string, event: Event) {
  const subscribers = channels.get(channel);
  if (subscribers) {
    for (const sub of subscribers) {
      try {
        sub(event);
      } catch (e) {
        // Ignore subscriber errors
      }
    }
  }
}
