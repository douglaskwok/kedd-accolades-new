// app.jsx — Watt main app. Mounts the iOS device frame and routes screens.

const { useState, useRef, useEffect, useMemo, createContext, useContext } = React;
const LOCAL_DATA_KEY = 'watt:data:v1';

// ─── Data context ──────────────────────────────────────────────
const DataContext = createContext(null);
const useData = () => useContext(DataContext);

function useAppData() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const etag = useRef(null);

  useEffect(() => {
    const url = window.DATA_URL || './data.json';
    let localRevision = null;

    function readLocalData() {
      try {
        const raw = window.localStorage.getItem(LOCAL_DATA_KEY);
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        const revision = JSON.stringify(parsed);
        if (revision === localRevision) return true;
        localRevision = revision;
        setData(parsed);
        setError(null);
        return true;
      } catch {
        window.localStorage.removeItem(LOCAL_DATA_KEY);
        return false;
      }
    }

    async function poll() {
      try {
        if (readLocalData()) return;
        const headers = etag.current ? { 'If-None-Match': etag.current } : {};
        const r = await fetch(url, { headers });
        if (r.status === 304) return; // unchanged
        if (!r.ok) throw new Error(r.status);
        etag.current = r.headers.get('ETag');
        const json = await r.json();
        setData(json); // replaces data in place — no flicker
      } catch (e) {
        setError(e.message);
      }
    }

    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, []);

  return { data, error };
}

// ─── Root component ────────────────────────────────────────────
function App() {
  const [tweaks, setTweak] = useTweaks(window.TWEAK_DEFAULTS || { frame: 'phone' });
  const [screen, setScreen] = useState('board');     // home | friend | me | explore | board
  const [friendId, setFriendId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { data, error } = useAppData();

  const openFriend = (id) => { setFriendId(id); setScreen('friend'); };
  const openMe = () => setScreen('me');
  const goHome = () => setScreen('home');

  const shellContent = (
    <AppShell frame={tweaks.frame}
      screen={screen} setScreen={setScreen}
      friendId={friendId}
      menuOpen={menuOpen} setMenuOpen={setMenuOpen}
      openFriend={openFriend} openMe={openMe} goHome={goHome}
    />
  );

  const shell = tweaks.frame === 'phone' ? (
    <IOSDevice width={402} height={874} dark={true}>{shellContent}</IOSDevice>
  ) : (
    <CompactShell>{shellContent}</CompactShell>
  );

  return (
    <>
      {!data ? (
        <LoadingScreen error={error} />
      ) : (
        <DataContext.Provider value={data}>
          {shell}
        </DataContext.Provider>
      )}

      <TweaksPanel title="Watt · Tweaks">
        <TweakSection label="Layout">
          <TweakRadio
            label="Display"
            value={tweaks.frame}
            options={['phone', 'compact']}
            onChange={(v) => setTweak('frame', v)}
          />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

function LoadingScreen({ error }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 12, color: error ? 'var(--red)' : 'var(--text-faint)', fontSize: 13,
    }}>
      {error ? `Failed to load data: ${error}` : 'Loading…'}
    </div>
  );
}

// Flat container used outside the iOS device frame (sidebar / desktop window).
function CompactShell({ children }) {
  return (
    <div style={{
      width: '100%', maxWidth: 460, height: '100%',
      maxHeight: 920, minHeight: 600,
      background: 'var(--bg)',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 20px 60px rgba(0,0,0,0.35), 0 0 0 1px var(--line-soft)',
      position: 'relative',
      display: 'flex', flexDirection: 'column',
    }}>
      {children}
    </div>
  );
}

