import { describe, expect, it } from 'vitest';
import { PreviewGate } from './preview';

describe('preview authorization gate', () => {
  it('does not activate for an uncredentialed toggle', async () => {
    const gate = new PreviewGate();
    await gate.enable(null, async () => true);
    expect(gate.status).toBe('sign_in_required');
  });
  it('activates only after server confirmation', async () => {
    const gate = new PreviewGate();
    let complete!: (value: boolean) => void;
    const request = gate.enable('token', () => new Promise(resolve => { complete = resolve; }));
    expect(gate.status).toBe('checking');
    complete(true); await request;
    expect(gate.status).toBe('active');
  });
  it('does not let a late success reactivate after exit/logout', async () => {
    const gate = new PreviewGate();
    let complete!: (value: boolean) => void;
    const request = gate.enable('token', () => new Promise(resolve => { complete = resolve; }));
    gate.disable(); complete(true); await request;
    expect(gate.status).toBe('off');
  });
  it('distinguishes forbidden and outage states', async () => {
    const gate = new PreviewGate();
    await gate.enable('token', async () => false);
    expect(gate.status).toBe('forbidden');
    await gate.enable('token', async () => { throw { response: { status: 503 } }; });
    expect(gate.status).toBe('unavailable');
  });
});
