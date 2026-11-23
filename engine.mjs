function object(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Expected an object');
}
function quantity(value, minimum) {
  if (!Number.isSafeInteger(value) || value < minimum || Math.abs(value) > 1e12)
    throw Error('Inventory quantities must be integers in range');
  return value;
}
export function run(input) {
  object(input);
  if (JSON.stringify(input).length > 200000) throw Error('Input exceeds 200000 serialized characters');
  let stock = quantity(input.initial, 0);
  if (!Array.isArray(input.events) || input.events.length > 500) throw Error('events must be an array of at most 500 items');
  const events = Array.from(input.events, event => {
    object(event);
    if (typeof event.id !== 'string' || !event.id.trim() || event.id.length > 100000) throw Error('Expected nonempty event ID');
    return {id:event.id, delta:quantity(event.delta, -1e12)};
  });
  const decisions = new Map();
  const rows = events.map(({id, delta}, eventIndex) => {
    const before = stock, original = decisions.get(id);
    if (original) {
      const conflict = delta !== original.delta;
      return {eventIndex,id,delta,status:conflict?'conflict: reused ID with different delta':'duplicate ignored',
        before,stock,appliedDelta:0,originalIndex:original.eventIndex,
        originalDelta:original.delta,originalStatus:original.status,originalStock:original.stock};
    }
    const accepted = stock + delta >= 0;
    if (accepted) stock += delta;
    const status = accepted ? 'applied' : 'rejected: negative inventory';
    decisions.set(id, {eventIndex,delta,status,stock});
    return {eventIndex,id,delta,status,before,stock,appliedDelta:accepted?delta:0,
      originalIndex:eventIndex,originalDelta:delta,originalStatus:status,originalStock:stock};
  });
  return {metrics:{stock,rejected:rows.filter(r=>r.status.startsWith('rejected')).length,
    duplicates:rows.filter(r=>r.status==='duplicate ignored').length,
    conflicts:rows.filter(r=>r.status.startsWith('conflict')).length,
    applied:rows.filter(r=>r.status==='applied').length},rows};
}
