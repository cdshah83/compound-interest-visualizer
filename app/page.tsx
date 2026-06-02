'use client';
import { useState, useEffect, useRef } from 'react';

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

export default function Home() {
  const [principal, setPrincipal] = useState(10000);
  const [monthly, setMonthly] = useState(500);
  const [rate, setRate] = useState(7);
  const [years, setYears] = useState(30);
  const [compoundFreq, setCompoundFreq] = useState(4);
  const [chartWidth, setChartWidth] = useState(600);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setChartWidth(el.clientWidth - 60);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const data = calcData(principal, monthly, rate, years, compoundFreq);
  const final = data[data.length - 1].balance;
  const totalContrib = data[data.length - 1].totalContrib;
  const interest = final - totalContrib;
  const interestPct = ((interest / totalContrib) * 100).toFixed(0);
  const multiplier = (final / principal).toFixed(1);

  const H = 220;
  const W = chartWidth;
  const maxVal = data[data.length - 1].balance;
  const px = (i: number) => 40 + (i / (data.length - 1)) * (W - 50);
  const py = (v: number) => H - 30 - (v / maxVal) * (H - 50);

  let balPath = `M ${px(0)} ${py(data[0].balance)}`;
  data.forEach((d, i) => { balPath += ` L ${px(i)} ${py(d.balance)}`; });
  const balArea = balPath + ` L ${px(data.length - 1)} ${H - 30} L ${px(0)} ${H - 30} Z`;

  let contribPath = `M ${px(0)} ${py(data[0].totalContrib)}`;
  data.forEach((d, i) => { contribPath += ` L ${px(i)} ${py(d.totalContrib)}`; });
  const contribArea = contribPath + ` L ${px(data.length - 1)} ${H - 30} L ${px(0)} ${H - 30} Z`;

  const gridLines = Array.from({ length: 5 }, (_, i) => ({
    y: H - 30 - (i / 4) * (H - 50),
    val: (maxVal * i) / 4,
  }));

  const labelCount = Math.min(6, data.length);
  const xLabels = Array.from({ length: labelCount }, (_, i) => {
    const idx = Math.round((i * (data.length - 1)) / (labelCount - 1));
    return { x: px(idx), label: `Yr ${data[idx].year}` };
  });

  const step = Math.max(1, Math.floor(data.length / 8));
  const milestones: DataPoint[] = [];
  for (let i = step - 1; i < data.length; i += step) milestones.push(data[i]);
  if (milestones[milestones.length - 1] !== data[data.length - 1]) {
    milestones.push(data[data.length - 1]);
  }

  function handleMouseMove(e: React.MouseEvent<SVGRectElement>) {
    const svgEl = e.currentTarget.closest('svg') as SVGSVGElement;
    const containerEl = containerRef.current!;
    const svgRect = svgEl.getBoundingClientRect();
    const containerRect = containerEl.getBoundingClientRect();
    const mx = e.clientX - svgRect.left;
    const idx = Math.max(0, Math.min(data.length - 1, Math.round(((mx - 40) / (W - 50)) * (data.length - 1))));
    setHoveredIdx(idx);
    let tx = e.clientX - containerRect.left + 12;
    if (tx + 180 > containerRect.width) tx -= 200;
    const ty = py(data[idx].balance) + svgRect.top - containerRect.top - 10;
    setTooltipPos({ x: tx, y: ty });
  }

  return (
    <>
      <header className="header">
        <div className="logo">com<span>pound</span></div>
        <div className="tagline">Watch your wealth multiply</div>
      </header>

      <div className="app">
        <aside className="panel">
          <div className="panel-title">Your Inputs</div>

          <div className="field">
            <div className="field-header">
              <span className="field-label">Initial Investment</span>
              <span className="field-value gold">{fmtFull(principal)}</span>
            </div>
            <input type="range" min="1000" max="500000" step="1000" value={principal}
              onChange={e => setPrincipal(+e.target.value)} />
          </div>

          <div className="field">
            <div className="field-header">
              <span className="field-label">Monthly Contribution</span>
              <span className="field-value gold">${monthly.toLocaleString()}</span>
            </div>
            <input type="range" min="0" max="5000" step="50" value={monthly}
              onChange={e => setMonthly(+e.target.value)} />
          </div>

          <div className="field">
            <div className="field-header">
              <span className="field-label">Annual Return</span>
              <span className="field-value">{rate}%</span>
            </div>
            <input type="range" min="1" max="20" step="0.5" value={rate}
              onChange={e => setRate(+e.target.value)} />
          </div>

          <div className="field">
            <div className="field-header">
              <span className="field-label">Time Horizon</span>
              <span className="field-value">{years} {years === 1 ? 'year' : 'years'}</span>
            </div>
            <input type="range" min="1" max="50" step="1" value={years}
              onChange={e => setYears(+e.target.value)} />
          </div>

          <div className="divider" />

          <div className="field">
            <div className="field-header" style={{ marginBottom: '0.6rem' }}>
              <span className="field-label">Compound Frequency</span>
            </div>
            <div className="compound-toggle">
              {([{ label: 'Monthly', freq: 12 }, { label: 'Quarterly', freq: 4 }, { label: 'Yearly', freq: 1 }] as const).map(
                ({ label, freq }) => (
                  <button
                    key={freq}
                    className={`toggle-btn${compoundFreq === freq ? ' active' : ''}`}
                    onClick={() => setCompoundFreq(freq)}
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          </div>
        </aside>

        <div className="results">
          <div className="stats-row">
            <div className="stat-card highlight">
              <div className="stat-label">Final Balance</div>
              <div className="stat-number gold">{fmtFull(final)}</div>
              <div className="stat-sub">{multiplier}× your initial investment</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Contributed</div>
              <div className="stat-number">{fmtFull(totalContrib)}</div>
              <div className="stat-sub">principal + deposits</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Interest Earned</div>
              <div className="stat-number green">{fmtFull(interest)}</div>
              <div className="stat-sub">{interestPct}% of final balance</div>
            </div>
          </div>

          <div className="chart-container" ref={containerRef}>
            <div className="chart-header">
              <div className="chart-title">Growth Over Time</div>
              <div className="legend">
                <div className="legend-item">
                  <div className="legend-dot" style={{ background: 'var(--gold)' }} />
                  Total Balance
                </div>
                <div className="legend-item">
                  <div className="legend-dot" style={{ background: 'var(--surface2)', border: '1px solid var(--muted)' }} />
                  Contributions
                </div>
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
                  <text x={35} y={y + 4} textAnchor="end" fill="#7a7a8a" fontSize="10"
                    fontFamily="var(--font-dm-sans), sans-serif">{fmt(val)}</text>
                </g>
              ))}

              <path d={contribArea} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              <path d={balArea} fill="url(#goldGrad)" />
              <path d={balPath} fill="none" stroke="#c9a84c" strokeWidth="2" />

              {xLabels.map(({ x, label }, i) => (
                <text key={i} x={x} y={H - 10} textAnchor="middle" fill="#7a7a8a" fontSize="10"
                  fontFamily="var(--font-dm-sans), sans-serif">{label}</text>
              ))}

              {hoveredIdx !== null && (
                <>
                  <line x1={px(hoveredIdx)} x2={px(hoveredIdx)} y1={0} y2={H - 30}
                    stroke="rgba(201,168,76,0.3)" strokeWidth="1" strokeDasharray="3,3" />
                  <circle cx={px(hoveredIdx)} cy={py(data[hoveredIdx].balance)} r={5}
                    fill="#c9a84c" stroke="#0d0f14" strokeWidth="2" />
                </>
              )}

              <rect x={40} y={0} width={W - 50} height={H - 30} fill="transparent"
                style={{ cursor: 'crosshair' }}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoveredIdx(null)} />
            </svg>

            {hoveredIdx !== null && (
              <div className="tooltip visible" style={{ left: tooltipPos.x, top: tooltipPos.y }}>
                <strong>Year {data[hoveredIdx].year}</strong>&nbsp; {fmtFull(data[hoveredIdx].balance)}
              </div>
            )}
          </div>

          <div className="milestones">
            <div className="milestones-title">Year-by-Year Milestones</div>
            <table>
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Balance</th>
                  <th>Contributed</th>
                  <th>Gain</th>
                  <th>Growth</th>
                </tr>
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
        </div>
      </div>
    </>
  );
}
