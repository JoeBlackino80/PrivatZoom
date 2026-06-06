import { describe, it, expect } from 'vitest';
import { FailSafe } from '../src/core/failsafe.js';

describe('FailSafe', () => {
  it('štartuje v zaclonenom stave (bezpečný default)', () => {
    const fs = new FailSafe();
    expect(fs.isCovered()).toBe(true);
  });

  it('odclonení až po recoverAfter po sebe idúcich detekciách', () => {
    const fs = new FailSafe({ coverAfter: 2, recoverAfter: 3 });
    expect(fs.update(true)).toBe(true); // 1
    expect(fs.update(true)).toBe(true); // 2
    expect(fs.update(true)).toBe(false); // 3 → odclonení
  });

  it('jeden výpadok detekcie ešte neukáže obraz (hysterézia)', () => {
    const fs = new FailSafe({ coverAfter: 2, recoverAfter: 3 });
    fs.update(true);
    fs.update(true);
    fs.update(true); // covered=false
    expect(fs.isCovered()).toBe(false);
    expect(fs.update(false)).toBe(false); // 1 miss — ešte nezaclonení
  });

  it('zaclonení po coverAfter po sebe idúcich výpadkoch', () => {
    const fs = new FailSafe({ coverAfter: 2, recoverAfter: 3 });
    fs.update(true);
    fs.update(true);
    fs.update(true); // odclonené
    expect(fs.update(false)).toBe(false); // miss 1
    expect(fs.update(false)).toBe(true); // miss 2 → zaclonení
  });

  it('prerušená séria detekcií resetuje počítadlo obnovy', () => {
    const fs = new FailSafe({ coverAfter: 2, recoverAfter: 3 });
    fs.update(true);
    fs.update(true); // hit streak 2
    fs.update(false); // reset hit streak, stále covered
    fs.update(true);
    fs.update(true);
    expect(fs.isCovered()).toBe(true); // ešte len 2 v novej sérii
    expect(fs.update(true)).toBe(false); // 3 → odclonené
  });

  it('reset vráti do zaclonneného stavu', () => {
    const fs = new FailSafe({ coverAfter: 2, recoverAfter: 1 });
    fs.update(true); // odclonené (recoverAfter=1)
    expect(fs.isCovered()).toBe(false);
    fs.reset();
    expect(fs.isCovered()).toBe(true);
  });
});