function AppShell({ frame, screen, setScreen, friendId, menuOpen, setMenuOpen, openFriend, openMe, goHome }) {
  const { friends } = useData();
  const FRIEND = friends.find(f => f.id === friendId);
  const isPhone = frame === 'phone';
  return (
    <div style={{
      height: '100%', width: '100%',
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      position: 'relative',
    }}>
      {/* status-bar safe area — only when inside iOS device frame */}
      {isPhone && <div style={{ height: 54, flexShrink: 0 }} />}

      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', minHeight: 0 }}>
        {screen === 'home' && <HomeScreen onOpenFriend={openFriend} onOpenMenu={() => setMenuOpen(true)} onOpenMe={openMe} />}
        {screen === 'friend' && <FriendScreen friend={FRIEND} onBack={goHome} />}
        {screen === 'me' && <UserProfileScreen onBack={goHome} />}
        {screen === 'explore' && <ExploreScreen />}
        {screen === 'board' && <LeaderboardScreen onOpenFriend={openFriend} />}
      </div>

      <BottomNav
        active={['friend','me'].includes(screen) ? 'home' : screen}
        onChange={(k) => setScreen(k)}
        phone={isPhone}
      />

      {menuOpen && <SideMenu onClose={() => setMenuOpen(false)} />}
    </div>
  );
}

// ─── Header (welcome row) ──────────────────────────────────────
function Header({ onOpenMenu, onOpenMe }) {
  const { user } = useData();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 18px 8px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onOpenMenu} style={{
          width: 36, height: 36, border: 0, background: 'transparent', color: 'var(--text)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          padding: 0,
        }}>{Ico.menu('var(--text)')}</button>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-faint)', letterSpacing: 0.6, textTransform: 'uppercase' }}>Welcome</span>
          <span style={{ fontSize: 19, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.3 }}>{user.name}</span>
        </div>
      </div>

      <button onClick={onOpenMe} aria-label="Open profile" style={{
        position: 'relative', background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
      }}>
        <div style={{ position: 'absolute', top: -4, right: -4, zIndex: 2, pointerEvents: 'none' }}>
          <ConnectionDot active={user.agentsConnected} />
        </div>
        <Avatar name={user.initials} size={40} ring={user.tier} />
      </button>
    </div>
  );
}

