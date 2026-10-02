import { FormEvent, useEffect, useRef, useState } from 'react';

type Mode = 'seal' | 'open';
type WorkerResponse =
  | { id: number; type: 'status'; message: string }
  | { id: number; type: 'success'; result: string }
  | { id: number; type: 'failure'; message: string };
type PendingJob = {
  id: number;
  resolve: (result: string) => void;
  reject: (reason: Error) => void;
};

const MAX_TEXT_BYTES = 1_048_576;
const MAX_PACKAGE_CHARACTERS = 1_405_000;

function randomPin(): string {
  const range = 10_000_000_000n;
  const ceiling = (1n << 64n) / range * range;
  let candidate = 0n;

  do {
    const words = new Uint32Array(2);
    crypto.getRandomValues(words);
    candidate = (BigInt(words[0]) << 32n) | BigInt(words[1]);
  } while (candidate >= ceiling);

  return (candidate % range).toString().padStart(10, '0');
}

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    arrow: <path d="M4.5 12h14m-5.5-5.5L18.5 12 13 17.5" />,
    check: <path d="m5 12.5 4.2 4.1L19 7" />,
    copy: <><rect x="8" y="8" width="11" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2" /></>,
    download: <><path d="M12 3v11m-4-4 4 4 4-4" /><path d="M5 17v3h14v-3" /></>,
    eye: <><path d="M2.8 12s3.3-6 9.2-6 9.2 6 9.2 6-3.3 6-9.2 6-9.2-6-9.2-6Z" /><circle cx="12" cy="12" r="2.6" /></>,
    eyeOff: <><path d="m3 3 18 18M10.6 6.2A9 9 0 0 1 12 6c5.9 0 9.2 6 9.2 6a14 14 0 0 1-3.1 3.6M6.1 6.8C3.9 8.3 2.8 12 2.8 12s3.3 6 9.2 6c1.1 0 2.1-.2 3-.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
    sparkle: <><path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z" /><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" /></>,
    lock: <><rect x="4.5" y="10" width="15" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    shield: <><path d="M12 3 19 6v5.3c0 4.3-2.9 7.6-7 9.7-4.1-2.1-7-5.4-7-9.7V6l7-3Z" /><path d="m9 12 2 2 4-4" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.5 9a7 7 0 0 1 11.8-2L20 12M4 12l2.7 5a7 7 0 0 0 11.8-2" /></>,
    send: <><path d="m21 3-7.2 18-3.7-7.1L3 10.2 21 3Z" /><path d="M10.1 13.9 21 3" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  };
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name] ?? paths.sparkle}
    </svg>
  );
}

function BrandMark() {
  return (
    <svg aria-hidden="true" className="brand-mark" viewBox="0 0 44 44" fill="none">
      <rect x="1" y="1" width="42" height="42" rx="14" fill="currentColor" />
      <path d="m10 17 12-8 12 8v13l-12 7-12-7V17Z" stroke="#f4cf87" strokeWidth="1.65" strokeLinejoin="round" />
      <path d="m10.7 17.4 11.3 7.7 11.3-7.7M22 25.1v11.1" stroke="#f4cf87" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="22" cy="21.8" r="1.7" fill="#f4cf87" />
    </svg>
  );
}

function HeroEnvelope() {
  return (
    <div className="hero-art" aria-hidden="true">
      <div className="hero-art-orbit orbit-one" />
      <div className="hero-art-orbit orbit-two" />
      <div className="hero-star star-one">✳</div>
      <div className="hero-star star-two">✦</div>
      <div className="envelope-shadow" />
      <div className="envelope-card">
        <div className="envelope-stamp"><span>V</span></div>
        <div className="envelope-line line-one" />
        <div className="envelope-line line-two" />
        <svg className="envelope-fold" viewBox="0 0 360 225" fill="none">
          <path d="M3 10 180 128 357 10" stroke="currentColor" strokeWidth="2" />
          <path d="M3 215 129 112M357 215 231 112" stroke="currentColor" strokeWidth="2" opacity=".44" />
          <path d="m3 215 115-115 62 42 62-42 115 115H3Z" fill="#e8d8b8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="m118 100 62 42 62-42" stroke="currentColor" strokeWidth="1.5" opacity=".65" />
          <circle cx="180" cy="154" r="14" fill="#b3704c" />
          <path d="m174 154 6 6 7-8" stroke="#fff5e6" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="art-note"><span className="art-note-dot" /> sealed on this device</div>
      <div className="art-orbit-label">A PRIVATE LITTLE JOURNEY</div>
    </div>
  );
}

