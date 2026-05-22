// components.jsx — shared building blocks for Watt
// Avatars, accolades, icons, charts, tier colors, metric tiles

const tierColor = (tier) => ({
  gold:   'var(--gold)',
  silver: 'var(--silver)',
  bronze: 'var(--bronze)',
}[tier] || 'var(--text-dim)');

const tierLabel = (tier) => ({
  gold:   'Gold',
  silver: 'Silver',
  bronze: 'Bronze',
}[tier] || 'Unranked');

// ─── Accolade glyphs (abstract — rune/chess-like) ──────────────
// Each glyph fits a 28x28 viewbox. `color` and `size` control rendering.
function Accolade({ kind, size = 22, color = 'var(--gold)', dim = false }) {
  const opacity = dim ? 0.35 : 1;
  const stroke = color;
  const props = { width: size, height: size, viewBox: '0 0 28 28', fill: 'none', style: { opacity } };
  const sw = 1.8;
  switch (kind) {
    case 'compact': // tight token efficiency — diamond
      return (
        <svg {...props}>
          <path d="M14 3l8 11-8 11-8-11z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>
          <path d="M14 9v10M9 14h10" stroke={stroke} strokeWidth={sw} strokeLinecap="round" opacity="0.55"/>
        </svg>
      );
    case 'flow': // sustained streak — wave
      return (
        <svg {...props}>
          <path d="M3 18c3 0 3-8 6-8s3 8 6 8 3-8 6-8 3 4 4 4" stroke={stroke} strokeWidth={sw} strokeLinecap="round" fill="none"/>
          <circle cx="14" cy="6" r="1.6" fill={stroke}/>
        </svg>
      );
    case 'surge': // burst of solves — sunburst
      return (
        <svg {...props}>
          <circle cx="14" cy="14" r="4" stroke={stroke} strokeWidth={sw}/>
          {[0,45,90,135,180,225,270,315].map((d,i) => (
            <line key={i} x1="14" y1="14" x2={14 + 9*Math.cos(d*Math.PI/180)} y2={14 + 9*Math.sin(d*Math.PI/180)}
              stroke={stroke} strokeWidth={sw} strokeLinecap="round" opacity="0.7" />
          ))}
        </svg>
      );
    case 'precision': // bullseye
      return (
        <svg {...props}>
          <circle cx="14" cy="14" r="10" stroke={stroke} strokeWidth={sw}/>
          <circle cx="14" cy="14" r="5.5" stroke={stroke} strokeWidth={sw}/>
          <circle cx="14" cy="14" r="1.6" fill={stroke}/>
        </svg>
      );
    case 'frugal': // small footprint — leaf
      return (
        <svg {...props}>
          <path d="M6 22C6 12 12 6 22 6c0 10-6 16-16 16z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>
          <path d="M6 22L18 10" stroke={stroke} strokeWidth={sw} strokeLinecap="round" opacity="0.6"/>
        </svg>
      );
    case 'velocity': // chevron stack
      return (
        <svg {...props}>
          <path d="M5 11l9-7 9 7" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round"/>
          <path d="M5 18l9-7 9 7" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" opacity="0.55"/>
          <path d="M5 25l9-7 9 7" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" opacity="0.25"/>
        </svg>
      );
    case 'forge': // hexagon — milestone
      return (
        <svg {...props}>
          <path d="M14 3l9.5 5.5v11L14 25 4.5 19.5v-11z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>
          <text x="14" y="18" textAnchor="middle" fontSize="9" fontFamily="JetBrains Mono" fontWeight="600" fill={stroke}>1k</text>
        </svg>
      );
    case 'spark': // small star
      return (
        <svg {...props}>
          <path d="M14 4l2.5 7.5L24 14l-7.5 2.5L14 24l-2.5-7.5L4 14l7.5-2.5z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>
        </svg>
      );
    case 'lock': // locked
      return (
        <svg {...props}>
          <rect x="6" y="12" width="16" height="11" rx="2" stroke={stroke} strokeWidth={sw}/>
          <path d="M10 12V9a4 4 0 018 0v3" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/>
        </svg>
      );
    default:
      return <svg {...props}><circle cx="14" cy="14" r="9" stroke={stroke} strokeWidth={sw}/></svg>;
  }
}

