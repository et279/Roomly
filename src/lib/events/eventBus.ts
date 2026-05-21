import type { EventType, AppEvent, AppEventPayloadMap } from "./event.types";

type EventHandler<T extends EventType> = (event: AppEvent<T>) => void | Promise<void>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handlers = new Map<EventType, EventHandler<any>[]>();

export const eventBus = {
  on<T extends EventType>(type: T, handler: EventHandler<T>): void {
    if (!handlers.has(type)) handlers.set(type, []);
    handlers.get(type)!.push(handler);
  },

  off<T extends EventType>(type: T, handler: EventHandler<T>): void {
    const h = handlers.get(type);
    if (!h) return;
    handlers.set(
      type,
      h.filter((fn) => fn !== handler),
    );
  },

  async emit<T extends EventType>(type: T, payload: AppEventPayloadMap[T]): Promise<void> {
    const event: AppEvent<T> = { type, payload, timestamp: new Date().toISOString() };
    const h = handlers.get(type) ?? [];
    await Promise.all(h.map((fn) => fn(event)));
  },
};
