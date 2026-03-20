var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/utils/queue.ts
import { Time } from "koishi";
import {
  ChatLunaError,
  ChatLunaErrorCode
} from "koishi-plugin-chatluna/utils/error";
import { ObjectLock } from "koishi-plugin-chatluna/utils/lock";
import { withResolver } from "koishi-plugin-chatluna/utils/promise";
var RequestIdQueue = class {
  static {
    __name(this, "RequestIdQueue");
  }
  _queue = {};
  _queueLocks = {};
  _maxQueueSize = 50;
  _queueTimeout;
  constructor(queueTimeout = Time.minute * 3) {
    this._queueTimeout = queueTimeout;
    setInterval(() => this.cleanup(), queueTimeout);
  }
  async add(key, requestId) {
    const currentLength = this._queue[key]?.length ?? 0;
    if (currentLength >= this._maxQueueSize) {
      throw new ChatLunaError(ChatLunaErrorCode.QUEUE_OVERFLOW);
    }
    if (!this._queueLocks[key]) {
      this._queueLocks[key] = new ObjectLock(this._queueTimeout);
    }
    const { promise, resolve, reject } = withResolver();
    const queueItem = {
      requestId,
      timestamp: Date.now(),
      notifyPromise: { promise, resolve, reject }
    };
    let isFirst = false;
    try {
      await this._queueLocks[key].runLocked(async () => {
        if (!this._queue[key]) {
          this._queue[key] = [];
        }
        const existingIndex = this._queue[key].findIndex(
          (item) => item.requestId === requestId
        );
        if (existingIndex !== -1) {
          return;
        }
        if (this._queue[key].length >= this._maxQueueSize) {
          throw new ChatLunaError(ChatLunaErrorCode.QUEUE_OVERFLOW);
        }
        this._queue[key].push(queueItem);
        isFirst = this._queue[key].length === 1;
      });
      if (isFirst) {
        resolve();
      }
    } catch (error) {
      reject(error);
      throw error;
    }
  }
  async remove(key, requestId) {
    if (!this._queue[key]) return;
    if (!this._queueLocks[key]) {
      this._queueLocks[key] = new ObjectLock(this._queueTimeout);
    }
    let nextItem;
    let shouldCleanup = false;
    try {
      await this._queueLocks[key].runLocked(async () => {
        if (!this._queue[key]) return;
        const index = this._queue[key].findIndex(
          (item) => item.requestId === requestId
        );
        if (index === -1) return;
        this._queue[key].splice(index, 1);
        if (this._queue[key].length === 0) {
          shouldCleanup = true;
          return;
        }
        if (index === 0 && this._queue[key].length > 0) {
          nextItem = this._queue[key][0];
        }
      });
      if (shouldCleanup) {
        delete this._queue[key];
        delete this._queueLocks[key];
        return;
      }
      if (nextItem) {
        nextItem.notifyPromise.resolve();
      }
    } catch (error) {
      console.error("Error in remove operation:", error);
    }
  }
  async wait(key, requestId, maxConcurrent) {
    if (!this._queue[key]) {
      await this.add(key, requestId);
      return;
    }
    if (!this._queueLocks[key]) {
      this._queueLocks[key] = new ObjectLock(this._queueTimeout);
    }
    let item;
    let shouldExecute = false;
    await this._queueLocks[key].runLocked(async () => {
      if (!this._queue[key]) return;
      const index = this._queue[key].findIndex(
        (item2) => item2.requestId === requestId
      );
      if (index === -1) return;
      if (index === 0 || index < maxConcurrent) {
        shouldExecute = true;
        return;
      }
      item = this._queue[key][index];
    });
    if (shouldExecute) {
      item?.notifyPromise.resolve();
      return;
    }
    if (item) {
      let timeoutId;
      let timeoutError = null;
      try {
        throw new Error(
          `Queue wait timeout after ${this._queueTimeout}ms`
        );
      } catch (e) {
        timeoutError = e;
      }
      try {
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(timeoutError);
          }, this._queueTimeout);
        });
        await Promise.race([item.notifyPromise.promise, timeoutPromise]);
      } catch (error) {
        await this.remove(key, requestId).catch(() => {
        });
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
    }
  }
  async cleanup() {
    const now = Date.now();
    const keys = Object.keys(this._queue);
    for (const key of keys) {
      if (!this._queueLocks[key]) {
        this._queueLocks[key] = new ObjectLock(this._queueTimeout);
      }
      await this._queueLocks[key].runLocked(async () => {
        if (!this._queue[key]) return;
        const expiredItems = this._queue[key].filter(
          (item) => now - item.timestamp >= this._queueTimeout
        );
        expiredItems.forEach((item) => {
          item.notifyPromise.reject(
            new Error(
              `Queue wait timeout after ${this._queueTimeout}ms`
            )
          );
        });
        this._queue[key] = this._queue[key].filter(
          (item) => now - item.timestamp < this._queueTimeout
        );
        if (this._queue[key].length === 0) {
          delete this._queue[key];
          delete this._queueLocks[key];
          return;
        }
        if (this._queue[key].length > 0) {
          this._queue[key][0].notifyPromise.resolve();
        }
      });
    }
  }
  async getQueueLength(key) {
    if (!this._queueLocks[key]) {
      this._queueLocks[key] = new ObjectLock(this._queueTimeout);
    }
    return await this._queueLocks[key].runLocked(
      async () => this._queue[key]?.length ?? 0
    );
  }
  async getQueueStatus(key) {
    if (!this._queueLocks[key]) {
      this._queueLocks[key] = new ObjectLock(this._queueTimeout);
    }
    return await this._queueLocks[key].runLocked(async () => ({
      length: this._queue[key]?.length ?? 0,
      items: this._queue[key]?.map((item) => ({
        requestId: item.requestId,
        age: Date.now() - item.timestamp
      })) ?? []
    }));
  }
};
export {
  RequestIdQueue
};