// ─── Home screen ───────────────────────────────────────────────
function HomeScreen({ onOpenFriend, onOpenMenu, onOpenMe }) {
  const { user, projects, contemporaries, friends } = useData();
  const PROJECTS = projects;
  const [projIdx, setProjIdx] = useState(0);
  const project = PROJECTS[projIdx];
  const goPrev = () => setProjIdx(i => (i - 1 + PROJECTS.length) % PROJECTS.length);
  const goNext = () => setProjIdx(i => (i + 1) % PROJECTS.length);

  return (
    <div style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
      <Header onOpenMenu={onOpenMenu} onOpenMe={onOpenMe} />

      {/* "You are working on …" */}
      <div style={{ padding: '4px 18px 10px', fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.4 }}>
        You're working on{' '}
        <span style={{
          color: 'var(--accent)', fontWeight: 600,
          borderBottom: '1px dashed var(--accent-deep)', paddingBottom: 1,
        }}>{project.title.toLowerCase()}</span>
      </div>

      {/* Project carousel */}
      <div style={{ padding: '0 18px 8px' }}>
        <ProjectCard project={project} tier={user.tier} />
        <CarouselControls idx={projIdx} total={PROJECTS.length} onPrev={goPrev} onNext={goNext} />
      </div>

      {/* Contemporaries — 2-row horizontal-scroll grid, wide tiles */}
      <SectionHeader title="Your contemporaries" subtitle="Working on similar work right now" />
      <div style={{ padding: '0 18px' }}>
        <ContemporariesGrid items={contemporaries} rows={2} />
      </div>

      {/* Your usage — symmetric two-column tiles */}
      <SectionHeader title="Your usage" subtitle="Today" />
      <div style={{ padding: '0 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <UsageTile
          label="Total tokens"
          big={`${(user.totalTokensToday/1000).toFixed(0)}K`}
          sub="↑ 12K vs avg"
          subTone="warn"
          glyph={(
            <HourBars data={[2,3,5,8,11,14,18,16,12,9,5,3]} color="var(--accent)" width={64} height={32} />
          )}
        />
        <UsageTile
          label="Efficiency"
          big={`${user.efficiencyToday}`}
          sub={`Top ${user.rankPct}% · ↑ 2`}
          subTone="good"
          glyph={<TierRing pct={user.efficiencyToday} tier={user.tier} size={44} label="" />}
        />
      </div>

      {/* Friends — 2-col swipeable tiles with arrows */}
      <SectionHeader title="Your friends" subtitle="Tap a card to see their projects" />
      <div style={{ padding: '0 18px 20px' }}>
        <Carousel
          items={friends}
          perPage={4}
          cols={2}
          gap={10}
          chrome="arrows"
          countLabel="friends"
          renderItem={(f) => <FriendTile key={f.id} f={f} onOpen={() => onOpenFriend(f.id)} />}
        />
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ padding: '18px 18px 8px' }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', letterSpacing: -0.2 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 1 }}>{subtitle}</div>}
    </div>
  );
}

// ─── Project card ──────────────────────────────────────────────
// Tier-colored glow border. Two-column layout, no hourly chart.
function ProjectCard({ project, tier }) {
  const c = tierColor(tier);
  return (
    <div style={{
      position: 'relative',
      background: 'var(--bg-elev)',
      border: `1px solid ${c}`,
      borderRadius: 22,
      padding: 16,
      overflow: 'hidden',
      boxShadow: `0 0 0 1px color-mix(in oklch, ${c} 30%, transparent), 0 0 32px -10px ${c}, 0 8px 30px rgba(0,0,0,0.32)`,
    }}>
      {/* Tier accent glow line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${c}, transparent)`,
        opacity: 0.95,
      }} />

      {/* Header: title + accolades */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Active project</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2, letterSpacing: -0.3, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {project.title}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 2 }}>{project.sub}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingTop: 2 }}>
          {project.accolades.map((a, i) => (
            <Accolade key={i} kind={a} color={c} size={20} />
          ))}
        </div>
      </div>

      {/* Metrics: two equal columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
        <div style={{
          background: 'var(--bg-deep)', borderRadius: 12, padding: '10px 12px',
          border: '1px solid var(--line-soft)',
        }}>
          <div style={{ fontSize: 10.5, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Token use</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
            <span className="mono" style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{project.spt}</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>SPT</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 6 }}>
            {project.sptDelta >= 0 ? Ico.arrowUp(c, 10) : Ico.arrowDn('var(--red)', 10)}
            <span className="mono" style={{ fontSize: 10.5, color: project.sptDelta >= 0 ? c : 'var(--red)' }}>
              {Math.abs(project.sptDelta)} vs yesterday
            </span>
          </div>
        </div>

        <div style={{
          background: 'var(--bg-deep)', borderRadius: 12, padding: '10px 12px',
          border: '1px solid var(--line-soft)',
        }}>
          <div style={{ fontSize: 10.5, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total tokens</div>
          <div className="mono" style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', marginTop: 4, lineHeight: 1 }}>
            {(project.total/1000).toFixed(project.total < 10000 ? 1 : 0)}
            <span style={{ fontSize: 14, color: 'var(--text-dim)', marginLeft: 2, fontWeight: 600 }}>k</span>
          </div>
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-faint)', marginTop: 6 }}>
            {project.total.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}

function CarouselControls({ idx, total, onPrev, onNext }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      paddingTop: 8,
    }}>
      <button onClick={onPrev} aria-label="Previous project" style={btnRound}>
        {Ico.chevL('var(--text-dim)', 16)}
      </button>
      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{
            width: i === idx ? 14 : 5, height: 5, borderRadius: 3,
            background: i === idx ? 'var(--accent)' : 'var(--line)',
            transition: 'width 0.2s',
          }} />
        ))}
      </div>
      <button onClick={onNext} aria-label="Next project" style={btnRound}>
        {Ico.chevR('var(--text-dim)', 16)}
      </button>
    </div>
  );
}
const btnRound = {
  width: 30, height: 30, borderRadius: 15,
  background: 'var(--bg-elev-2)',
  border: '1px solid var(--line-soft)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', color: 'var(--text-dim)', padding: 0,
};

// ─── Contemporaries grid (2-row × wide tiles, scroll + arrows) ─
function ContemporariesGrid({ items, rows = 2 }) {
  const scrollerRef = React.useRef(null);
  const [colWidth, setColWidth] = React.useState(170);
  const [canPrev, setCanPrev] = React.useState(false);
  const [canNext, setCanNext] = React.useState(true);

  const updateArrows = React.useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  React.useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const recompute = () => {
      const w = el.clientWidth;
      setColWidth(Math.max(120, Math.floor((w - 10) / 2)));
      updateArrows();
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateArrows]);

  const scrollBy = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (colWidth + 10) * 2, behavior: 'smooth' });
  };

  return (
    <div>
      <div
        ref={scrollerRef}
        onScroll={updateArrows}
        style={{
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          padding: '4px 0',
        }}
      >
        <div style={{
          display: 'grid',
          gridAutoFlow: 'column',
          gridTemplateRows: `repeat(${rows}, auto)`,
          gridAutoColumns: `${colWidth}px`,
          gap: 10,
          width: 'max-content',
        }}>
          {items.map(c => (
            <div key={c.id} data-tile style={{ minWidth: 0, width: colWidth }}>
              <ContemporaryTile c={c} width={colWidth} />
            </div>
          ))}
        </div>
      </div>

      {/* Arrow controls */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 10,
      }}>
        <button onClick={() => scrollBy(-1)} disabled={!canPrev} aria-label="Previous contemporaries" style={{
          ...btnRound, opacity: canPrev ? 1 : 0.35,
          cursor: canPrev ? 'pointer' : 'default',
        }}>{Ico.chevL('var(--text-dim)', 16)}</button>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--text-faint)', fontSize: 11 }}>
          <span className="mono">{items.length}</span>
          <span style={{ fontSize: 10.5 }}>nearby</span>
        </div>

        <button onClick={() => scrollBy(1)} disabled={!canNext} aria-label="Next contemporaries" style={{
          ...btnRound, opacity: canNext ? 1 : 0.35,
          cursor: canNext ? 'pointer' : 'default',
        }}>{Ico.chevR('var(--text-dim)', 16)}</button>
      </div>
    </div>
  );
}

