export type Slot<T extends unknown[]> = (...args: T) => void;

export class Connection<T extends unknown[]> {
  private connected = true;

  constructor(
    private signal: Signal<T>,
    private slot: Slot<T>,
  ) {}

  disconnect(): void {
    if (!this.connected) return;

    this.connected = false;
    this.signal.disconnect(this.slot);
  }

  get isConnected(): boolean {
    return this.connected;
  }
}

export class Signal<T extends unknown[]> {
  private listeners = new Set<Slot<T>>();

  connect(slot: Slot<T>): Connection<T> {
    this.listeners.add(slot);
    return new Connection(this, slot);
  }

  disconnect(slot: Slot<T>): void {
    this.listeners.delete(slot);
  }

  emit(...args: T): void {
    // Snapshot in case listeners are added/removed while emitting
    for (const listener of [...this.listeners]) {
      listener(...args);
    }
  }

  clear(): void {
    this.listeners.clear();
  }

  get listenerCount(): number {
    return this.listeners.size;
  }
}
