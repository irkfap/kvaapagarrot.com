import LRUCache from 'mnemonist/lru-cache.js';
import {IArrayLikeConstructor} from 'mnemonist/utils/types';
import {TemplateFunction} from 'eta/dist/types/compile';

export class LRU {
  private cache: LRUCache<string, TemplateFunction>;

  constructor(capacity = 1000) {
    // https://yomguithereal.github.io/posts/lru-cache
    this.cache = new LRUCache(
      String,
      // @ts-ignore: No need to align types here
      (Function as TemplateFunction) as IArrayLikeConstructor,
      capacity,
    );
  }

  get(key: string): TemplateFunction | undefined {
    return this.cache.get(key);
  }

  set(key: string, value: TemplateFunction): void {
    this.cache.set(key, value);
  }

  // ETA storage compatibility
  // https://github.com/eta-dev/eta/blob/master/src/storage.ts
  define(key: string, value: TemplateFunction): void {
    this.cache.set(key, value);
  }

  remove(key: string): void {
    // https://github.com/Yomguithereal/mnemonist/issues/143
    // @ts-ignore Reason: ETA cache declares this for some reason (never called in the code actually).
    this.cache.set(key, undefined);
  }

  reset(): void {
    this.cache.clear();
  }

  // Comes from ETA cache implementation (Cacher<TemplateFunction>)
  // In `Cacher` it duplicates cache instance from another instance.
  // Not going to re-implement that here.
  load(): void {
    return void null;
  }
}