// ─── Contemporary tile — 2:1 aspect, wider format ──────────────
function ContemporaryTile({ c, width }) {
  const tc = tierColor(c.tier);
  return (
    <Card padded={false} style={{
      padding: 10, display: 'flex', flexDirection: 'column', gap: 6,
      height: width ? Math.round(width / 2) : undefined,
      justifyContent: 'space-between',
      boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Avatar name={c.initials} size={28} ring={c.tier} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 11.5, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2,
            whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden',
          }}>
            {c.project}
          </div>
          <div className="mono" style={{ fontSize: 9, color: 'var(--text-faint)', marginTop: 1 }}>
            {c.initials} · {(c.tokens/1000).toFixed(0)}k
          </div>
        </div>
        <div style={{
          background: 'var(--bg-deep)', borderRadius: 6, padding: '2px 6px',
          border: `1px solid color-mix(in oklch, ${tc} 30%, var(--line-soft))`,
          display: 'flex', alignItems: 'baseline', gap: 2, flexShrink: 0,
        }}>
          <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: tc, lineHeight: 1 }}>{c.spt}</span>
          <span className="mono" style={{ fontSize: 7.5, color: 'var(--text-faint)' }}>SPT</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {c.accolades.slice(0, 4).map((a, i) => (
          <Accolade key={i} kind={a} color={tc} size={13} />
        ))}
      </div>
    </Card>
  );
}

// ─── Usage tile ────────────────────────────────────────────────
function UsageTile({ label, big, sub, subTone = 'neutral', glyph }) {
  const subColor = subTone === 'good' ? 'var(--accent)' : subTone === 'warn' ? 'var(--bronze)' : 'var(--text-dim)';
  return (
    <Card style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8, height: 140, boxSizing: 'border-box' }}>
      <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: 1, gap: 8 }}>
        <div className="mono" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, color: 'var(--text)' }}>{big}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0 }}>{glyph}</div>
      </div>
      <div style={{ fontSize: 10.5, color: subColor, fontWeight: 500 }}>{sub}</div>
    </Card>
  );
}

