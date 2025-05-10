declare module 'cluster' {
  import * as events from 'events';
  import * as child from 'child_process';
  import * as net from 'net';

  export interface ClusterSettings {
    execArgv?: string[];
    exec?: string;
    args?: string[];
    silent?: boolean;
    stdio?: any[];
    uid?: number;
    gid?: number;
  }

  export interface Worker extends events.EventEmitter {
    id: string;
    process: child.ChildProcess;
    send(message: any, sendHandle?: any): boolean;
    kill(signal?: string): void;
    destroy(signal?: string): void;
    disconnect(): void;
    isConnected(): boolean;
    isDead(): boolean;
    exitedAfterDisconnect: boolean;
    on(event: string, listener: (...args: any[]) => void): this;
    removeListener(event: string, listener: (...args: any[]) => void): this;
  }

  export const isPrimary: boolean;
  export const isMaster: boolean;
  export const isWorker: boolean;
  export let worker: Worker;
  export const workers: { [index: string]: Worker };
  export function disconnect(callback?: Function): void;
  export function fork(env?: any): Worker;
  export function setupMaster(settings?: ClusterSettings): void;
  export function setupPrimary(settings?: ClusterSettings): void;
  export function on(event: string, listener: (...args: any[]) => void): void;
} 