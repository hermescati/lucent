import { createContext, type Context } from 'react';

type Registry = Map<string, Context<unknown>>;

// Kept on the global object, which outlives the modules: Fast Refresh re-runs a module when it or something it imports
// changes, and a fresh `createContext` there is a new component type to React, which remounts everything under its
// provider. Under a stack screen that clears the options its page has just set, so titles and toolbars vanish.
const global = globalThis as { __lucentContexts?: Registry };
const contexts: Registry = (global.__lucentContexts ??= new Map());

/** `createContext`, but the same context each time its module runs, by name. */
export const createLucentContext = <T>(name: string, defaultValue: T): Context<T> => {
  const existing = contexts.get(name);
  if (existing) return existing as Context<T>;
  const context = createContext(defaultValue);
  context.displayName = name;
  contexts.set(name, context as Context<unknown>);
  return context;
};