// ─── Friend tile (2-col grid in a carousel) ────────────────────
function FriendTile({ f, onOpen }) {
  return (
    <Card onClick={onOpen} style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Avatar name={f.initials} size={36} ring={f.tier} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: 110 }}>
              {f.name}
            </div>
            <div className="mono" style={{ fontSize: 9.5, color: tierColor(f.tier), fontWeight: 600, letterSpacing: 0.4 }}>
              {tierLabel(f.tier).toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', minHeight: 22, flexWrap: 'wrap' }}>
          {f.accolades.slice(0, 3).map((a, i) => (
            <Accolade key={i} kind={a} color={tierColor(f.tier)} size={16} />
          ))}
          {f.accolades.length === 0 && (
            <span style={{ fontSize: 9.5, color: 'var(--text-faint)' }}>no recent</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
          <span className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{f.spt}</span>
          <span className="mono" style={{ fontSize: 10, color: 'var(--text-faint)' }}>SPT</span>
        </div>
      </div>
    </Card>
  );
}

// ─── Big overall efficiency bar at bottom ──────────────────────
function EfficiencyBar({ pct, tier }) {
  const { user } = useData();
  const c = tierColor(tier);
  return (
    <Card raised style={{
      padding: 14, display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 14, alignItems: 'center',
      borderColor: c, borderWidth: 1.5, borderStyle: 'solid',
    }}>
      <TierRing pct={pct} tier={tier} size={56} label={pct} />
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Overall efficiency</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginTop: 2 }}>
          <span style={{ color: c }}>{tierLabel(tier)} tier</span> · top {user.rankPct}%
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>
          +5 pts this week. 13 days to platinum.
        </div>
      </div>
      <div style={{
        width: 28, height: 28, borderRadius: 14, background: 'var(--bg-deep)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)',
        border: '1px solid var(--line-soft)',
      }}>{Ico.chevR('var(--text-dim)', 14)}</div>
    </Card>
  );
}

