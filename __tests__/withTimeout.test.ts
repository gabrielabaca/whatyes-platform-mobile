import { TimeoutError, withTimeout } from '../src/utils/withTimeout';

describe('withTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resuelve con el valor original si la promesa vuelve a tiempo', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 1000, 'test')).resolves.toBe('ok');
  });

  it('propaga el rechazo original sin convertirlo en timeout', async () => {
    const boom = new Error('boom');
    await expect(withTimeout(Promise.reject(boom), 1000, 'test')).rejects.toBe(boom);
  });

  it('rechaza con TimeoutError si la promesa nunca vuelve', async () => {
    const pending = withTimeout(new Promise(() => {}), 1000, 'gate');
    const assertion = expect(pending).rejects.toBeInstanceOf(TimeoutError);
    jest.advanceTimersByTime(1000);
    await assertion;
  });
});
