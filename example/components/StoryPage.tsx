import { Slider, Switch } from 'expo-lucent';
import { Stack } from 'expo-lucent/navigation';
import { useState } from 'react';

import { accents } from './settings';
import { Choice, Code, Page, Row, Section, Stage, Swatches } from './ui';

import { generate } from '@/stories/code';
import type { Control, Props, Story } from '@/stories/types';

interface State {
  props: Props;
  /** The selected option of each select and preset control. */
  choices: Record<string, number>;
}

const initialState = (story: Story): State => {
  const props: Props = {};
  const choices: Record<string, number> = {};
  for (const [name, control] of Object.entries(story.controls)) {
    if (control.type === 'select') {
      choices[name] = control.default;
      props[name] = control.options[control.default].value;
    } else if (control.type === 'preset') {
      choices[name] = control.default;
      Object.assign(props, control.options[control.default].props);
    } else {
      props[name] = control.default;
    }
  }
  return { props, choices };
};

const defined = (props: Props) => Object.fromEntries(Object.entries(props).filter(([, value]) => value !== undefined));

const formatNumber = (value: unknown, unit = '') => `${Number(Number(value).toFixed(2))}${unit}`;

interface ControlRowProps {
  name: string;
  control: Control;
  state: State;
  setProps: (patch: Props) => void;
  choose: (name: string, index: number, patch: Props) => void;
  last: boolean;
}

const ControlRow = ({ name, control, state, setProps, choose, last }: ControlRowProps) => {
  const value = state.props[name];
  switch (control.type) {
    case 'boolean':
      return (
        <Row label={name} detail={control.detail} last={last}>
          <Switch value={Boolean(value)} onValueChange={(next) => setProps({ [name]: next })} />
        </Row>
      );
    case 'number':
      return (
        <Row label={name} detail={control.detail ?? formatNumber(value, control.unit)} stacked last={last}>
          <Slider
            value={Number(value)}
            onValueChange={(next) => setProps({ [name]: next })}
            min={control.min}
            max={control.max}
            step={control.step}
          />
        </Row>
      );
    case 'select':
      return (
        <Row label={name} detail={control.detail} stacked last={last}>
          <Choice
            labels={control.options.map((option) => option.label)}
            selectedIndex={state.choices[name]}
            onSelect={(index) => choose(name, index, { [name]: control.options[index].value })}
          />
        </Row>
      );
    case 'preset':
      return (
        <Row label={control.label} detail={control.detail} stacked last={last}>
          <Choice
            labels={control.options.map((option) => option.label)}
            selectedIndex={state.choices[name]}
            onSelect={(index) => choose(name, index, control.options[index].props)}
          />
        </Row>
      );
    case 'color': {
      const alpha = control.alpha ?? '';
      const colors = [
        { name: 'None', color: undefined },
        ...accents.map((accent) => ({ name: accent.name, color: `${accent.color}${alpha}` })),
      ];
      return (
        <Row label={name} detail={control.detail ?? (typeof value === 'string' ? value : 'None')} stacked last={last}>
          <Swatches
            colors={colors}
            value={value as string | undefined}
            onChange={(color) => setProps({ [name]: color })}
          />
        </Row>
      );
    }
  }
};

type Backdrop = 'plain' | 'photo';

const StoryView = ({ story }: { story: Story }) => {
  const [state, setState] = useState(() => initialState(story));
  const [backdrop, setBackdrop] = useState<Backdrop>(story.stage?.photo === 'always' ? 'photo' : 'plain');

  const setProps = (patch: Props) => setState((current) => ({ ...current, props: { ...current.props, ...patch } }));
  const choose = (name: string, index: number, patch: Props) =>
    setState((current) => ({
      props: { ...current.props, ...patch },
      choices: { ...current.choices, [name]: index },
    }));

  const controls = Object.entries(story.controls);
  const optionalPhoto = story.stage?.photo === 'optional';
  const props = defined(state.props);

  return (
    <Page>
      <Stack.Screen options={{ title: story.name }} />
      <Stage photo={backdrop === 'photo'} height={story.stage?.height}>
        {story.render({ props, set: setProps })}
      </Stage>

      <Section title="Props" footer={story.footer}>
        {controls.map(([name, control], index) => (
          <ControlRow
            key={name}
            name={name}
            control={control}
            state={state}
            setProps={setProps}
            choose={choose}
            last={!optionalPhoto && index === controls.length - 1}
          />
        ))}
        {optionalPhoto ? (
          <Row label="Background" detail="Not a prop: what the component sits on" stacked last>
            <Choice
              labels={['Plain', 'Photo']}
              selectedIndex={backdrop === 'plain' ? 0 : 1}
              onSelect={(index) => setBackdrop(index === 0 ? 'plain' : 'photo')}
            />
          </Row>
        ) : null}
      </Section>

      <Code>{story.code ? story.code(props) : generate(story, props)}</Code>
      {story.extra ? <story.extra /> : null}
    </Page>
  );
};

/** One page per story: the component on a stage, a control per prop, and the code for the current props. */
export const StoryPage = ({ story }: { story: Story }) => <StoryView key={story.slug} story={story} />;