// ─── Avatar — geometric "monogram" placeholder ─────────────────
// Generates a deterministic shape + initial. No emoji, no photo.
function Avatar({ name = 'A.N.', size = 44, ring = null, tone }) {
  // Pick a tone from name
  const tones = [
    ['oklch(0.45 0.10 30)',  'oklch(0.78 0.14 50)'],
    ['oklch(0.42 0.10 230)', 'oklch(0.78 0.14 240)'],
    ['oklch(0.45 0.11 140)', 'oklch(0.80 0.14 130)'],
    ['oklch(0.43 0.10 290)', 'oklch(0.78 0.14 300)'],
    ['oklch(0.45 0.10 60)',  'oklch(0.82 0.14 85)'],
    ['oklch(0.42 0.09 200)', 'oklch(0.78 0.13 200)'],
  ];
  let h = 0; for (const c of name) h = (h*31 + c.charCodeAt(0)) >>> 0;
  const [c1, c2] = tone || tones[h % tones.length];
  const shape = h % 3; // 0 circle, 1 rounded square, 2 hex
  const initial = name.replace(/[^A-Z]/g, '').slice(0, 2) || name.slice(0, 1).toUpperCase();
  const radius = shape === 0 ? '50%' : (shape === 1 ? '28%' : '22%');

  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Geist', fontWeight: 700, fontSize: size * 0.36,
      color: 'oklch(0.98 0.005 80)', letterSpacing: 0.4,
      position: 'relative', flexShrink: 0,
      boxShadow: ring ? `0 0 0 2px var(--bg), 0 0 0 ${2 + (ring === 'thick' ? 1 : 0)}px ${tierColor(ring)}` : 'inset 0 0 0 0.5px rgba(255,255,255,0.12)',
    }}>{initial}</div>
  );
}

// ─── Mini hourly bar chart (24h activity) ──────────────────────
function HourBars({ data, color = 'var(--accent)', height = 26, width = 96 }) {
  const max = Math.max(...data, 1);
  const barW = (width - (data.length - 1) * 2) / data.length;
  return (
    <svg width={width} height={height + 12} viewBox={`0 0 ${width} ${height + 12}`} style={{ display: 'block' }}>
      {data.map((v, i) => {
        const h = Math.max(2, (v / max) * height);
        return (
          <rect key={i}
            x={i * (barW + 2)} y={height - h}
            width={barW} height={h} rx={1}
            fill={v === max ? color : 'var(--text-faint)'}
            opacity={v === max ? 0.95 : 0.55}
          />
        );
      })}
      <text x={0} y={height + 10} fontSize={8} fill="var(--text-faint)" fontFamily="JetBrains Mono">00</text>
      <text x={width * 0.30} y={height + 10} fontSize={8} fill="var(--text-faint)" fontFamily="JetBrains Mono">06</text>
      <text x={width * 0.55} y={height + 10} fontSize={8} fill="var(--text-faint)" fontFamily="JetBrains Mono">12</text>
      <text x={width * 0.78} y={height + 10} fontSize={8} fill="var(--text-faint)" fontFamily="JetBrains Mono">18</text>
      <text x={width - 12} y={height + 10} fontSize={8} fill="var(--text-faint)" fontFamily="JetBrains Mono">24</text>
    </svg>
  );
}

