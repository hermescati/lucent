import { Stack } from 'expo-router';
import { useEffect, useImperativeHandle, useRef } from 'react';
import type { SearchBarCommands } from 'react-native-screens';

import { useSearchActions, type SearchBarProps } from './context/search';

export const SearchBar = ({ ref, onChangeText, onFocus, onBlur, onCancelButtonPress, ...props }: SearchBarProps) => {
  const { register, replaceQuery, track, attach, attachText, writeText } = useSearchActions();
  const nativeRef = useRef<SearchBarCommands>(null);

  useEffect(() => {
    register({ onChangeText });
  });

  useEffect(() => () => register(null), [register]);

  useEffect(() => {
    const detach = attach({
      focus: () => nativeRef.current?.focus(),
      blur: () => nativeRef.current?.blur(),
      cancel: () => nativeRef.current?.cancelSearch(),
    });
    attachText((text) => nativeRef.current?.setText(text));
    return () => {
      detach();
      attachText(null);
    };
  }, [attach, attachText]);

  useImperativeHandle(
    ref,
    () => ({
      focus: () => nativeRef.current?.focus(),
      blur: () => nativeRef.current?.blur(),
      setText: writeText,
      clearText: () => writeText(''),
      cancelSearch: () => nativeRef.current?.cancelSearch(),
      toggleCancelButton: (show: boolean) => nativeRef.current?.toggleCancelButton(show),
    }),
    [writeText],
  );

  return (
    <Stack.SearchBar
      placement="automatic"
      {...props}
      ref={nativeRef}
      onChangeText={(event) => {
        replaceQuery(event.nativeEvent.text);
        onChangeText?.(event);
      }}
      onFocus={(event) => {
        track('onFocus');
        onFocus?.(event);
      }}
      onBlur={(event) => {
        track('onBlur');
        onBlur?.(event);
      }}
      onCancelButtonPress={(event) => {
        track('onCancelButtonPress');
        replaceQuery('');
        onCancelButtonPress?.(event);
      }}
    />
  );
};
