export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export interface ReferenceData {
  encoding: 'references-v1';
  data: JsonValue;
  records: Record<string, JsonValue>;
}
const recordKinds: Record<string, string> = {
  dice: 'die',
  faces: 'face',
  equipments: 'equipment',
  enemies: 'enemy',
  creatureState: 'creatureState',
  intents: 'intent',
  traits: 'traits',
  phases: 'phase',
  consumables: 'sticker',
  permanentStickers: 'sticker',
  stickers: 'sticker',
  items: 'item',
  visibleItems: 'item',
  item: 'item',
  temporaryPlacements: 'placement',
  catalog: 'catalog',
  creatures: 'creatures',
  monsters: 'monster',
};

/** References contain JSON values from this document, including historical definitions. */
export function packReferences(value: unknown): ReferenceData {
  const records: Record<string, JsonValue> = {};
  const identities = new Map<string, string>();
  const counts = new Map<string, number>();
  const encode = (entry: JsonValue, key = ''): JsonValue => {
    if (Array.isArray(entry)) return entry.map((child) => encode(child, key));
    if (entry === null || typeof entry !== 'object') return entry;
    const object = Object.fromEntries(
      Object.entries(entry).map(([name, child]) => [name, encode(child, name)]),
    );
    const kind = recordKinds[key];
    if (!kind) return object;
    const identity = `${kind}:${JSON.stringify(object)}`;
    let id = identities.get(identity);
    if (!id) {
      const index = counts.get(kind) ?? 0;
      id = `${kind}:${index}`;
      counts.set(kind, index + 1);
      identities.set(identity, id);
      records[id] = object;
    }
    return { $ref: id };
  };
  const data = encode(JSON.parse(JSON.stringify(value)) as JsonValue);
  return { encoding: 'references-v1', data, records };
}

export function unpackReferences(document: ReferenceData): JsonValue {
  const decode = (entry: JsonValue): JsonValue => {
    if (Array.isArray(entry)) return entry.map(decode);
    if (entry === null || typeof entry !== 'object') return entry;
    if (typeof entry.$ref === 'string' && Object.keys(entry).length === 1) {
      const value = document.records[entry.$ref];
      if (value === undefined) throw new Error(`Missing telemetry reference: ${entry.$ref}`);
      return decode(value);
    }
    return Object.fromEntries(Object.entries(entry).map(([key, child]) => [key, decode(child)]));
  };
  return decode(document.data);
}