function App() {
  const [mode, setMode] = useState<Mode>('seal');
  const [message, setMessage] = useState('');
  const [pin, setPin] = useState('');
  const [pinVisible, setPinVisible] = useState(false);
  const [envelopeInput, setEnvelopeInput] = useState('');
  const [sealedResult, setSealedResult] = useState('');
  const [openedResult, setOpenedResult] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<PendingJob | null>(null);
  const jobIdRef = useRef(0);

  useEffect(() => {
    const worker = new Worker(new URL('./crypto.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      if (!pendingRef.current || response.id !== pendingRef.current.id) return;

      if (response.type === 'status') {
        setBusyLabel(response.message);
        return;
      }

      const pending = pendingRef.current;
      pendingRef.current = null;
      setBusy(false);
      setBusyLabel('');
      if (response.type === 'success') pending.resolve(response.result);
      else pending.reject(new Error(response.message));
    };
    worker.onerror = () => {
      const pending = pendingRef.current;
      pendingRef.current = null;
      setBusy(false);
      setBusyLabel('');
      pending?.reject(new Error('The local cryptography worker stopped unexpectedly. Reload the page and try again.'));
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
      pendingRef.current?.reject(new Error('The page was closed before the message finished.'));
      pendingRef.current = null;
    };
  }, []);

  const messageBytes = new TextEncoder().encode(message).byteLength;
  const isPinComplete = /^[0-9]{10}$/.test(pin);

  function submitJob(payload: Record<string, string> & { action: 'encrypt' | 'decrypt' }): Promise<string> {
    const worker = workerRef.current;
    if (!worker) return Promise.reject(new Error('The local cryptography worker is not ready. Reload the page and try again.'));
    if (pendingRef.current) return Promise.reject(new Error('A message is already being processed.'));

    const id = ++jobIdRef.current;
    setBusy(true);
    setBusyLabel('Starting the local cryptography…');
    setError('');
    return new Promise((resolve, reject) => {
      pendingRef.current = { id, resolve, reject };
      worker.postMessage({ ...payload, id });
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setCopied('');

    try {
      if (!isPinComplete) throw new Error('Enter exactly 10 digits. Leading zeros are allowed.');
      if (mode === 'seal') {
        if (!message.length) throw new Error('Write a message before sealing it.');
        if (messageBytes > MAX_TEXT_BYTES) throw new Error('This message is over the 1 MiB text limit.');
        const result = await submitJob({ action: 'encrypt', message, pin });
        setSealedResult(result);
        setOpenedResult('');
      } else {
        if (!envelopeInput.trim()) throw new Error('Paste a Vesperfold package first.');
        const result = await submitJob({ action: 'decrypt', envelope: envelopeInput, pin });
        setOpenedResult(result);
        setSealedResult('');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong. Please try again.');
    }
  }

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setError('');
    setCopied('');
  }

  async function copyValue(value: string, label: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied((current) => current === label ? '' : current), 1800);
      return true;
    } catch {
      setError('Clipboard access is unavailable here. Select the text and copy it manually.');
      return false;
    }
  }

  function setNewPin() {
    try {
      setPin(randomPin());
      setPinVisible(true);
      setSealedResult('');
      setOpenedResult('');
      setError('');
      setCopied('');
    } catch {
      setError('A secure random generator is unavailable. Open Vesperfold over HTTPS or localhost and try again.');
    }
  }

  function updatePin(value: string) {
    setPin(value.replace(/[^0-9]/g, '').slice(0, 10));
    setSealedResult('');
    setOpenedResult('');
    setCopied('');
  }

  function downloadEnvelope() {
    if (!sealedResult) return;
    const blob = new Blob([sealedResult], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vesperfold-message.vf1';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadOpenedMessage() {
    if (!openedResult) return;
    const blob = new Blob([openedResult], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'opened-message.txt';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const resultExists = mode === 'seal' ? Boolean(sealedResult) : Boolean(openedResult);

  return (
    <div className="page-shell">
      <div className="top-wash" aria-hidden="true" />
      <header className="site-header content-width">
        <a className="brand" href="#top" aria-label="Vesperfold home">
          <BrandMark />
          <span className="brand-name">vesperfold<span className="brand-period">.</span></span>
        </a>
        <nav className="header-nav" aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#limits">Security notes</a>
          <span className="open-source-tag"><span className="open-source-dot" /> open source</span>
        </nav>
      </header>

      <main id="top" className="content-width">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-mark">✳</span> A small tool for private words</div>
            <h1 id="hero-title">Fold a message.<br /><em>Keep it yours.</em></h1>
            <p className="hero-description">
              A message becomes a sealed little package. Your words stay on this device;
              only the person with your ten-digit key can open it.
            </p>
            <div className="hero-signals">
              <span><Icon name="lock" size={15} /> No account</span>
              <i />
              <span><Icon name="shield" size={15} /> No message uploads</span>
              <i />
              <span>Made to be shared</span>
            </div>
          </div>
          <HeroEnvelope />
        </section>

        <section className="workbench" aria-labelledby="workbench-title">
          <div className="workbench-top">
            <div className="workbench-title-wrap">
              <span className="section-kicker">YOUR PRIVATE POST</span>
              <h2 id="workbench-title">What would you like to do?</h2>
            </div>
              <div className="mode-switch" role="group" aria-label="Message action">
              <button
                type="button"
                aria-pressed={mode === 'seal'}
                className={mode === 'seal' ? 'mode-tab selected' : 'mode-tab'}
                onClick={() => changeMode('seal')}
                disabled={busy}
              >
                <Icon name="send" size={16} /> Seal a message
              </button>
              <button
                type="button"
                aria-pressed={mode === 'open'}
                className={mode === 'open' ? 'mode-tab selected' : 'mode-tab'}
                onClick={() => changeMode('open')}
                disabled={busy}
              >
                <Icon name="lock" size={16} /> Open a message
              </button>
            </div>
          </div>

          <div className="workbench-body">
            <form className="compose-pane" onSubmit={handleSubmit}>
              {mode === 'seal' ? (
                <>
                  <div className="field-heading">
                    <label htmlFor="message-input">Your message</label>
                    <span className="field-hint">Encryption happens on this device</span>
                  </div>
                  <div className="message-input-frame">
                    <textarea
                      id="message-input"
                      value={message}
                      onChange={(event) => {
                        setMessage(event.target.value);
                        setSealedResult('');
                      }}
                      placeholder="Write something meant for one person…"
                      maxLength={MAX_TEXT_BYTES}
                      rows={7}
                      spellCheck="false"
                      autoCapitalize="sentences"
                      disabled={busy}
                      aria-describedby="message-limit"
                    />
                    <div className="message-footer">
                      <span className="message-scribble">Every word stays right here.</span>
                      <span id="message-limit" className={messageBytes > MAX_TEXT_BYTES ? 'byte-count over-limit' : 'byte-count'}>
                        {messageBytes.toLocaleString()} / 1 MiB
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="field-heading">
                    <label htmlFor="package-input">Sealed package</label>
                    <span className="field-hint">Paste the complete vf1 package</span>
                  </div>
                  <div className="message-input-frame package-frame">
                    <textarea
                      id="package-input"
                      value={envelopeInput}
                      onChange={(event) => {
                        setEnvelopeInput(event.target.value);
                        setOpenedResult('');
                      }}
                      placeholder="vf1. Paste the sealed message here…"
                      rows={7}
                      spellCheck="false"
                      autoCapitalize="off"
                      autoCorrect="off"
                      autoComplete="off"
                      maxLength={MAX_PACKAGE_CHARACTERS}
                      disabled={busy}
                    />
                    <div className="message-footer">
                      <span className="message-scribble">Pasted from a friend?</span>
                      <span className="byte-count">Vesperfold v1</span>
                    </div>
                  </div>
                </>
              )}

              <div className="pin-card">
                <div className="pin-card-top">
                  <div>
                    <label htmlFor="pin-input" className="pin-label">Your 10-digit key</label>
                    <p>{mode === 'seal' ? 'A random key is best · about 33 bits.' : 'Enter the exact key the sender shared.'}</p>
                  </div>
                  {mode === 'seal' && (
                    <button className="text-button generate-button" type="button" onClick={setNewPin} aria-label="Generate a random ten digit PIN" disabled={busy}>
                      <Icon name="sparkle" size={16} /> Make one
                    </button>
                  )}
                </div>
                <div className="pin-input-wrap">
                  <input
                    id="pin-input"
                    value={pin}
                    onChange={(event) => updatePin(event.target.value)}
                    type={pinVisible ? 'text' : 'password'}
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    minLength={10}
                    maxLength={10}
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    placeholder="0000000000"
                    aria-describedby="pin-status"
                    disabled={busy}
                  />
                  <span className="pin-progress" aria-hidden="true">{String(pin.length).padStart(2, '0')}<i>/10</i></span>
                  <button
                    className="icon-button pin-eye"
                    type="button"
                    onClick={() => setPinVisible((visible) => !visible)}
                    aria-label={pinVisible ? 'Hide PIN' : 'Show PIN'}
                    disabled={busy}
                  >
                    <Icon name={pinVisible ? 'eyeOff' : 'eye'} size={17} />
                  </button>
                </div>
                <div className="pin-bottom" id="pin-status">
                  <span className="pin-status-message">
                    <span className={isPinComplete ? 'pin-status-dot ready' : 'pin-status-dot'} />
                    {isPinComplete ? 'Ready to use' : 'Exactly 10 digits · leading zeros count'}
                  </span>
                  {isPinComplete && mode === 'seal' && (
                    <button
                      type="button"
                      className="small-copy"
                      onClick={() => copyValue(pin, 'pin')}
                      disabled={busy}
                    >
                      <Icon name={copied === 'pin' ? 'check' : 'copy'} size={13} />
                      {copied === 'pin' ? 'PIN copied' : 'Copy PIN'}
                    </button>
                  )}
                </div>
              </div>

              {error && <div className="error-banner" role="alert"><span className="error-mark">!</span>{error}</div>}

              <div className="submit-row">
                <button className="primary-button" type="submit" disabled={busy || !isPinComplete}>
                  {busy ? <><span className="spinner" /> {busyLabel || 'Working locally…'}</> : <>{mode === 'seal' ? 'Seal this message' : 'Open this message'} <Icon name="arrow" size={18} /></>}
                </button>
                <span className="submit-meta"><Icon name="shield" size={14} /> Processed on this device</span>
              </div>
            </form>

            <section className={resultExists ? 'result-pane has-result' : 'result-pane'} aria-live="polite" aria-label={mode === 'seal' ? 'Sealed package' : 'Opened message'}>
              <div className="result-heading">
                <div>
                  <span className="section-kicker">{mode === 'seal' ? 'THE SEALED NOTE' : 'THE OPENED NOTE'}</span>
                  <h3>{mode === 'seal' ? 'Ready to travel' : 'Waiting to be opened'}</h3>
                </div>
                  {resultExists && <span className="seal-check"><Icon name="check" size={14} /> {mode === 'seal' ? 'Sealed' : 'Verified'}</span>}
              </div>

              {mode === 'seal' && sealedResult ? (
                <div className="result-content">
                  <div className="result-success-line"><span className="result-pulse" /> Your message is sealed</div>
                  <textarea className="result-textarea envelope-output" readOnly value={sealedResult} aria-label="Encrypted package" onFocus={(event) => event.currentTarget.select()} />
                  <div className="result-buttons">
                    <button className="primary-button result-copy-button" type="button" onClick={() => copyValue(sealedResult, 'envelope')}>
                      <Icon name={copied === 'envelope' ? 'check' : 'copy'} size={16} /> {copied === 'envelope' ? 'Package copied' : 'Copy package'}
                    </button>
                    <button className="secondary-button" type="button" onClick={downloadEnvelope}><Icon name="download" size={16} /> Save .vf1</button>
                  </div>
                  <div className="share-note"><span className="share-note-icon"><Icon name="send" size={15} /></span><p><strong>Two separate deliveries.</strong> Send the package, then share the 10-digit key through another channel.</p></div>
                </div>
              ) : mode === 'open' && openedResult ? (
                <div className="result-content">
                  <div className="result-success-line"><span className="result-pulse" /> Seal verified · plaintext stays here</div>
                  <textarea className="result-textarea opened-output" readOnly value={openedResult} aria-label="Decrypted message" onFocus={(event) => event.currentTarget.select()} />
                  <div className="result-buttons">
                    <button className="primary-button result-copy-button" type="button" onClick={() => copyValue(openedResult, 'message')}>
                      <Icon name={copied === 'message' ? 'check' : 'copy'} size={16} /> {copied === 'message' ? 'Message copied' : 'Copy message'}
                    </button>
                    <button className="secondary-button" type="button" onClick={downloadOpenedMessage}><Icon name="download" size={16} /> Save .txt</button>
                  </div>
                  <div className="share-note"><span className="share-note-icon"><Icon name="lock" size={15} /></span><p><strong>Keep it private.</strong> Anyone who sees the opened message can read or copy it.</p></div>
                </div>
              ) : (
                <div className="empty-result">
                  <div className="empty-art" aria-hidden="true">
                    <div className="empty-art-ring ring-back" />
                    <div className="empty-art-ring ring-front" />
                    <div className="empty-envelope"><span /><i /></div>
                    <div className="empty-spark spark-a">✦</div>
                    <div className="empty-spark spark-b">✳</div>
                  </div>
                  <p>{mode === 'seal' ? 'Your sealed package will appear here.' : 'The message will appear here once the seal checks out.'}</p>
                  <span>{mode === 'seal' ? 'Write your note, add a key, and seal it.' : 'Paste a package and enter its 10-digit key.'}</span>
                </div>
              )}

              <div className="result-footnote"><span className="tiny-lock"><Icon name="lock" size={12} /></span> No copy is kept by Vesperfold.</div>
            </section>
          </div>
        </section>

        <section className="trust-row" id="how-it-works">
          <div className="trust-title"><span className="section-kicker">THREE QUIET STEPS</span><h2>Simple by design.</h2><p>No accounts, no inbox, no middleman.</p></div>
          <div className="trust-step"><span className="step-number">01</span><div><h3>Write it here</h3><p>Your text stays in the browser. A local key is derived when you seal.</p></div></div>
          <div className="trust-step"><span className="step-number">02</span><div><h3>Share the package</h3><p>Send the <code>vf1.</code> package through your usual channel.</p></div></div>
          <div className="trust-step"><span className="step-number">03</span><div><h3>Share the key apart</h3><p>Give the ten digits to the recipient through a different channel.</p></div></div>
        </section>

        <section className="limits-card" id="limits">
          <div className="limits-emblem"><Icon name="shield" size={22} /></div>
          <div className="limits-copy">
            <span className="section-kicker">A CLEAR-EYED SECURITY NOTE</span>
            <h2>Ten digits help. They are not a magic shield.</h2>
            <p>
              A random ten-digit key has 10 billion possibilities (about 33 bits). Argon2id makes each guess more costly,
              but someone with a copy of a package can try guesses offline. Use Vesperfold for casual privacy, not for
              high-risk secrets. For stronger protection, use a long passphrase and share it separately.
            </p>
          </div>
          <div className="limits-stat"><strong>10<sup>10</sup></strong><span>possible ten-digit keys</span></div>
        </section>

        <section className="protocol-note" aria-label="Protocol details">
          <span className="protocol-icon"><Icon name="lock" size={16} /></span>
          <p><strong>Under the fold:</strong> Argon2id · XChaCha20-Poly1305 · a fresh random salt and nonce for each package · authenticated metadata.</p>
          <span className="protocol-version">PROTOCOL VF1</span>
        </section>
      </main>

      <footer className="site-footer content-width">
        <a className="footer-brand" href="#top"><BrandMark /><span>vesperfold<span className="brand-period">.</span></span></a>
        <p>Open source · MIT licensed · No tracking · No server</p>
        <a className="back-top" href="#top">Back to top <span>↑</span></a>
      </footer>
    </div>
  );
}

export default App;
