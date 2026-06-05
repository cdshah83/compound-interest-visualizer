'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

type DataPoint = { year: number; balance: number; totalContrib: number };

function fmt(n: number): string {
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + Math.round(n).toLocaleString();
}

function fmtFull(n: number): string {
  return '$' + Math.round(n).toLocaleString();
}

function calcData(principal: number, monthly: number, rate: number, years: number, freq: number): DataPoint[] {
  const r = rate / 100 / freq;
  const data: DataPoint[] = [];
  let balance = principal;
  let totalContrib = principal;
  for (let y = 1; y <= years; y++) {
    for (let p = 0; p < freq; p++) {
      balance = balance * (1 + r) + monthly * (12 / freq);
    }
    totalContrib += monthly * 12;
    data.push({ year: y, balance, totalContrib: Math.min(totalContrib, balance) });
  }
  return data;
}

function clamp(v: number, min: number, max: number) {
  return isFinite(v) && v >= min && v <= max ? v : NaN;
}

function calcGoal(target: number, principal: number, rate: number, years: number, freq: number): number {
  if (rate === 0) return Math.max(0, (target - principal) / (years * 12));
  const r = rate / 100 / freq;
  const g = Math.pow(1 + r, freq * years);
  return Math.max(0, (target - principal * g) * r / ((g - 1) * (12 / freq)));
}

function FreqToggle({ value, onChange }: { value: number; onChange: (f: number) => void }) {
  return (
    <div className="compound-toggle">
      {([{ label: 'Monthly', freq: 12 }, { label: 'Quarterly', freq: 4 }, { label: 'Yearly', freq: 1 }] as const).map(
        ({ label, freq }) => (
          <button key={freq} className={`toggle-btn${value === freq ? ' active' : ''}`} onClick={() => onChange(freq)}>
            {label}
          </button>
        )
      )}
    </div>
  );
}