// ─── Tier ring (concentric arcs around an efficiency number) ───
function TierRing({ pct = 72, tier = 'gold', size = 64, label }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - pct / 100);
  const stroke = tierColor(tier);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} stroke="var(--line-soft)" strokeWidth={3} fill="none" />
        <circle cx={size/2} cy={size/2} r={r} stroke={stroke} strokeWidth={3} fill="none"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', lineHeight: 1,
      }}>
        <div className="mono" style={{ fontSize: size * 0.28, fontWeight: 700, color: stroke }}>
          {label != null ? label : pct}
        </div>
      </div>
    </div>
  );
}

// ─── Connection indicator (small icon, above profile) ──────────
function ConnectionDot({ active = true }) {
  return (
    <div title={active ? 'Agents connected' : 'No connection'} style={{
      position: 'relative', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg width="14" height="14" viewBox="0 0 14 14">
        <circle cx="7" cy="7" r="3" fill={active ? 'var(--accent)' : 'var(--text-faint)'} />
        <circle cx="7" cy="7" r="5.5" stroke={active ? 'var(--accent)' : 'var(--text-faint)'} strokeOpacity="0.45" strokeWidth="1.2" fill="none" />
        <circle cx="7" cy="7" r="7" stroke={active ? 'var(--accent)' : 'var(--text-faint)'} strokeOpacity="0.15" strokeWidth="1" fill="none" />
      </svg>
      {active && (
        <span style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          boxShadow: '0 0 0 0 rgba(167,234,86,0.5)',
          animation: 'wattPulse 2.2s infinite',
        }} />
      )}
      <style>{`@keyframes wattPulse {
        0% { box-shadow: 0 0 0 0 rgba(167,234,86,0.45); }
        70% { box-shadow: 0 0 0 7px rgba(167,234,86,0); }
        100% { box-shadow: 0 0 0 0 rgba(167,234,86,0); }
      }`}</style>
    </div>
  );
}

