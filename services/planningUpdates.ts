// A successful generation invalidates cached planning screens; merely opening
// configuration or shopping does not.
let revision = 0;
export function planningRevision() { return revision; }
export function invalidatePlanning() { revision += 1; }