function Calculator() {
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<'calc' | 'goal' | 'compare'>(() => {
    const m = searchParams.get('mode');
    return m === 'goal' ? 'goal' : m === 'compare' ? 'compare' : 'calc';
  });

  // Scenario A
  const [principal, setPrincipal] = useState(() => clamp(Number(searchParams.get('p')), 1000, 500000) || 10000);
  const [monthly, setMonthly] = useState(() => { const v = Number(searchParams.get('m')); return isFinite(v) && v >= 0 && v <= 5000 ? v : 500; });
  const [rate, setRate] = useState(() => clamp(Number(searchParams.get('r')), 1, 20) || 7);
  const [years, setYears] = useState(() => clamp(Number(searchParams.get('y')), 1, 50) || 30);
  const [compoundFreq, setCompoundFreq] = useState(() => { const f = Number(searchParams.get('f')); return [1, 4, 12].includes(f) ? f : 4; });
  const [target, setTarget] = useState(() => clamp(Number(searchParams.get('target')), 50000, 5000000) || 500000);

  // Scenario B
  const [principalB, setPrincipalB] = useState(() => clamp(Number(searchParams.get('bp')), 1000, 500000) || 10000);
  const [monthlyB, setMonthlyB] = useState(() => { const v = Number(searchParams.get('bm')); return isFinite(v) && v >= 0 && v <= 5000 ? v : 500; });
  const [rateB, setRateB] = useState(() => clamp(Number(searchParams.get('br')), 1, 20) || 7);
  const [yearsB, setYearsB] = useState(() => clamp(Number(searchParams.get('by')), 1, 50) || 30);
  const [freqB, setFreqB] = useState(() => { const f = Number(searchParams.get('bf')); return [1, 4, 12].includes(f) ? f : 4; });

  const [chartWidth, setChartWidth] = useState(600);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const hasCopiedToB = useRef(!!searchParams.get('bp'));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setChartWidth(el.clientWidth - 60);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Copy A → B the first time user enters compare mode (unless B came from URL)
  useEffect(() => {
    if (mode === 'compare' && !hasCopiedToB.current) {
      hasCopiedToB.current = true;
      setPrincipalB(principal);
      setMonthlyB(monthly);
      setRateB(rate);
      setYearsB(years);
      setFreqB(compoundFreq);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    const base = { p: String(principal), r: String(rate), y: String(years), f: String(compoundFreq) };
    let params: URLSearchParams;
    if (mode === 'goal') {
      params = new URLSearchParams({ ...base, mode: 'goal', target: String(target) });
    } else if (mode === 'compare') {
      params = new URLSearchParams({
        ...base, m: String(monthly), mode: 'compare',
        bp: String(principalB), bm: String(monthlyB), br: String(rateB), by: String(yearsB), bf: String(freqB),
      });
    } else {
      params = new URLSearchParams({ ...base, m: String(monthly) });
    }
    window.history.replaceState(null, '', '?' + params.toString());
  }, [mode, principal, monthly, rate, years, compoundFreq, target, principalB, monthlyB, rateB, yearsB, freqB]);

  // Scenario A data
  const goalMonthly = mode === 'goal' ? calcGoal(target, principal, rate, years, compoundFreq) : monthly;
  const data = calcData(principal, goalMonthly, rate, years, compoundFreq);
  const final = data[data.length - 1].balance;
  const totalContrib = data[data.length - 1].totalContrib;
  const interest = final - totalContrib;
  const interestPct = ((interest / totalContrib) * 100).toFixed(0);
  const multiplier = (final / principal).toFixed(1);

  // Scenario B data (compare mode only)
  const dataB = mode === 'compare' ? calcData(principalB, monthlyB, rateB, yearsB, freqB) : null;
  const finalB = dataB ? dataB[dataB.length - 1].balance : 0;
  const diff = finalB - final;

  // Chart geometry — unified scale for both scenarios
  const H = 220;
  const W = chartWidth;
  const maxVal = data[data.length - 1].balance;
  const maxValB = dataB ? dataB[dataB.length - 1].balance : 0;
  const chartMax = mode === 'compare' ? Math.max(maxVal, maxValB) : maxVal;
  const unifiedLen = mode === 'compare' && dataB ? Math.max(data.length, dataB.length) : data.length;
  const px = (i: number, len: number) => 40 + (i / (len - 1)) * (W - 50);
  const py = (v: number) => H - 30 - (v / chartMax) * (H - 50);

  // Path data — Scenario A
  let balPath = `M ${px(0, unifiedLen)} ${py(data[0].balance)}`;
  data.forEach((d, i) => { balPath += ` L ${px(i, unifiedLen)} ${py(d.balance)}`; });
  const balArea = balPath + ` L ${px(data.length - 1, unifiedLen)} ${H - 30} L ${px(0, unifiedLen)} ${H - 30} Z`;

  let contribPath = `M ${px(0, unifiedLen)} ${py(data[0].totalContrib)}`;
  data.forEach((d, i) => { contribPath += ` L ${px(i, unifiedLen)} ${py(d.totalContrib)}`; });
  const contribArea = contribPath + ` L ${px(data.length - 1, unifiedLen)} ${H - 30} L ${px(0, unifiedLen)} ${H - 30} Z`;

  // Path data — Scenario B
  let balPathB = '';
  if (dataB) {
    balPathB = `M ${px(0, unifiedLen)} ${py(dataB[0].balance)}`;
    dataB.forEach((d, i) => { balPathB += ` L ${px(i, unifiedLen)} ${py(d.balance)}`; });
  }

  const gridLines = Array.from({ length: 5 }, (_, i) => ({
    y: H - 30 - (i / 4) * (H - 50),
    val: (chartMax * i) / 4,
  }));

  const labelCount = Math.min(6, unifiedLen);
  const xLabels = Array.from({ length: labelCount }, (_, i) => {
    const idx = Math.round((i * (unifiedLen - 1)) / (labelCount - 1));
    const year = idx < data.length ? data[idx].year : (dataB && idx < dataB.length ? dataB[idx].year : idx + 1);
    return { x: px(idx, unifiedLen), label: `Yr ${year}` };
  });

  const step = Math.max(1, Math.floor(data.length / 8));
  const milestones: DataPoint[] = [];
  for (let i = step - 1; i < data.length; i += step) milestones.push(data[i]);
  if (milestones[milestones.length - 1] !== data[data.length - 1]) milestones.push(data[data.length - 1]);

  function handleMouseMove(e: React.MouseEvent<SVGRectElement>) {
    const svgEl = e.currentTarget.closest('svg') as SVGSVGElement;
    const containerEl = containerRef.current!;
    const svgRect = svgEl.getBoundingClientRect();
    const containerRect = containerEl.getBoundingClientRect();
    const mx = e.clientX - svgRect.left;
    const idx = Math.max(0, Math.min(unifiedLen - 1, Math.round(((mx - 40) / (W - 50)) * (unifiedLen - 1))));
    setHoveredIdx(idx);
    let tx = e.clientX - containerRect.left + 12;
    if (tx + 220 > containerRect.width) tx -= 240;
    const aY = idx < data.length ? py(data[idx].balance) : py(0);
    const ty = aY + svgRect.top - containerRect.top - 10;
    setTooltipPos({ x: tx, y: ty });
  }

  const panelA = (
    <aside className="panel">
      <div className="mode-tabs">
        <button className={`mode-tab${mode === 'calc' ? ' active' : ''}`} onClick={() => setMode('calc')}>Calculate</button>
        <button className={`mode-tab${mode === 'goal' ? ' active' : ''}`} onClick={() => setMode('goal')}>Goal</button>
        <button className={`mode-tab${mode === 'compare' ? ' active' : ''}`} onClick={() => setMode('compare')}>Compare</button>
      </div>

      {mode === 'compare' && <div className="panel-scenario-label" style={{ color: 'var(--gold)' }}>Scenario A</div>}

      <div className="field">
        <div className="field-header">
          <span className="field-label">Initial Investment</span>
          <span className="field-value gold">{fmtFull(principal)}</span>
        </div>
        <input type="range" min="1000" max="500000" step="1000" value={principal} onChange={e => setPrincipal(+e.target.value)} />
      </div>

      {mode === 'calc' || mode === 'compare' ? (
        <div className="field">
          <div className="field-header">
            <span className="field-label">Monthly Contribution</span>
            <span className="field-value gold">${monthly.toLocaleString()}</span>
          </div>
          <input type="range" min="0" max="5000" step="50" value={monthly} onChange={e => setMonthly(+e.target.value)} />
        </div>
      ) : (
        <div className="field">
          <div className="field-header">
            <span className="field-label">Target Balance</span>
            <span className="field-value gold">{fmtFull(target)}</span>
          </div>
          <input type="range" min="50000" max="5000000" step="10000" value={target} onChange={e => setTarget(+e.target.value)} />
        </div>
      )}

      <div className="field">
        <div className="field-header">
          <span className="field-label">Annual Return</span>
          <span className="field-value">{rate}%</span>
        </div>
        <input type="range" min="1" max="20" step="0.5" value={rate} onChange={e => setRate(+e.target.value)} />
      </div>

      <div className="field">
        <div className="field-header">
          <span className="field-label">Time Horizon</span>
          <span className="field-value">{years} {years === 1 ? 'year' : 'years'}</span>
        </div>
        <input type="range" min="1" max="50" step="1" value={years} onChange={e => setYears(+e.target.value)} />
      </div>

      <div className="divider" />

      <div className="field">
        <div className="field-header" style={{ marginBottom: '0.6rem' }}>
          <span className="field-label">Compound Frequency</span>
        </div>
        <FreqToggle value={compoundFreq} onChange={setCompoundFreq} />
      </div>

      {mode === 'goal' && (
        <>
          <div className="divider" />
          <div className="goal-answer">
            <div className="stat-label">Save monthly</div>
            <div className="stat-number gold">{fmtFull(goalMonthly)}</div>
            <div className="stat-sub">
              {goalMonthly === 0
                ? 'Your initial investment already covers this goal.'
                : `to reach ${fmtFull(target)} in ${years} ${years === 1 ? 'year' : 'years'}`}
            </div>
          </div>
        </>
      )}
    </aside>
  );

  const panelB = (
    <aside className="panel panel-b">
      <div className="panel-scenario-label" style={{ color: 'var(--green)' }}>Scenario B</div>

      <div className="field">
        <div className="field-header">
          <span className="field-label">Initial Investment</span>
          <span className="field-value" style={{ color: 'var(--green)' }}>{fmtFull(principalB)}</span>
        </div>
        <input type="range" min="1000" max="500000" step="1000" value={principalB} onChange={e => setPrincipalB(+e.target.value)} className="range-b" />
      </div>

      <div className="field">
        <div className="field-header">
          <span className="field-label">Monthly Contribution</span>
          <span className="field-value" style={{ color: 'var(--green)' }}>${monthlyB.toLocaleString()}</span>
        </div>
        <input type="range" min="0" max="5000" step="50" value={monthlyB} onChange={e => setMonthlyB(+e.target.value)} className="range-b" />
      </div>

      <div className="field">
        <div className="field-header">
          <span className="field-label">Annual Return</span>
          <span className="field-value">{rateB}%</span>
        </div>
        <input type="range" min="1" max="20" step="0.5" value={rateB} onChange={e => setRateB(+e.target.value)} className="range-b" />
      </div>

      <div className="field">
        <div className="field-header">
          <span className="field-label">Time Horizon</span>
          <span className="field-value">{yearsB} {yearsB === 1 ? 'year' : 'years'}</span>
        </div>
        <input type="range" min="1" max="50" step="1" value={yearsB} onChange={e => setYearsB(+e.target.value)} className="range-b" />
      </div>

      <div className="divider" />

      <div className="field">
        <div className="field-header" style={{ marginBottom: '0.6rem' }}>
          <span className="field-label">Compound Frequency</span>
        </div>
        <FreqToggle value={freqB} onChange={setFreqB} />
      </div>
    </aside>
  );

  return (
    <>
      <header className="header">
        <div className="logo">com<span>pound</span></div>
        <div className="tagline">Watch your wealth multiply</div>
      </header>

      <div className={`app${mode === 'compare' ? ' app-compare' : ''}`}>
        {panelA}
        {mode === 'compare' && panelB}

        <div className="results">
          {/* Stats row */}
          {mode === 'compare' ? (
            <div className="stats-row">
              <div className="stat-card highlight">
                <div className="stat-label">Scenario A</div>
                <div className="stat-number gold">{fmtFull(final)}</div>
                <div className="stat-sub">final balance</div>
              </div>
              <div className="stat-card green-highlight">
                <div className="stat-label">Scenario B</div>
                <div className="stat-number" style={{ color: 'var(--green)' }}>{fmtFull(finalB)}</div>
                <div className="stat-sub">final balance</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Difference</div>
                <div className="stat-number" style={{ color: diff >= 0 ? 'var(--green)' : '#e05555' }}>
                  {diff >= 0 ? '+' : ''}{fmtFull(diff)}
                </div>
                <div className="stat-sub">B minus A</div>
              </div>
            </div>
          ) : (
            <div className="stats-row">
              {mode === 'goal' ? (
                <div className="stat-card highlight">
                  <div className="stat-label">Monthly Needed</div>
                  <div className="stat-number gold">{fmtFull(goalMonthly)}</div>
                  <div className="stat-sub">to reach {fmtFull(target)}</div>
                </div>
              ) : (
                <div className="stat-card highlight">
                  <div className="stat-label">Final Balance</div>
                  <div className="stat-number gold">{fmtFull(final)}</div>
                  <div className="stat-sub">{multiplier}× your initial investment</div>
                </div>
              )}
              <div className="stat-card">
                <div className="stat-label">{mode === 'goal' ? 'Final Balance' : 'Total Contributed'}</div>
                <div className="stat-number">{mode === 'goal' ? fmtFull(final) : fmtFull(totalContrib)}</div>
                <div className="stat-sub">{mode === 'goal' ? `${multiplier}× your money` : 'principal + deposits'}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Interest Earned</div>
                <div className="stat-number green">{fmtFull(interest)}</div>
                <div className="stat-sub">{interestPct}% of final balance</div>
              </div>
            </div>
          )}

          {/* Affiliate CTAs */}
          <div className="affiliate-cta">
            <div className="affiliate-headline">
              Start building your {fmtFull(final)} — pick a platform
            </div>
            <div className="affiliate-cards">
              {([
                { name: 'Robinhood',  tag: 'Best for beginners',      hook: 'Free stock on signup',       href: '#robinhood' },
                { name: 'M1 Finance', tag: 'Best for auto-investing',  hook: 'Automatic rebalancing',      href: '#m1' },
                { name: 'Public.com', tag: 'Best for transparency',    hook: 'No payment for order flow',  href: '#public' },
              ] as const).map(({ name, tag, hook, href }) => (
                <a key={name} href={href} target="_blank" rel="noopener noreferrer" className="affiliate-card">
                  <div className="affiliate-name">{name}</div>
                  <div className="affiliate-tag">{tag}</div>
                  <div className="affiliate-hook">{hook}</div>
                  <div className="affiliate-btn">Open account →</div>
                </a>
              ))}
            </div>
            <div className="affiliate-disclosure">Affiliate links — we may earn a commission at no cost to you</div>
          </div>

          {/* Chart */}
          <div className="chart-container" ref={containerRef}>
            <div className="chart-header">
              <div className="chart-title">Growth Over Time</div>
              <div className="legend">
                {mode === 'compare' ? (
                  <>
                    <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--gold)' }} />Scenario A</div>
                    <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--green)' }} />Scenario B</div>
                  </>
                ) : (
                  <>
                    <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--gold)' }} />Total Balance</div>
                    <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--surface2)', border: '1px solid var(--muted)' }} />Contributions</div>
                  </>
                )}
              </div>
            </div>

            <svg className="chart" height={H} viewBox={`0 0 ${W} ${H}`}>
              <defs>
                <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#c9a84c" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {gridLines.map(({ y, val }, i) => (
                <g key={i}>
                  <line x1={40} x2={W - 10} y1={y} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  <text x={35} y={y + 4} textAnchor="end" fill="#7a7a8a" fontSize="10" fontFamily="var(--font-dm-sans), sans-serif">{fmt(val)}</text>
                </g>
              ))}

              {mode !== 'compare' && <path d={contribArea} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />}
              <path d={balArea} fill="url(#goldGrad)" />
              <path d={balPath} fill="none" stroke="#c9a84c" strokeWidth="2" />
              {dataB && <path d={balPathB} fill="none" stroke="#4caf82" strokeWidth="2" strokeDasharray="6,3" />}

              {xLabels.map(({ x, label }, i) => (
                <text key={i} x={x} y={H - 10} textAnchor="middle" fill="#7a7a8a" fontSize="10" fontFamily="var(--font-dm-sans), sans-serif">{label}</text>
              ))}

              {hoveredIdx !== null && hoveredIdx < data.length && (
                <>
                  <line x1={px(hoveredIdx, unifiedLen)} x2={px(hoveredIdx, unifiedLen)} y1={0} y2={H - 30}
                    stroke="rgba(201,168,76,0.3)" strokeWidth="1" strokeDasharray="3,3" />
                  <circle cx={px(hoveredIdx, unifiedLen)} cy={py(data[hoveredIdx].balance)} r={5}
                    fill="#c9a84c" stroke="#0d0f14" strokeWidth="2" />
                  {dataB && hoveredIdx < dataB.length && (
                    <circle cx={px(hoveredIdx, unifiedLen)} cy={py(dataB[hoveredIdx].balance)} r={5}
                      fill="#4caf82" stroke="#0d0f14" strokeWidth="2" />
                  )}
                </>
              )}

              <rect x={40} y={0} width={W - 50} height={H - 30} fill="transparent"
                style={{ cursor: 'crosshair' }}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoveredIdx(null)} />
            </svg>

            {hoveredIdx !== null && hoveredIdx < data.length && (
              <div className="tooltip visible" style={{ left: tooltipPos.x, top: tooltipPos.y }}>
                <strong>Year {data[hoveredIdx].year}</strong>
                &nbsp;A: {fmtFull(data[hoveredIdx].balance)}
                {dataB && hoveredIdx < dataB.length && <> / B: {fmtFull(dataB[hoveredIdx].balance)}</>}
              </div>
            )}
          </div>

          {/* Milestones — hidden in compare mode */}
          {mode !== 'compare' && (
            <div className="milestones">
              <div className="milestones-title">Year-by-Year Milestones</div>
              <table>
                <thead>
                  <tr><th>Year</th><th>Balance</th><th>Contributed</th><th>Gain</th><th>Growth</th></tr>
                </thead>
                <tbody>
                  {milestones.map(d => {
                    const gain = d.balance - d.totalContrib;
                    const gainPct = ((d.balance / d.totalContrib - 1) * 100).toFixed(0);
                    return (
                      <tr key={d.year}>
                        <td>Year {d.year}</td>
                        <td className="gold">{fmtFull(d.balance)}</td>
                        <td>{fmtFull(d.totalContrib)}</td>
                        <td className="green">+{fmtFull(gain)}</td>
                        <td><span className="growth-badge">+{gainPct}%</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <section className="explainer">
        <div className="explainer-inner">
          <div className="explainer-block">
            <h2 className="explainer-heading">What is Compound Interest?</h2>
            <p>Compound interest is the process of earning interest on both your original principal <em>and</em> the interest you've already accumulated. Unlike simple interest — which only grows your initial deposit — compound interest accelerates wealth building exponentially over time. The longer your money compounds, the faster it grows.</p>
            <p>Albert Einstein reportedly called compound interest <em>"the eighth wonder of the world. He who understands it, earns it; he who doesn't, pays it."</em> Whether or not Einstein said it, the math is undeniable: time and consistency are the two most powerful levers in any investment strategy.</p>
          </div>
          <div className="explainer-grid">
            <div className="explainer-card">
              <h3>The Formula</h3>
              <div className="explainer-formula">A = P(1 + r/n)<sup>nt</sup></div>
              <ul>
                <li><strong>A</strong> — Final balance</li>
                <li><strong>P</strong> — Principal (initial investment)</li>
                <li><strong>r</strong> — Annual interest rate</li>
                <li><strong>n</strong> — Compounding periods per year</li>
                <li><strong>t</strong> — Time in years</li>
              </ul>
              <p>This calculator applies the formula in real time as you adjust the sliders, adding monthly contributions at each compounding period.</p>
            </div>
            <div className="explainer-card">
              <h3>Why Monthly Contributions Matter</h3>
              <p>Regular contributions dramatically amplify compound growth. A $10,000 investment at 7% over 30 years grows to roughly $76,000. Add just $500 per month and that number jumps to over $660,000 — nearly 9× more.</p>
              <p>This multiplier effect happens because each contribution starts compounding immediately. The earlier and more consistently you invest, the less you rely on a large initial lump sum.</p>
            </div>
            <div className="explainer-card">
              <h3>Compound Frequency</h3>
              <p>The more frequently interest compounds, the more you earn. Monthly compounding outperforms quarterly, which outperforms annual — because each cycle adds interest to a slightly larger base.</p>
              <p>In practice, most index funds and ETFs compound effectively on a daily or continuous basis through price appreciation and dividend reinvestment. Use the frequency toggle in the calculator to compare scenarios.</p>
            </div>
            <div className="explainer-card">
              <h3>Start Early — Time Is the Key Variable</h3>
              <p>Time is the most powerful input in the compound interest equation. Starting at 25 instead of 35 — with identical contributions and returns — can mean a difference of hundreds of thousands of dollars by retirement.</p>
              <p>Use the Time Horizon slider to see exactly how many years of compounding changes your outcome. Even adding five extra years late in the horizon produces outsized results due to exponential growth.</p>
            </div>
          </div>
          <div className="explainer-block">
            <h2 className="explainer-heading">How to Use This Calculator</h2>
            <p>Set your <strong>Initial Investment</strong> to the lump sum you plan to invest today. Add a <strong>Monthly Contribution</strong> for what you can commit each month. Adjust the <strong>Annual Return</strong> based on your expected portfolio — the S&amp;P 500 has historically averaged around 7% after inflation. Finally, set your <strong>Time Horizon</strong> to your target year. The chart and milestone table update instantly.</p>
            <p>Once you see your projected balance, use the platform links above to open a brokerage account and start putting those numbers into motion.</p>
          </div>
        </div>
      </section>
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <Calculator />
    </Suspense>
  );
}