// ─── Generic icons ─────────────────────────────────────────────
const Ico = {
  menu: (c='currentColor') => <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 6h16M3 11h16M3 16h12" stroke={c} strokeWidth="1.8" strokeLinecap="round"/></svg>,
  chevL: (c='currentColor', s=18) => <svg width={s} height={s} viewBox="0 0 18 18" fill="none"><path d="M11 4l-5 5 5 5" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  chevR: (c='currentColor', s=18) => <svg width={s} height={s} viewBox="0 0 18 18" fill="none"><path d="M7 4l5 5-5 5" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  summary: (c='currentColor') => <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M4 5h14M4 10h14M4 15h9" stroke={c} strokeWidth="1.8" strokeLinecap="round"/></svg>,
  explore: (c='currentColor') => <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="7" stroke={c} strokeWidth="1.8"/><path d="M14 8l-1.4 4.6L8 14l1.4-4.6z" fill={c}/></svg>,
  board: (c='currentColor') => <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="11" width="4" height="8" stroke={c} strokeWidth="1.8" strokeLinejoin="round"/><rect x="9" y="6" width="4" height="13" stroke={c} strokeWidth="1.8" strokeLinejoin="round"/><rect x="15" y="9" width="4" height="10" stroke={c} strokeWidth="1.8" strokeLinejoin="round"/></svg>,
  close: (c='currentColor') => <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M5 5l12 12M17 5L5 17" stroke={c} strokeWidth="1.8" strokeLinecap="round"/></svg>,
  dots: (c='currentColor') => <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="5" r="1.5" fill={c}/><circle cx="11" cy="11" r="1.5" fill={c}/><circle cx="11" cy="17" r="1.5" fill={c}/></svg>,
  arrowUp: (c='currentColor', s=12) => <svg width={s} height={s} viewBox="0 0 12 12" fill="none"><path d="M6 2l4 4M6 2l-4 4M6 2v8" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  arrowDn: (c='currentColor', s=12) => <svg width={s} height={s} viewBox="0 0 12 12" fill="none"><path d="M6 10l4-4M6 10l-4-4M6 10V2" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

// ─── Card wrapper ──────────────────────────────────────────────
function Card({ children, style = {}, onClick, padded = true, raised = false }) {
  return (
    <div onClick={onClick} style={{
      background: raised ? 'var(--bg-elev-2)' : 'var(--bg-elev)',
      border: '1px solid var(--line-soft)',
      borderRadius: 16,
      padding: padded ? 14 : 0,
      cursor: onClick ? 'pointer' : 'default',
      boxShadow: raised ? '0 6px 20px rgba(0,0,0,0.25)' : 'none',
      ...style,
    }}>{children}</div>
  );
}

// ─── Paginated swipe carousel ──────────────────────────────────
// Renders pages of `perPage` items in `cols` columns. Snap-scrolls
// horizontally. Pagination chrome: dots (default), arrows, or both.
function Carousel({ items, perPage = 3, cols = 3, gap = 8, renderItem,
                   chrome = 'dots', countLabel }) {
  const scrollerRef = React.useRef(null);
  const [page, setPage] = React.useState(0);
  const pages = [];
  for (let i = 0; i < items.length; i += perPage) {
    pages.push(items.slice(i, i + perPage));
  }

  const onScroll = (e) => {
    const w = e.currentTarget.clientWidth;
    const p = Math.round(e.currentTarget.scrollLeft / w);
    if (p !== page) setPage(p);
  };

  const goTo = (p) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: p * el.clientWidth, behavior: 'smooth' });
  };

  const canPrev = page > 0;
  const canNext = page < pages.length - 1;

  const arrowBtnStyle = (enabled) => ({
    width: 30, height: 30, borderRadius: 15,
    background: 'var(--bg-elev-2)',
    border: '1px solid var(--line-soft)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 0, color: 'var(--text-dim)',
    opacity: enabled ? 1 : 0.35,
    cursor: enabled ? 'pointer' : 'default',
  });

  return (
    <div>
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        style={{
          display: 'flex',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {pages.map((pg, pIdx) => (
          <div key={pIdx} style={{
            flex: '0 0 100%',
            minWidth: '100%',
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap,
            scrollSnapAlign: 'start',
          }}>
            {pg.map((it, iIdx) => renderItem(it, pIdx * perPage + iIdx))}
            {pg.length < perPage && Array.from({ length: perPage - pg.length }).map((_, k) => (
              <div key={`pad-${k}`} />
            ))}
          </div>
        ))}
      </div>

      {/* Arrows + count (matches contemporaries) */}
      {chrome === 'arrows' && pages.length > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: 10,
        }}>
          <button onClick={() => goTo(page - 1)} disabled={!canPrev} aria-label="Previous page"
            style={arrowBtnStyle(canPrev)}>
            {Ico.chevL('var(--text-dim)', 16)}
          </button>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--text-faint)', fontSize: 11 }}>
            <span className="mono">{items.length}</span>
            <span style={{ fontSize: 10.5 }}>{countLabel || 'items'}</span>
          </div>
          <button onClick={() => goTo(page + 1)} disabled={!canNext} aria-label="Next page"
            style={arrowBtnStyle(canNext)}>
            {Ico.chevR('var(--text-dim)', 16)}
          </button>
        </div>
      )}

      {/* Dots (default) */}
      {chrome === 'dots' && pages.length > 1 && (
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 5,
          paddingTop: 10,
        }}>
          {pages.map((_, i) => (
            <button key={i} onClick={() => goTo(i)} aria-label={`Page ${i+1}`} style={{
              width: i === page ? 14 : 5, height: 5, borderRadius: 3,
              background: i === page ? 'var(--text-dim)' : 'var(--line)',
              transition: 'width 0.2s, background 0.2s',
              border: 0, padding: 0, cursor: 'pointer',
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

Object.assign(window, {
  Accolade, Avatar, HourBars, TierRing, ConnectionDot, Ico, Card,
  tierColor, tierLabel, Carousel,
});
