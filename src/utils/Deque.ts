
/**
 * A double-ended queue implementation using a circular buffer.
 * Supports O(1) push/pop/shift/unshift operations.
 */
export class Deque<T> {
    private buffer: (T | undefined)[];
    private head: number = 0;
    private tail: number = 0;
    private count: number = 0;
    private capacity: number;

    constructor(initialCapacity: number = 16) {
        this.capacity = initialCapacity;
        this.buffer = new Array(initialCapacity);
    }

    /**
     * Add element to the back
     */
    push(item: T): void {
        if (this.count === this.capacity) {
            this.resize();
        }
        this.buffer[this.tail] = item;
        this.tail = (this.tail + 1) % this.capacity;
        this.count++;
    }

    /**
     * Remove element from the back
     */
    pop(): T | undefined {
        if (this.count === 0) return undefined;
        this.tail = (this.tail - 1 + this.capacity) % this.capacity;
        const item = this.buffer[this.tail];
        this.buffer[this.tail] = undefined; // Help GC
        this.count--;
        return item;
    }

    /**
     * Add element to the front
     */
    unshift(item: T): void {
        if (this.count === this.capacity) {
            this.resize();
        }
        this.head = (this.head - 1 + this.capacity) % this.capacity;
        this.buffer[this.head] = item;
        this.count++;
    }

    /**
     * Remove element from the front
     */
    shift(): T | undefined {
        if (this.count === 0) return undefined;
        const item = this.buffer[this.head];
        this.buffer[this.head] = undefined; // Help GC
        this.head = (this.head + 1) % this.capacity;
        this.count--;
        return item;
    }

    /**
     * Peek at the front element
     */
    peekFront(): T | undefined {
        if (this.count === 0) return undefined;
        return this.buffer[this.head];
    }

    /**
     * Peek at the back element
     */
    peekBack(): T | undefined {
        if (this.count === 0) return undefined;
        const index = (this.tail - 1 + this.capacity) % this.capacity;
        return this.buffer[index];
    }

    /**
     * Get element at index (0-based from head)
     */
    get(index: number): T | undefined {
        if (index < 0 || index >= this.count) return undefined;
        const actualIndex = (this.head + index) % this.capacity;
        return this.buffer[actualIndex];
    }

    /**
     * Current number of elements
     */
    size(): number {
        return this.count;
    }

    /**
     * Is the deque empty?
     */
    isEmpty(): boolean {
        return this.count === 0;
    }

    /**
     * Clear the deque
     */
    clear(): void {
        this.buffer = new Array(this.capacity);
        this.head = 0;
        this.tail = 0;
        this.count = 0;
    }

    /**
     * Convert to array
     */
    toArray(): T[] {
        const result = new Array(this.count);
        for (let i = 0; i < this.count; i++) {
            const index = (this.head + i) % this.capacity;
            result[i] = this.buffer[index] as T;
        }
        return result;
    }

    private resize(): void {
        const newCapacity = this.capacity * 2;
        const newBuffer = new Array(newCapacity);

        for (let i = 0; i < this.count; i++) {
            newBuffer[i] = this.buffer[(this.head + i) % this.capacity];
        }

        this.buffer = newBuffer;
        this.capacity = newCapacity;
        this.head = 0;
        this.tail = this.count;
    }
}
