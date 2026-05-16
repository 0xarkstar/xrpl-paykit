// In-memory order + event store.
// Stashed on globalThis so Next.js dev route handlers share state across module instances / HMR.

export type OrderState =
  | "locked"
  | "checkout_created"
  | "waiting_for_payment"
  | "paid"
  | "unlocked"
  | "failed"
  | "expired"
  | "requires_review";

interface Order {
  id: string;
  resourceId: string;
  intentId?: string;
  txHash?: string;
  state: OrderState;
  updatedAt: number;
}

export interface OrderEvent {
  id: number;
  type: string;
  message: string;
  txHash?: string;
  timestamp: number;
}

interface EventStore {
  events: OrderEvent[];
  counter: number;
}

const ORDERS_KEY = "__demo_merchant_orders__";
const EVENTS_KEY = "__demo_merchant_events__";
const g = globalThis as any;
if (!g[ORDERS_KEY]) g[ORDERS_KEY] = new Map<string, Order>();
if (!g[EVENTS_KEY]) g[EVENTS_KEY] = { events: [], counter: 0 } as EventStore;
const orders: Map<string, Order> = g[ORDERS_KEY];
const eventStore: EventStore = g[EVENTS_KEY];
const events = eventStore.events;

export function appendEvent(type: string, message: string, txHash?: string) {
  events.push({
    id: ++eventStore.counter,
    type,
    message,
    txHash,
    timestamp: Date.now(),
  });
}

export function getEvents(): OrderEvent[] {
  return events.slice();
}

export function getOrCreateOrder(orderId: string, resourceId: string): Order {
  let order = orders.get(orderId);
  if (!order) {
    order = { id: orderId, resourceId, state: "locked", updatedAt: Date.now() };
    orders.set(orderId, order);
  }
  return order;
}

export function setOrderState(orderId: string, patch: Partial<Order>) {
  const existing = orders.get(orderId);
  if (!existing) return;
  Object.assign(existing, patch, { updatedAt: Date.now() });
}

export function getOrder(orderId: string) {
  return orders.get(orderId);
}

export function resetAll() {
  orders.clear();
  events.length = 0;
  eventStore.counter = 0;
}
