import { Button, ContentUnavailableView } from 'expo-lucent';

import { story } from './types';

const none = () => {};

export default story({
  slug: 'content-unavailable',
  group: 'views',
  name: 'Content Unavailable View',
  summary: 'An empty state: a symbol, a title and what to do',
  component: 'ContentUnavailableView',
  controls: {
    title: {
      type: 'select',
      options: [
        { label: 'No Messages', value: 'No Messages' },
        { label: 'None', value: undefined },
      ],
      default: 0,
    },
    symbol: {
      type: 'preset',
      label: 'sf / md',
      options: [
        { label: 'Tray', props: { sf: 'tray', md: 'inbox' } },
        { label: 'Magnifier', props: { sf: 'magnifyingglass', md: 'search' } },
        { label: 'None', props: { sf: undefined, md: undefined } },
      ],
      default: 0,
    },
    description: {
      type: 'select',
      options: [
        { label: 'Short', value: 'Messages you receive appear here.' },
        { label: 'None', value: undefined },
      ],
      default: 0,
    },
    action: { type: 'boolean', default: true, virtual: true, detail: 'A Button in `actions`' },
  },
  render: ({ props }) => (
    <ContentUnavailableView
      title={props.title as string | undefined}
      sf={props.sf as never}
      md={props.md as never}
      description={props.description as string | undefined}
      actions={props.action ? <Button label="Refresh" onPress={none} /> : undefined}
    />
  ),
  code: (props) =>
    [
      '<ContentUnavailableView',
      props.title ? `  title="${String(props.title)}"` : null,
      props.sf ? `  sf="${String(props.sf)}"` : null,
      props.md ? `  md="${String(props.md)}"` : null,
      props.description ? `  description="${String(props.description)}"` : null,
      props.action ? '  actions={<Button label="Refresh" onPress={refresh} />}' : null,
      '/>',
    ]
      .filter(Boolean)
      .join('\n'),
  stage: { height: 420 },
  footer: 'It fills the space it is given and centres itself, so give it the screen or a flexible box.',
});
