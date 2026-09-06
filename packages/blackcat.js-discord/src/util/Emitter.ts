import { EventEmitter } from "node:events";

type Listener<T> =
    [T] extends [void]
        ? () => void | Promise<void>
        : (payload: T) => void | Promise<void>;

export class Emitter<Events extends object> {
    private readonly emitter = new EventEmitter({
        captureRejections: true,
    });

    /**
     * Listen for an event.
     */
    public on<K extends keyof Events>(
        event: K,
        listener: Listener<Events[K]>,
    ): this {
        this.emitter.on(event as string | symbol, listener as (...args: any[]) => void);
        return this;
    }

    /**
     * Listen for an event once.
     */
    public once<K extends keyof Events>(
        event: K,
        listener: Listener<Events[K]>,
    ): this {
        this.emitter.once(event as string | symbol, listener as (...args: any[]) => void);
        return this;
    }

    /**
     * Remove an event listener.
     */
    public off<K extends keyof Events>(
        event: K,
        listener: Listener<Events[K]>,
    ): this {
        this.emitter.off(event as string | symbol, listener as (...args: any[]) => void);
        return this;
    }

    /**
     * Emit an event.
     */
    public emit<K extends keyof Events>(
        event: K,
        ...args: [Events[K]] extends [void] ? [] : [payload: Events[K]]
    ): boolean {
        return this.emitter.emit(event as string | symbol, ...args);
    }

    /**
     * Remove all listeners.
     */
    public removeAllListeners<K extends keyof Events>(event?: K): this {
        this.emitter.removeAllListeners(event as string | symbol);
        return this;
    }

    /**
     * Get listener count.
     */
    public listenerCount<K extends keyof Events>(event: K): number {
        return this.emitter.listenerCount(event as string | symbol);
    }

    /**
     * Get registered event names.
     */
    public eventNames(): (keyof Events)[] {
        return this.emitter.eventNames() as (keyof Events)[];
    }

    /**
     * Register a prepend listener.
     */
    public prependListener<K extends keyof Events>(
        event: K,
        listener: Listener<Events[K]>,
    ): this {
        this.emitter.prependListener(event as string | symbol, listener as (...args: any[]) => void);
        return this;
    }

    /**
     * Register a prepend once listener.
     */
    public prependOnceListener<K extends keyof Events>(
        event: K,
        listener: Listener<Events[K]>,
    ): this {
        this.emitter.prependOnceListener(event as string | symbol, listener as (...args: any[]) => void);
        return this;
    }
}