import { useEffect, useImperativeHandle } from 'react';

import { useSearchActions, type SearchBarProps } from './context/search';

export const SearchBar = ({ ref, ...props }: SearchBarProps) => {
  const { register, replaceQuery, command } = useSearchActions();

  useImperativeHandle(
    ref,
    () => ({
      focus: () => command('focus'),
      blur: () => command('blur'),
      setText: (text: string) => replaceQuery(text),
      clearText: () => replaceQuery(''),
      cancelSearch: () => command('cancel'),
      toggleCancelButton: () => {},
    }),
    [command, replaceQuery],
  );

  useEffect(() => {
    register(props);
  });

  useEffect(() => () => register(null), [register]);

  return null;
};
