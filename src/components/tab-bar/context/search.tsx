import { useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { NativeSyntheticEvent } from 'react-native';
import type { SearchBarProps as ScreensSearchBarProps } from 'react-native-screens';
import { createLucentContext } from '../../../theme/context';

export type SearchBarProps = ScreensSearchBarProps;

type SearchEventName = 'onFocus' | 'onBlur' | 'onSearchButtonPress' | 'onCancelButtonPress';

export interface SearchControls {
  focus?: () => void;
  blur?: () => void;
  cancel?: () => void;
}

export interface TabSearch {
  query: string;
  isFocused: boolean;
  setText: (text: string) => void;
  clearText: () => void;
  focus: () => void;
  blur: () => void;
  cancel: () => void;
}

interface SearchHost {
  query: string;
  focused: boolean;
  track: (name: SearchEventName) => void;
  writeText: (text: string) => void;
  attachText: (write: ((text: string) => void) | null) => void;
  setQuery: (text: string) => void;
  replaceQuery: (text: string) => void;
  props: SearchBarProps;
  register: (props: SearchBarProps | null) => void;
  emit: (name: SearchEventName) => void;
  attach: (part: SearchControls) => () => void;
  command: (name: keyof SearchControls) => void;
}

const SearchHostContext = createLucentContext<SearchHost | null>('SearchHost', null);

const textEvent = <T,>(text: string) => ({ nativeEvent: { text } }) as unknown as NativeSyntheticEvent<T>;

interface Props {
  children: ReactNode;
}

export const SearchHostProvider = ({ children }: Props) => {
  const [query, setQueryState] = useState('');
  const [focused, setFocused] = useState(false);
  const nativeText = useRef<((text: string) => void) | null>(null);
  const [props, setProps] = useState<SearchBarProps>({});
  const latest = useRef<SearchBarProps>({});
  const text = useRef('');

  const register = useCallback((next: SearchBarProps | null) => {
    const value = next ?? {};
    const previous = latest.current;
    latest.current = value;
    const keys = Object.keys(value) as (keyof SearchBarProps)[];
    const same =
      keys.length === Object.keys(previous).length && keys.every((key) => Object.is(value[key], previous[key]));
    if (!same) {
      setProps(value);
    }
  }, []);

  const controls = useRef<SearchControls>({});

  const attach = useCallback((part: SearchControls) => {
    Object.assign(controls.current, part);
    return () => {
      const current = controls.current;
      (Object.keys(part) as (keyof SearchControls)[]).forEach((key) => {
        if (current[key] === part[key]) {
          delete current[key];
        }
      });
    };
  }, []);

  const command = useCallback((name: keyof SearchControls) => {
    controls.current[name]?.();
  }, []);

  const replaceQuery = useCallback((next: string) => {
    if (next === text.current) {
      return false;
    }
    text.current = next;
    setQueryState(next);
    return true;
  }, []);

  const setQuery = useCallback(
    (next: string) => {
      if (replaceQuery(next)) {
        latest.current.onChangeText?.(textEvent(next));
      }
    },
    [replaceQuery],
  );

  const track = useCallback((name: SearchEventName) => {
    if (name === 'onFocus') {
      setFocused(true);
    } else if (name === 'onBlur' || name === 'onCancelButtonPress') {
      setFocused(false);
    }
  }, []);

  const attachText = useCallback((write: ((text: string) => void) | null) => {
    nativeText.current = write;
  }, []);

  const writeText = useCallback(
    (next: string) => {
      nativeText.current?.(next);
      setQuery(next);
    },
    [setQuery],
  );

  const emit = useCallback((name: SearchEventName) => {
    track(name);
    const handler = latest.current[name] as ((event: NativeSyntheticEvent<unknown>) => void) | undefined;
    handler?.(textEvent(text.current));
  }, []);

  const value = useMemo(
    () => ({
      query,
      focused,
      track,
      writeText,
      attachText,
      setQuery,
      replaceQuery,
      props,
      register,
      emit,
      attach,
      command,
    }),
    [query, focused, track, writeText, attachText, setQuery, replaceQuery, props, register, emit, attach, command],
  );

  return <SearchHostContext value={value}>{children}</SearchHostContext>;
};

const fallbackHost: SearchHost = {
  query: '',
  focused: false,
  track: () => {},
  writeText: () => {},
  attachText: () => {},
  setQuery: () => {},
  replaceQuery: () => {},
  props: {},
  register: () => {},
  emit: () => {},
  attach: () => () => {},
  command: () => {},
};

export const useSearchHost = (): SearchHost => useContext(SearchHostContext) ?? fallbackHost;

export const useTabSearch = (): TabSearch => {
  const { query, focused, writeText, command } = useSearchHost();

  return useMemo(
    () => ({
      query,
      isFocused: focused,
      setText: writeText,
      clearText: () => writeText(''),
      focus: () => command('focus'),
      blur: () => command('blur'),
      cancel: () => command('cancel'),
    }),
    [query, focused, writeText, command],
  );
};
