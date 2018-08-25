declare var __DEV__: boolean;

export const log = (level: 'info' | 'warn' | 'error', ...messages: any[]) => {
  if (__DEV__) {
    console[level](...messages);
  }
}