// ─── Friend profile screen ─────────────────────────────────────
function FriendScreen({ friend, onBack }) {
  if (!friend) return null;
  const c = tierColor(friend.tier);
  return (
    <div style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px 10px',
      }}>
        <button onClick={onBack} style={{
          ...btnRound, width: 36, height: 36, borderRadius: 18,
        }}>{Ico.chevL('var(--text)', 18)}</button>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dim)' }}>Profile</div>
        <button style={{
          ...btnRound, width: 36, height: 36, borderRadius: 18,
        }}>{Ico.dots('var(--text-dim)')}</button>
      </div>

      {/* Hero */}
      <div style={{ padding: '8px 18px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <Avatar name={friend.initials} size={86} ring={friend.tier} />
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>{friend.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, color: c, padding: '3px 9px', borderRadius: 99,
            border: `1px solid ${c}`, letterSpacing: 0.5, textTransform: 'uppercase',
          }}>{tierLabel(friend.tier)} tier</span>
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>· {friend.streakDays} day streak</span>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ padding: '0 18px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <ProfileStat label="Efficiency" value={friend.efficiency} sub="lifetime" color={c} />
        <ProfileStat label="SPT" value={friend.spt} sub="7-day avg" color="var(--text)" />
        <ProfileStat label="Today" value={`${(friend.tokensToday/1000).toFixed(0)}k`} sub="tokens" color="var(--text)" />
      </div>

      {/* Accolades collected */}
      <SectionHeader title="Accolades" subtitle={`${friend.accolades.length} earned recently`} />
      <div style={{ padding: '0 18px' }}>
        <Card padded={true} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {['compact','flow','precision','frugal','surge','velocity','forge','spark'].map((a, i) => {
            const has = friend.accolades.includes(a);
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 50 }}>
                <Accolade kind={has ? a : 'lock'} color={has ? c : 'var(--text-faint)'} size={26} dim={!has} />
                <span style={{ fontSize: 9, color: has ? 'var(--text-dim)' : 'var(--text-faint)', textTransform: 'capitalize' }}>{a}</span>
              </div>
            );
          })}
        </Card>
      </div>

      {/* Projects */}
      <SectionHeader title="Projects" subtitle={`${friend.projects.length} active`} />
      <div style={{ padding: '0 18px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {friend.projects.map((p, i) => (
          <Card key={i} padded={true}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{p.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>
                  <span className="mono">{p.total.toLocaleString()}</span> tokens total
                </div>
              </div>
              <div style={{ display: 'flex', gap: 3 }}>
                {p.accolades.map((a, j) => <Accolade key={j} kind={a} color={c} size={16} />)}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 10 }}>
              <HourBars data={p.hourly} color={c} width={140} height={26} />
              <div style={{ textAlign: 'right' }}>
                <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: c }}>{p.spt}</div>
                <div className="mono" style={{ fontSize: 9.5, color: 'var(--text-faint)' }}>SPT</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ProfileStat({ label, value, sub, color }) {
  return (
    <Card style={{ padding: 12, textAlign: 'center' }}>
      <div style={{ fontSize: 9.5, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div className="mono" style={{ fontSize: 20, fontWeight: 700, color, marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 9.5, color: 'var(--text-faint)', marginTop: 2 }}>{sub}</div>
    </Card>
  );
}

// ─── User profile screen (Maya's own profile) ──────────────────
function UserProfileScreen({ onBack }) {
  const { user, projects, tips } = useData();
  const c = tierColor(user.tier);
  return (
    <div style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px 10px',
      }}>
        <button onClick={onBack} style={{
          ...btnRound, width: 36, height: 36, borderRadius: 18,
        }}>{Ico.chevL('var(--text)', 18)}</button>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dim)' }}>My profile</div>
        <button style={{
          ...btnRound, width: 36, height: 36, borderRadius: 18,
        }}>{Ico.dots('var(--text-dim)')}</button>
      </div>

      {/* Hero — Overall efficiency */}
      <div style={{ padding: '0 18px 16px' }}>
        <div style={{
          position: 'relative',
          background: 'var(--bg-elev)',
          border: `1.5px solid ${c}`,
          borderRadius: 20,
          padding: '20px 16px 18px',
          boxShadow: `0 0 0 1px color-mix(in oklch, ${c} 25%, transparent), 0 0 40px -10px ${c}, 0 8px 30px rgba(0,0,0,0.32)`,
          display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 16, alignItems: 'center',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: `linear-gradient(90deg, transparent, ${c}, transparent)`,
          }} />
          <TierRing pct={user.efficiencyToday} tier={user.tier} size={92} label={user.efficiencyToday} />
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Overall efficiency</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: c, marginTop: 4, letterSpacing: -0.3 }}>
              {tierLabel(user.tier)} tier
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 4, lineHeight: 1.4 }}>
              Top {user.rankPct}% of your circle. +5 pts this week — <span style={{ color: c, fontWeight: 600 }}>13 days to platinum</span>.
            </div>
          </div>
        </div>

        {/* Mini stat strip */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 10 }}>
          <ProfileStat label="Lifetime SPT" value={user.efficiencyLifetime} sub="lifetime avg" color="var(--text)" />
          <ProfileStat label="Reserve" value={`${(user.reserveLeft/1000).toFixed(0)}k`} sub="this week" color="var(--text)" />
          <ProfileStat label="Total" value={`${(user.totalTokensToday/1000).toFixed(0)}k`} sub="today" color={c} />
        </div>
      </div>

      {/* CTAs */}
      <div style={{ padding: '0 18px 6px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <CTAButton kind="primary" label="Meta analysis" icon={(
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.6"/>
            <circle cx="8" cy="8" r="2" fill="currentColor"/>
            <path d="M8 0.5v3M8 12.5v3M0.5 8h3M12.5 8h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        )} />
        <CTAButton kind="ghost" label="Share" icon={(
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="4" cy="8" r="2" stroke="currentColor" strokeWidth="1.6"/>
            <circle cx="12" cy="3.5" r="2" stroke="currentColor" strokeWidth="1.6"/>
            <circle cx="12" cy="12.5" r="2" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M6 7l4-2.5M6 9l4 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        )} />
      </div>

      {/* Major projects */}
      <SectionHeader title="Your projects" subtitle={`${projects.length} active this week`} />
      <div style={{ padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {projects.map((p, i) => (
          <Card key={i} padded={true}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: 3, background: p.accent, flexShrink: 0 }} />
                  <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{p.title}</div>
                </div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4, marginLeft: 14 }}>
                  {p.total.toLocaleString()} tokens
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 8, marginLeft: 14 }}>
                  {p.accolades.map((a, j) => <Accolade key={j} kind={a} color={p.accent} size={16} />)}
                </div>
              </div>
              <div style={{
                background: 'var(--bg-deep)', borderRadius: 10, padding: '8px 12px',
                border: '1px solid var(--line-soft)', textAlign: 'center',
              }}>
                <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: p.accent, lineHeight: 1 }}>{p.spt}</div>
                <div className="mono" style={{ fontSize: 9.5, color: 'var(--text-faint)', marginTop: 2 }}>SPT</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Personalized tips */}
      <SectionHeader title="Tips for you" subtitle="Personalized, based on the last 30 days" />
      <div style={{ padding: '0 18px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tips.map(t => <TipCard key={t.id} tip={t} />)}
      </div>
    </div>
  );
}

