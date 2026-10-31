import type { Props, Story } from './types';

const round = (value: number) => Number(value.toFixed(2));

/** A value as JavaScript source. */
export const literal = (value: unknown): string => {
  if (typeof value === 'string') return `'${value}'`;
  if (typeof value === 'number') return String(round(value));
  if (Array.isArray(value)) return `[${value.map(literal).join(', ')}]`;
  if (value && typeof value === 'object') {
    const fields = Object.entries(value).map(([key, field]) => `${key}: ${literal(field)}`);
    return `{ ${fields.join(', ')} }`;
  }
  return String(value);
};

/** A prop as JSX, or nothing for `undefined`. */
export const attribute = (name: string, value: unknown) => {
  if (value === undefined) return null;
  if (value === true) return name;
  if (typeof value === 'string') return `${name}="${value}"`;
  return `${name}={${literal(value)}}`;
};

const setter = (prop: string) => `set${prop[0].toUpperCase()}${prop.slice(1)}`;

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export const element = (component: string, attributes: string[], width = 72) => {
  const inline = `<${component}${attributes.map((attribute) => ` ${attribute}`).join('')} />`;
  if (inline.length <= width) return inline;
  return `<${component}\n${attributes.map((attribute) => `  ${attribute}`).join('\n')}\n/>`;
};

/** The code sample for a story's current props: a useState per binding, then the element. */
export const generate = (story: Story, props: Props) => {
  const bindings = Object.entries(story.bindings ?? {});
  const state = bindings.map(([prop]) => `const [${prop}, ${setter(prop)}] = useState(${literal(props[prop])});`);

  const fallbacks: Props = {};
  const virtual = new Set<string>();
  const order: string[] = [];
  for (const [name, control] of Object.entries(story.controls)) {
    if (control.type === 'preset') {
      Object.assign(fallbacks, control.fallbacks);
      for (const preset of control.options) order.push(...Object.keys(preset.props));
    } else {
      fallbacks[name] = control.fallback;
      if (control.virtual) virtual.add(name);
      order.push(name);
    }
  }

  const attributes: string[] = [];
  for (const name of new Set(order)) {
    const binding = story.bindings?.[name];
    if (binding) {
      attributes.push(`${name}={${name}}`, `${binding.handler}={${binding.code ?? setter(name)}}`);
    } else if (!virtual.has(name) && !same(props[name], fallbacks[name])) {
      const jsx = attribute(name, props[name]);
      if (jsx) attributes.push(jsx);
    }
  }
  for (const [name, binding] of bindings) {
    if (!order.includes(name))
      attributes.unshift(`${name}={${name}}`, `${binding.handler}={${binding.code ?? setter(name)}}`);
  }

  return [...state, ...(state.length ? [''] : []), element(story.component, attributes)].join('\n');
};
