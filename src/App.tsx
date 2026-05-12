import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar, BarChart3, Home, ChevronRight,
  X, CheckCircle, BookMarked, ArrowRight, Flame,
} from 'lucide-react';
import { subscribeToBooks, type Book } from './services/bookService';
import {
  subscribeToEvents, castVote, getUserVote,
  type BookEvent, type EventStatus,
} from './services/eventService';

const UNIVERSITIES = [
  { id: 'AMU',  name: 'AMU',  fullName: 'Astana Medical University' },
  { id: 'AITU', name: 'AITU', fullName: 'Astana IT University' },
  { id: 'NU',   name: 'NU',   fullName: 'Nazarbayev University' },
] as const;

type UniId   = (typeof UNIVERSITIES)[number]['id'];
type Page    = 'home' | 'events' | 'books' | 'activity';

const STATUS_LABELS: Record<EventStatus, string> = {
  voting: 'Voting Open', upcoming: 'Upcoming', active: 'Reading Now', past: 'Finished',
};
const SC: Record<EventStatus, { pill: string; dot: string }> = {
  voting:   { pill: 'bg-amber-400/15 text-amber-300 border-amber-400/20',   dot: 'bg-amber-400' },
  upcoming: { pill: 'bg-sky-400/15 text-sky-300 border-sky-400/20',         dot: 'bg-sky-400' },
  active:   { pill: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/20', dot: 'bg-emerald-400 animate-pulse' },
  past:     { pill: 'bg-white/5 text-white/30 border-white/10',             dot: 'bg-white/20' },
};

// ── Book cover via Google Books ───────────────────────────────────────────────
const coverCache: Record<string, string | null> = {};

async function fetchCover(title: string, author: string): Promise<string | null> {
  const key = `${title}__${author}`;
  if (key in coverCache) return coverCache[key];
  try {
    const q = encodeURIComponent(`${title} ${author}`);
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1&fields=items/volumeInfo/imageLinks`);
    const data = await res.json();
    const url = data?.items?.[0]?.volumeInfo?.imageLinks?.thumbnail ?? null;
    coverCache[key] = url ? url.replace('http://', 'https://') : null;
  } catch {
    coverCache[key] = null;
  }
  return coverCache[key];
}

function BookCover({ title, author, size = 'md' }: { title: string; author: string; size?: 'sm' | 'md' | 'lg' }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchCover(title, author).then(setUrl);
  }, [title, author]);

  const sizes = { sm: 'w-10 h-14', md: 'w-12 h-16', lg: 'w-16 h-24' };

  if (!url) return (
    <div className={`${sizes[size]} rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0`}>
      <BookMarked className="w-4 h-4 text-amber-500/40" />
    </div>
  );

  return (
    <div className={`${sizes[size]} rounded-lg overflow-hidden flex-shrink-0 bg-white/5`}>
      <img src={url} alt={title} onLoad={() => setLoaded(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`} />
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#0f2151] border border-white/10 p-6 space-y-5"
            onClick={e => e.stopPropagation()}>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Event modal ───────────────────────────────────────────────────────────────
function EventModal({ event, onClose }: { event: BookEvent; onClose: () => void }) {
  const [userVote, setUserVote] = useState<string | null>(event.id ? getUserVote(event.id) : null);
  const [voting, setVoting] = useState(false);
  const opts = event.votingOptions ?? [];
  const total = opts.reduce((s, o) => s + o.votes, 0);
  const maxV  = Math.max(...opts.map(o => o.votes), 0);
  const sc    = SC[event.status];

  const handleVote = async (optionId: string) => {
    if (!event.id || voting) return;
    setVoting(true);
    try { await castVote(event.id, optionId); setUserVote(optionId); }
    catch { alert('Vote failed, try again.'); }
    finally { setVoting(false); }
  };

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border mb-3 ${sc.pill}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{STATUS_LABELS[event.status]}
          </span>
          <h2 className="font-display text-2xl text-white leading-snug">{event.title}</h2>
          <p className="text-white/30 text-xs font-mono mt-1">{event.date}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/10 text-white/30 hover:text-white transition-colors mt-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {event.description && <p className="text-white/50 text-sm leading-relaxed">{event.description}</p>}

      {event.bookTitle && (
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-amber-500/8 border border-amber-500/15">
          <BookCover title={event.bookTitle} author={event.bookAuthor ?? ''} size="md" />
          <div>
            <p className="font-semibold text-white">{event.bookTitle}</p>
            <p className="text-amber-400/60 text-sm">{event.bookAuthor}</p>
          </div>
        </div>
      )}

      {event.status === 'voting' && opts.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-[10px] uppercase tracking-widest text-white/25 font-semibold">{total} vote{total !== 1 ? 's' : ''} cast</p>
          {opts.map(opt => {
            const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
            const isVoted   = userVote === opt.id;
            const isLeading = opt.votes > 0 && opt.votes === maxV;
            return (
              <button key={opt.id} onClick={() => handleVote(opt.id)} disabled={voting}
                className={`w-full text-left rounded-2xl border overflow-hidden transition-all duration-150 ${
                  isVoted ? 'border-amber-500/60 bg-amber-500/10' : 'border-white/8 bg-white/3 hover:border-white/20'
                }`}>
                <div className="relative p-3.5">
                  {total > 0 && (
                    <div className="absolute inset-0 bg-white/3 rounded-2xl" style={{ width: `${pct}%`, transition: 'width .5s ease' }} />
                  )}
                  <div className="relative flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <BookCover title={opt.title} author={opt.author} size="sm" />
                      <div>
                        <p className="font-medium text-sm text-white">{opt.title}</p>
                        <p className="text-white/35 text-xs">{opt.author}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isLeading && !isVoted && <span className="text-[10px] font-bold text-amber-400 tracking-wider">TOP</span>}
                      <span className={`text-sm font-mono ${isVoted ? 'text-amber-400' : 'text-white/25'}`}>{pct}%</span>
                      {isVoted && <CheckCircle className="w-4 h-4 text-amber-400" />}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
          {userVote && <p className="text-[10px] text-white/20 text-center pt-1">Tap another option to change your vote</p>}
        </div>
      )}
    </>
  );
}

// ── HOME ──────────────────────────────────────────────────────────────────────
function HomePage({ onNav, allEvents, allBooks }: {
  onNav: (p: Page) => void; allEvents: BookEvent[]; allBooks: Book[];
}) {
  const active   = allEvents.find(e => e.status === 'active' || e.status === 'voting');
  const finished = allEvents.filter(e => e.status === 'past').length;
  const votes    = allEvents.flatMap(e => e.votingOptions ?? []).reduce((s, o) => s + o.votes, 0);

  return (
    <div className="space-y-10 pb-8">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-4 mb-6">
          <img src="/serinclublogo.jpg" alt="Sërin"
            className="w-[72px] h-[72px] rounded-2xl object-cover shadow-lg shadow-black/40 flex-shrink-0" />
          <div>
            <h1 className="font-display text-[2.6rem] leading-none text-white">Sërin</h1>
            <p className="text-amber-400/70 text-sm mt-0.5">Family Book Club</p>
          </div>
        </div>
        <p className="text-white/45 leading-relaxed max-w-md">
          One book at a time, across three campuses — AMU, AITU, and NU reading together in Astana.
        </p>
        <div className="flex gap-2.5 mt-6 flex-wrap">
          <button onClick={() => onNav('events')}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-[#0a1830] rounded-full text-sm font-semibold hover:bg-amber-400 transition-colors">
            See events <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onNav('books')}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/8 text-white/70 rounded-full text-sm font-medium hover:bg-white/12 transition-colors border border-white/10">
            Reading list
          </button>
        </div>
      </motion.div>

      {/* Numbers */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}
        className="grid grid-cols-3 gap-3">
        {[
          { n: finished,       label: 'Books finished' },
          { n: allBooks.length, label: 'On the list' },
          { n: votes,          label: 'Votes cast' },
        ].map(({ n, label }) => (
          <div key={label} className="rounded-2xl border border-white/8 bg-white/4 py-5 text-center">
            <p className="font-display text-3xl text-amber-400">{n}</p>
            <p className="text-white/30 text-xs mt-1">{label}</p>
          </div>
        ))}
      </motion.div>

      {/* Active event */}
      {active && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-amber-400/50 font-semibold mb-3">
            <Flame className="w-3 h-3" /> Now
          </p>
          <div className="rounded-3xl border border-amber-500/15 bg-gradient-to-br from-amber-500/8 via-transparent to-transparent p-5">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border mb-3 ${SC[active.status].pill}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${SC[active.status].dot}`} />{STATUS_LABELS[active.status]}
            </span>
            <div className="flex items-start gap-4">
              {active.bookTitle && <BookCover title={active.bookTitle} author={active.bookAuthor ?? ''} size="lg" />}
              <div>
                <h3 className="font-display text-xl text-white leading-snug">{active.title}</h3>
                {active.bookTitle && <p className="text-amber-400/60 text-sm mt-0.5">{active.bookTitle} · {active.bookAuthor}</p>}
                {active.description && <p className="text-white/35 text-sm mt-2 leading-relaxed line-clamp-2">{active.description}</p>}
              </div>
            </div>
            <button onClick={() => onNav('events')} className="mt-4 flex items-center gap-1 text-xs text-amber-400/70 hover:text-amber-400 transition-colors font-medium">
              All events <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* What we do — removed boring intro, replaced with recent books shelf */}
      {allBooks.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.28 }}>
          <p className="text-[10px] uppercase tracking-widest text-white/25 font-semibold mb-3">On the list</p>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {allBooks.slice(0, 8).map((book, i) => (
              <motion.div key={book.id}
                initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }}
                className="flex-shrink-0 w-16 cursor-default"
                title={`${book.title} — ${book.author}`}>
                <BookCover title={book.title} author={book.author} size="lg" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ── EVENTS ────────────────────────────────────────────────────────────────────
function EventsPage({ events, loading, onSelect, uni, setUni }: {
  events: BookEvent[]; loading: boolean; onSelect: (e: BookEvent) => void;
  uni: UniId; setUni: (u: UniId) => void;
}) {
  return (
    <div>
      <h2 className="font-display text-3xl text-white mb-1">Events</h2>
      <p className="text-white/35 text-sm mb-6">Reading events by campus</p>
      <UniTabs active={uni} setActive={setUni} />
      <div className="space-y-2.5 mt-6">
        <AnimatePresence mode="popLayout">
          {loading ? <Spinner key="s" /> : events.length > 0 ? events.map(ev => (
            <motion.button layout key={ev.id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
              onClick={() => onSelect(ev)}
              className="group w-full text-left rounded-2xl border border-white/8 bg-white/4 hover:border-amber-500/30 hover:bg-white/6 transition-all duration-150 p-4">
              <div className="flex items-center gap-4">
                {ev.bookTitle && <BookCover title={ev.bookTitle} author={ev.bookAuthor ?? ''} size="sm" />}
                <div className="flex-1 min-w-0">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border mb-1 ${SC[ev.status].pill}`}>
                    <span className={`w-1 h-1 rounded-full ${SC[ev.status].dot}`} />{STATUS_LABELS[ev.status]}
                  </span>
                  <p className="font-semibold text-white text-sm truncate">{ev.title}</p>
                  {ev.bookTitle
                    ? <p className="text-white/35 text-xs truncate">{ev.bookTitle} · {ev.bookAuthor}</p>
                    : ev.status === 'voting'
                      ? <p className="text-amber-400/50 text-xs">{(ev.votingOptions ?? []).reduce((s, o) => s + o.votes, 0)} votes · {(ev.votingOptions ?? []).length} options</p>
                      : null}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <p className="text-white/20 text-xs font-mono hidden sm:block">{ev.date}</p>
                  <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-amber-400 transition-colors" />
                </div>
              </div>
            </motion.button>
          )) : (
            <motion.div key="e" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="py-16 text-center border border-dashed border-white/8 rounded-2xl">
              <Calendar className="w-7 h-7 text-white/15 mx-auto mb-2" />
              <p className="text-white/25 text-sm">No events yet for this campus</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── BOOKS ─────────────────────────────────────────────────────────────────────
function BooksPage({ books, loading, uni, setUni }: {
  books: Book[]; loading: boolean; uni: UniId; setUni: (u: UniId) => void;
}) {
  return (
    <div>
      <h2 className="font-display text-3xl text-white mb-1">Reading List</h2>
      <p className="text-white/35 text-sm mb-6">Books members want to read</p>
      <UniTabs active={uni} setActive={setUni} />
      <div className="mt-6 grid grid-cols-1 gap-2.5">
        <AnimatePresence mode="popLayout">
          {loading ? <Spinner key="s" /> : books.length > 0 ? books.map((book, i) => (
            <motion.div layout key={book.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ delay: i * 0.04 }}
              className="group flex items-center gap-4 rounded-2xl border border-white/8 bg-white/4 hover:border-white/15 p-4 transition-all duration-150">
              <BookCover title={book.title} author={book.author} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{book.title}</p>
                <p className="text-white/35 text-sm">{book.author}</p>
              </div>
              <p className="text-white/15 text-xs font-mono hidden sm:block flex-shrink-0">
                {book.createdAt?.toDate?.()?.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) ?? ''}
              </p>
            </motion.div>
          )) : (
            <motion.div key="e" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="py-16 text-center border border-dashed border-white/8 rounded-2xl">
              <BookMarked className="w-7 h-7 text-white/15 mx-auto mb-2" />
              <p className="text-white/25 text-sm">Nothing on the list yet</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── ACTIVITY ──────────────────────────────────────────────────────────────────
function ActivityPage({ allEvents, allBooks }: { allEvents: BookEvent[]; allBooks: Book[] }) {
  const byUni = UNIVERSITIES.map(u => ({
    ...u,
    events: allEvents.filter(e => e.uniId === u.id).length,
    books:  allBooks.filter(b => b.uniId === u.id).length,
  }));
  const maxE = Math.max(...byUni.map(u => u.events), 1);
  const total = allEvents.length;
  const done  = allEvents.filter(e => e.status === 'past').length;
  const votes = allEvents.flatMap(e => e.votingOptions ?? []).reduce((s, o) => s + o.votes, 0);
  const best  = [...byUni].sort((a, b) => b.events - a.events)[0];

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h2 className="font-display text-3xl text-white mb-1">Activity</h2>
        <p className="text-white/35 text-sm">How the club is doing</p>
      </div>

      {total > 0 && (
        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/6 p-5">
          <p className="text-amber-400/50 text-[10px] uppercase tracking-widest font-semibold mb-1">Most active</p>
          <p className="font-display text-2xl text-white">{best.fullName}</p>
          <p className="text-white/30 text-sm mt-0.5">{best.events} event{best.events !== 1 ? 's' : ''} · {best.books} on the list</p>
        </div>
      )}

      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-widest text-white/25 font-semibold">Events per campus</p>
        {byUni.map((u, i) => (
          <div key={u.id} className="flex items-center gap-3">
            <span className="text-xs font-semibold text-white/40 w-10 flex-shrink-0">{u.name}</span>
            <div className="flex-1 h-7 rounded-xl bg-white/4 border border-white/6 relative overflow-hidden">
              <motion.div className="absolute inset-y-0 left-0 bg-amber-500/25 border-r border-amber-400/20"
                initial={{ width: 0 }} animate={{ width: `${(u.events / maxE) * 100}%` }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeOut' }} />
              <span className="absolute inset-0 flex items-center px-3 text-xs text-amber-300/70 font-mono">
                {u.events} event{u.events !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { n: total,          l: 'Total events' },
          { n: done,           l: 'Completed' },
          { n: allBooks.length, l: 'Books listed' },
          { n: votes,          l: 'Votes cast' },
        ].map(({ n, l }) => (
          <div key={l} className="rounded-2xl border border-white/8 bg-white/4 p-4 flex items-end gap-2">
            <span className="font-display text-3xl text-amber-400 leading-none">{n}</span>
            <span className="text-white/30 text-xs mb-0.5">{l}</span>
          </div>
        ))}
      </div>

      <div className="space-y-px rounded-2xl overflow-hidden border border-white/8">
        {byUni.map((u, i) => (
          <div key={u.id} className={`flex items-center justify-between px-4 py-3 ${i % 2 === 0 ? 'bg-white/3' : 'bg-white/2'}`}>
            <span className="text-white/50 text-sm">{u.fullName}</span>
            <span className="text-amber-400/70 text-sm font-mono">{u.books} book{u.books !== 1 ? 's' : ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────
function UniTabs({ active, setActive }: { active: UniId; setActive: (u: UniId) => void }) {
  return (
    <div className="flex gap-1 p-1 bg-white/4 rounded-xl border border-white/8 w-fit">
      {UNIVERSITIES.map(u => (
        <button key={u.id} onClick={() => setActive(u.id)}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
            active === u.id ? 'bg-amber-500 text-[#0a1830]' : 'text-white/40 hover:text-white'
          }`}>
          {u.name}
        </button>
      ))}
    </div>
  );
}

function Spinner() {
  return (
    <motion.div key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-14 text-center text-white/20 text-sm">
      Loading…
    </motion.div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage]           = useState<Page>('home');
  const [uni, setUni]             = useState<UniId>('AITU');
  const [books, setBooks]         = useState<Book[]>([]);
  const [allBooks, setAllBooks]   = useState<Book[]>([]);
  const [booksLoading, setBL]     = useState(true);
  const [events, setEvents]       = useState<BookEvent[]>([]);
  const [allEvents, setAllEvents] = useState<BookEvent[]>([]);
  const [eventsLoading, setEL]    = useState(true);
  const [selected, setSelected]   = useState<BookEvent | null>(null);

  useEffect(() => {
    setBL(true);
    return subscribeToBooks(uni, b => { setBooks(b); setBL(false); });
  }, [uni]);

  useEffect(() => {
    const unsubs = UNIVERSITIES.map(u =>
      subscribeToBooks(u.id, b => setAllBooks(prev => [...prev.filter(x => x.uniId !== u.id), ...b]))
    );
    return () => unsubs.forEach(f => f());
  }, []);

  useEffect(() => {
    setEL(true);
    return subscribeToEvents(uni, e => {
      setEvents(e); setEL(false);
      setSelected(prev => prev?.id ? (e.find(ev => ev.id === prev.id) ?? prev) : prev);
    });
  }, [uni]);

  useEffect(() => {
    const unsubs = UNIVERSITIES.map(u =>
      subscribeToEvents(u.id, e => setAllEvents(prev => [...prev.filter(x => x.uniId !== u.id), ...e]))
    );
    return () => unsubs.forEach(f => f());
  }, []);

  const NAV = [
    { id: 'home',     label: 'Home',     icon: Home },
    { id: 'events',   label: 'Events',   icon: Calendar },
    { id: 'books',    label: 'Books',    icon: BookMarked },
    { id: 'activity', label: 'Activity', icon: BarChart3 },
  ] as const;

  return (
    <div className="min-h-screen bg-[#0a1830]">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/6 bg-[#0a1830]/90 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-5 h-13 flex items-center justify-between">
          <button onClick={() => setPage('home')}>
            <img src="/serinclublogo.jpg" alt="Sërin" className="w-8 h-8 rounded-xl object-cover" />
          </button>
          <nav className="hidden sm:flex items-center gap-0.5">
            {NAV.map(({ id, label }) => (
              <button key={id} onClick={() => setPage(id as Page)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                  page === id ? 'bg-amber-500 text-[#0a1830]' : 'text-white/40 hover:text-white'
                }`}>
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-5 py-8">
        <AnimatePresence mode="wait">
          {page === 'home' && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <HomePage onNav={setPage} allEvents={allEvents} allBooks={allBooks} />
            </motion.div>
          )}
          {page === 'events' && (
            <motion.div key="events" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <EventsPage events={events} loading={eventsLoading} onSelect={setSelected} uni={uni} setUni={setUni} />
            </motion.div>
          )}
          {page === 'books' && (
            <motion.div key="books" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <BooksPage books={books} loading={booksLoading} uni={uni} setUni={setUni} />
            </motion.div>
          )}
          {page === 'activity' && (
            <motion.div key="activity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <ActivityPage allEvents={allEvents} allBooks={allBooks} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 border-t border-white/6 bg-[#0a1830]/95 backdrop-blur-md">
        <div className="flex justify-around px-2 py-2">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setPage(id as Page)}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 transition-colors ${
                page === id ? 'text-amber-400' : 'text-white/25'
              }`}>
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>
      <div className="h-16 sm:h-0" />

      <Modal open={!!selected} onClose={() => setSelected(null)}>
        {selected && <EventModal event={selected} onClose={() => setSelected(null)} />}
      </Modal>
    </div>
  );
}