function CTAButton({ kind = 'primary', label, icon }) {
  const { user } = useData();
  const isPrimary = kind === 'primary';
  const c = tierColor(user.tier);
  return (
    <button style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      padding: '13px 12px',
      borderRadius: 14,
      background: isPrimary ? c : 'var(--bg-elev)',
      color: isPrimary ? 'var(--bg-deep)' : 'var(--text)',
      border: isPrimary ? `1px solid ${c}` : '1px solid var(--line)',
      fontSize: 13.5, fontWeight: 600, letterSpacing: -0.1,
      cursor: 'pointer',
      boxShadow: isPrimary ? `0 4px 18px -6px ${c}` : 'none',
    }}>
      {icon}
      {label}
    </button>
  );
}

function TipCard({ tip }) {
  const toneColor = tip.tone === 'good' ? 'var(--accent)' : tip.tone === 'warn' ? 'var(--bronze)' : 'var(--text-dim)';
  return (
    <Card style={{ padding: 14, display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, alignItems: 'flex-start' }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: `color-mix(in oklch, ${toneColor} 16%, var(--bg-deep))`,
        border: `1px solid color-mix(in oklch, ${toneColor} 40%, transparent)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Accolade kind={tip.icon} color={toneColor} size={20} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', letterSpacing: -0.1 }}>{tip.title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3, lineHeight: 1.45 }}>{tip.body}</div>
      </div>
      <div className="mono" style={{
        fontSize: 13, fontWeight: 700, color: toneColor,
        background: 'var(--bg-deep)', padding: '4px 8px', borderRadius: 8,
        border: '1px solid var(--line-soft)', flexShrink: 0,
      }}>{tip.metric}</div>
    </Card>
  );
}

// ─── Explore screen (stub w/ taste) ────────────────────────────
function ExploreScreen() {
  const { exploreTrends: trends } = useData();
  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ padding: '18px 18px 6px' }}>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.4 }}>Explore</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 4 }}>
          What efficient builders are working on right now.
        </div>
      </div>

      <SectionHeader title="Trending work" subtitle="Last 24 hours" />
      <div style={{ padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {trends.map((t, i) => (
          <Card key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{t.tag}</div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }} className="mono">{t.users} builders active</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>{t.avgSpt}</div>
                <div className="mono" style={{ fontSize: 9.5, color: 'var(--text-faint)' }}>AVG SPT</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <div style={{ height: 24 }} />
    </div>
  );
}

// ─── Leaderboard screen ────────────────────────────────────────
function LeaderboardScreen({ onOpenFriend }) {
  const { user, friends, projects } = useData();
  const sorted = [...friends].sort((a, b) => b.efficiency - a.efficiency);
  const firstProject = projects[0];
  const me = {
    id: 'me', name: `${user.name} (you)`, initials: user.initials,
    tier: user.tier, efficiency: user.efficiencyToday, spt: user.efficiencyLifetime,
    accolades: firstProject ? firstProject.accolades : [],
    featured: firstProject ? { verb: 'Working on', what: firstProject.title.toLowerCase(), tokens: firstProject.total } : null,
  };
  const all = [...sorted, me].sort((a, b) => b.efficiency - a.efficiency);
  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ padding: '18px 18px 6px' }}>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.4 }}>Leaderboard</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 4 }}>
          Your circle, ranked by lifetime efficiency.
        </div>
      </div>
      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {all.map((p, i) => {
          const isYou = p.id === 'me';
          const tc = tierColor(p.tier);
          return (
            <Card
              key={p.id}
              onClick={!isYou ? () => onOpenFriend(p.id) : undefined}
              padded={false}
              style={{
                display: 'grid', gridTemplateColumns: '24px auto 1fr auto', gap: 12,
                alignItems: 'start', padding: '12px 14px',
                background: isYou ? 'var(--bg-elev-2)' : 'var(--bg-elev)',
                borderColor: isYou ? tc : 'var(--line-soft)',
              }}
            >
              <span className="mono" style={{
                fontSize: 14, fontWeight: 700, paddingTop: 9,
                color: i < 3 ? tierColor(['gold','silver','bronze'][i]) : 'var(--text-faint)',
              }}>{(i + 1).toString().padStart(2, '0')}</span>
              <Avatar name={p.initials} size={32} ring={p.tier} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {p.name}
                </div>
                {p.featured && (
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3, lineHeight: 1.3,
                    whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {p.featured.verb} <span style={{ color: 'var(--text)' }}>{p.featured.what}</span>{' '}
                    <span className="mono" style={{ color: 'var(--text-faint)' }}>
                      · {(p.featured.tokens/1000).toFixed(0)}k
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <div className="mono" style={{ fontSize: 10.5, color: 'var(--text)' }}>
                    {p.featured ? `${(p.featured.tokens/1000).toFixed(0)}k tokens` : '—'} · {tierLabel(p.tier)}
                  </div>
                  {(p.accolades || []).length > 0 && (
                    <>
                      <span style={{ width: 2, height: 2, borderRadius: 1, background: 'var(--text-faint)' }} />
                      <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                        {(p.accolades || []).slice(0, 4).map((a, j) => (
                          <Accolade key={j} kind={a} color={tc} size={12} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: tc, paddingTop: 6 }}>
                {p.efficiency}
              </div>
            </Card>
          );
        })}
      </div>
      <div style={{ height: 24 }} />
    </div>
  );
}

// ─── Bottom nav ────────────────────────────────────────────────
function BottomNav({ active, onChange, phone = true }) {
  const items = [
    { key: 'home',    label: 'Summary',     icon: Ico.summary },
    { key: 'explore', label: 'Explore',     icon: Ico.explore },
    { key: 'board',   label: 'Leaderboard', icon: Ico.board },
  ];
  return (
    <div style={{
      flexShrink: 0, padding: phone ? '8px 18px 22px' : '8px 18px 10px',
      borderTop: '1px solid var(--line-soft)',
      background: 'var(--bg-deep)',
      backdropFilter: 'blur(20px)',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
        {items.map(it => {
          const isActive = active === it.key;
          const color = isActive ? 'var(--accent)' : 'var(--text-faint)';
          return (
            <button key={it.key} onClick={() => onChange(it.key)} style={{
              background: 'transparent', border: 0, padding: '8px 4px', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            }}>
              {it.icon(color)}
              <span style={{ fontSize: 10.5, fontWeight: 600, color, letterSpacing: 0.2 }}>{it.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Side menu (drawer) ────────────────────────────────────────
function SideMenu({ onClose }) {
  const { user } = useData();
  const items = [
    { label: 'Profile & settings' },
    { label: 'My agents' },
    { label: 'Weekly reserve' },
    { label: 'Notification rules' },
    { label: 'Connect a teammate' },
    { label: 'Sign out', danger: true },
  ];
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 100 }}>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)',
        animation: 'wattFade 0.18s ease',
      }} />
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0,
        width: '78%', background: 'var(--bg-deep)',
        borderRight: '1px solid var(--line-soft)',
        padding: '54px 22px 30px',
        display: 'flex', flexDirection: 'column', gap: 16,
        animation: 'wattSlide 0.22s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.3 }}>Watt</div>
          <button onClick={onClose} style={{
            ...btnRound, width: 32, height: 32, borderRadius: 16,
          }}>{Ico.close('var(--text-dim)')}</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
          <Avatar name={user.initials} size={40} ring={user.tier} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{user.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>@{user.handle}</div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {items.map((it, i) => (
            <button key={i} style={{
              textAlign: 'left', background: 'transparent', border: 0, padding: '11px 4px',
              fontSize: 14, color: it.danger ? 'var(--red)' : 'var(--text)', cursor: 'pointer',
              borderRadius: 8,
            }}>{it.label}</button>
          ))}
        </div>

        <div style={{ marginTop: 'auto', fontSize: 10.5, color: 'var(--text-faint)' }}>
          <span className="mono">v0.4.2 · {user.reserveLeft.toLocaleString()} / {user.reserveTotal.toLocaleString()} tokens left this week</span>
        </div>
      </div>
      <style>{`
        @keyframes wattFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes wattSlide { from { transform: translateX(-30px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  );
}

// ─── Mount ─────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
