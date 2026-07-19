import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(__dirname, 'index.tsx'), 'utf8');

describe('/sys/standing return navigation', () => {
  it('shows a source-aware return action for document maintenance jumps', () => {
    expect(source).toContain("params.get('returnFrom') === 'instrument-list'");
    expect(source).toContain('showInstrumentReturn');
    expect(source).toContain('href={instrumentReturnHref}');
    expect(source).toContain('返回文书管理');
    expect(source).toContain('handleReturnToInstrument');
  });

  it('prefers browser history when returning to the document workspace', () => {
    const handlerStart = source.indexOf('const pushInstrumentReturnFallback =');
    const handlerEnd = source.indexOf('const standingTabItems =', handlerStart);
    const handlerSource = source.slice(handlerStart, handlerEnd);

    expect(handlerSource).toContain('history.back()');
    expect(handlerSource).toContain('window.setTimeout');
    expect(handlerSource).toContain(
      "window.location.pathname === '/sys/standing'",
    );
    expect(handlerSource).toContain('history.push(returnTo)');
    expect(handlerSource).toContain("history.push('/instrument-list')");
  });
});
