import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen, Calendar, BarChart3, Home, ChevronRight,
  X, CheckCircle, Star, Users, BookMarked, ArrowRight,
  Flame,
} from 'lucide-react';
import { subscribeToBooks, type Book } from './services/bookService';
import {
  subscribeToEvents, castVote, getUserVote,
  type BookEvent, type EventStatus,
} from './services/eventService';

const UNIVERSITIES = [
  { id: 'AMU', name: 'AMU', fullName: 'Astana Medical University', color: 'from-blue-900' },
  { id: 'AITU', name: 'AITU', fullName: 'Astana IT University', color: 'from-indigo-900' },
  { id: 'NU', name: 'NU', fullName: 'Nazarbayev University', color: 'from-purple-900' },
] as const;

type UniId = (typeof UNIVERSITIES)[number]['id'];
type Page = 'home' | 'events' | 'stats' | 'nominations';

const STATUS_LABELS: Record<EventStatus, string> = {
  voting: 'Open for Voting',
  upcoming: 'Upcoming',
  active: 'Reading Now',
  past: 'Past',
};
const STATUS_COLORS: Record<EventStatus, { bg: string; text: string; dot: string }> = {
  voting:   { bg: 'bg-amber-500/20',   text: 'text-amber-300',   dot: 'bg-amber-400' },
  upcoming: { bg: 'bg-blue-500/20',    text: 'text-blue-300',    dot: 'bg-blue-400' },
  active:   { bg: 'bg-emerald-500/20', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  past:     { bg: 'bg-white/10',       text: 'text-white/40',    dot: 'bg-white/30' },
};

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          onClick={onClose}>
          <motion.div initial={{ opacity: 0, scale: 0.94, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 24 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#0D1B3E] p-7 space-y-5 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function EventDetailModal({ event, onClose }: { event: BookEvent; onClose: () => void }) {
  const [userVote, setUserVote] = useState<string | null>(event.id ? getUserVote(event.id) : null);
  const [voting, setVoting] = useState(false);
  const totalVotes = (event.votingOptions ?? []).reduce((s, o) => s + o.votes, 0);
  const leadingVotes = Math.max(0, ...(event.votingOptions ?? []).map(o => o.votes));
  const sc = STATUS_COLORS[event.status];

  const handleVote = async (optionId: string) => {
    if (!event.id || voting) return;
    setVoting(true);
    try { await castVote(event.id, optionId); setUserVote(optionId); }
    catch { alert('Could not register vote.'); }
    finally { setVoting(false); }
  };

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider mb-3 ${sc.bg} ${sc.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
            {STATUS_LABELS[event.status]}
          </span>
          <h3 className="font-display text-2xl text-white leading-tight">{event.title}</h3>
          <p className="text-white/40 text-sm mt-1 font-mono">{event.date}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {event.description && <p className="text-white/60 text-sm leading-relaxed">{event.description}</p>}

      {(event.bookTitle || event.bookAuthor) && (
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 text-[#0D1B3E]" />
          </div>
          <div>
            <p className="font-semibold text-white">{event.bookTitle}</p>
            <p className="text-amber-400/70 text-xs">{event.bookAuthor}</p>
          </div>
        </div>
      )}

      {event.status === 'voting' && (event.votingOptions ?? []).length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-widest text-white/30 font-semibold">
            Vote · {totalVotes} cast
          </p>
          {(event.votingOptions ?? []).map(opt => {
            const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
            const isVoted = userVote === opt.id;
            const isWinning = opt.votes > 0 && opt.votes === leadingVotes;
            return (
              <button key={opt.id} onClick={() => handleVote(opt.id)} disabled={voting}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 relative overflow-hidden ${
                  isVoted ? 'border-amber-500 bg-amber-500/20' : 'border-white/10 bg-white/5 hover:border-amber-500/50'
                }`}>
                {totalVotes > 0 && !isVoted && (
                  <div className="absolute inset-y-0 left-0 bg-white/5 rounded-2xl transition-all duration-500" style={{ width: `${pct}%` }} />
                )}
                <div className="relative flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm text-white">{opt.title}</p>
                    <p className="text-white/40 text-xs">{opt.author}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isWinning && !isVoted && <span className="text-[10px] font-bold text-amber-400">LEADING</span>}
                    <span className={`text-sm font-mono font-semibold ${isVoted ? 'text-amber-400' : 'text-white/40'}`}>{pct}%</span>
                    {isVoted && <CheckCircle className="w-4 h-4 text-amber-400" />}
                  </div>
                </div>
              </button>
            );
          })}
          {userVote && <p className="text-[11px] text-white/30 text-center">Tap another option to switch your vote.</p>}
        </div>
      )}
    </>
  );
}

// ── HOME PAGE ─────────────────────────────────────────────────────────────────
function HomePage({ onNavigate, allEvents, allBooks }: {
  onNavigate: (p: Page) => void;
  allEvents: BookEvent[];
  allBooks: Book[];
}) {
  const activeEvent = allEvents.find(e => e.status === 'active' || e.status === 'voting');
  const totalBooks = allBooks.length;
  const totalVotes = allEvents.flatMap(e => e.votingOptions ?? []).reduce((s, o) => s + o.votes, 0);

  return (
    <div className="space-y-12">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        className="relative pt-8 pb-12">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent rounded-3xl pointer-events-none" />
        <div className="flex items-center gap-5 mb-8">
          <img src="/serinclublogo.jpg" alt="Sërin" className="w-20 h-20 rounded-3xl object-cover shadow-xl shadow-amber-500/20 flex-shrink-0" />
          <div>
            <p className="text-amber-400/70 text-xs uppercase tracking-widest font-semibold mb-1">AMU · AITU · NU</p>
            <h1 className="font-display text-5xl text-white leading-none">Sërin</h1>
            <p className="text-white/40 font-medium mt-1">Family Book Club</p>
          </div>
        </div>
        <p className="text-white/60 text-lg leading-relaxed max-w-lg">
          A shared reading community across AMU, AITU, and NU — discovering books together, one month at a time.
        </p>
        <div className="flex gap-3 mt-8 flex-wrap">
          <button onClick={() => onNavigate('events')}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-[#0D1B3E] rounded-full text-sm font-semibold hover:bg-amber-400 transition-colors">
            View Events <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={() => onNavigate('nominations')}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white rounded-full text-sm font-medium hover:bg-white/15 transition-colors border border-white/10">
            Browse Reading List
          </button>
        </div>
      </motion.div>

      {/* Stats row */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="grid grid-cols-3 gap-4">
        {[
          { label: 'Books Read', value: allEvents.filter(e => e.status === 'past').length, icon: BookMarked },
          { label: 'On the List', value: totalBooks, icon: Star },
          { label: 'Votes Cast', value: totalVotes, icon: Users },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
            <Icon className="w-5 h-5 text-amber-400 mx-auto mb-2" />
            <p className="text-2xl font-display text-white">{value}</p>
            <p className="text-white/40 text-xs mt-0.5">{label}</p>
          </div>
        ))}
      </motion.div>

      {/* Active event spotlight */}
      {activeEvent && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <p className="text-[11px] uppercase tracking-widest text-amber-400/70 font-semibold mb-3 flex items-center gap-2">
            <Flame className="w-3.5 h-3.5" /> Happening Now
          </p>
          <div className="bg-gradient-to-br from-amber-500/15 to-transparent border border-amber-500/20 rounded-3xl p-6">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider mb-3 ${STATUS_COLORS[activeEvent.status].bg} ${STATUS_COLORS[activeEvent.status].text}`}>
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${STATUS_COLORS[activeEvent.status].dot}`} />
              {STATUS_LABELS[activeEvent.status]}
            </span>
            <h3 className="font-display text-2xl text-white mb-1">{activeEvent.title}</h3>
            {activeEvent.bookTitle && (
              <p className="text-amber-400/80 text-sm">{activeEvent.bookTitle} · {activeEvent.bookAuthor}</p>
            )}
            {activeEvent.description && (
              <p className="text-white/50 text-sm mt-2 leading-relaxed">{activeEvent.description}</p>
            )}
            <button onClick={() => onNavigate('events')}
              className="mt-4 flex items-center gap-1.5 text-sm text-amber-400 font-medium hover:text-amber-300 transition-colors">
              See all events <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* About */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="border-t border-white/10 pt-10 grid sm:grid-cols-3 gap-6">
        {[
          { title: 'Read Together', desc: 'Every month we pick one book and everyone reads it at their own pace.' },
          { title: 'Vote & Decide', desc: 'Members vote on what comes next. Your voice shapes the next read.' },
          { title: 'Three Campuses', desc: 'AMU, AITU, and NU — one community across Astana\'s top universities.' },
        ].map(({ title, desc }) => (
          <div key={title}>
            <h4 className="font-semibold text-white mb-1.5">{title}</h4>
            <p className="text-white/40 text-sm leading-relaxed">{desc}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

// ── EVENTS PAGE ───────────────────────────────────────────────────────────────
function EventsPage({ events, loading, onSelect, activeUni, setActiveUni }: {
  events: BookEvent[]; loading: boolean;
  onSelect: (e: BookEvent) => void;
  activeUni: UniId; setActiveUni: (u: UniId) => void;
}) {
  return (
    <div>
      <div className="mb-8">
        <h2 className="font-display text-4xl text-white mb-1">Events</h2>
        <p className="text-white/40">Shared reading events by campus</p>
      </div>
      <div className="flex gap-1 p-1 bg-white/5 rounded-2xl mb-8 w-fit border border-white/10">
        {UNIVERSITIES.map(uni => (
          <button key={uni.id} onClick={() => setActiveUni(uni.id)}
            className={`px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeUni === uni.id ? 'bg-amber-500 text-[#0D1B3E]' : 'text-white/50 hover:text-white'
            }`}>
            {uni.name}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {loading ? (
            <motion.div key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-16 text-center text-white/30 text-sm">Loading…</motion.div>
          ) : events.length > 0 ? events.map(ev => {
            const sc = STATUS_COLORS[ev.status];
            const totalVotes = (ev.votingOptions ?? []).reduce((s, o) => s + o.votes, 0);
            return (
              <motion.button layout key={ev.id}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
                onClick={() => onSelect(ev)}
                className="group w-full text-left bg-white/5 border border-white/10 hover:border-amber-500/40 rounded-2xl p-5 transition-all duration-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider mb-2 ${sc.bg} ${sc.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${ev.status === 'active' || ev.status === 'voting' ? 'animate-pulse' : ''} ${sc.dot}`} />
                      {STATUS_LABELS[ev.status]}
                    </span>
                    <h3 className="font-semibold text-white truncate">{ev.title}</h3>
                    {ev.bookTitle ? (
                      <p className="text-white/40 text-sm truncate mt-0.5">{ev.bookTitle} · {ev.bookAuthor}</p>
                    ) : ev.status === 'voting' ? (
                      <p className="text-amber-400/70 text-sm mt-0.5">{totalVotes} votes · {(ev.votingOptions ?? []).length} options</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <p className="text-white/30 text-xs font-mono hidden sm:block">{ev.date}</p>
                    <div className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-amber-500 group-hover:text-[#0D1B3E] transition-all duration-200 text-white/30">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          }) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="py-20 text-center border border-dashed border-white/10 rounded-3xl">
              <Calendar className="w-8 h-8 text-white/20 mx-auto mb-3" />
              <p className="text-white/30 text-sm">No events for this campus yet.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── ACTIVITY PAGE ─────────────────────────────────────────────────────────────
function StatsPage({ allEvents, allBooks }: { allEvents: BookEvent[]; allBooks: Book[] }) {
  const past = allEvents.filter(e => e.status === 'past');
  const totalVotes = allEvents.flatMap(e => e.votingOptions ?? []).reduce((s, o) => s + o.votes, 0);
  const byUni = UNIVERSITIES.map(u => ({
    ...u,
    events: allEvents.filter(e => e.uniId === u.id).length,
    books: allBooks.filter(b => b.uniId === u.id).length,
  }));
  const maxEvents = Math.max(...byUni.map(u => u.events), 1);
  const mostActive = byUni.reduce((a, b) => a.events >= b.events ? a : b);

  return (
    <div className="space-y-10">
      <div>
        <h2 className="font-display text-4xl text-white mb-1">Activity</h2>
        <p className="text-white/40">How we're doing across campuses</p>
      </div>

      {/* Highlight card */}
      {allEvents.length > 0 && (
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-7">
          <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          <p className="text-amber-400/60 text-xs uppercase tracking-widest font-semibold mb-3">Most Active Campus</p>
          <p className="font-display text-3xl text-white">{mostActive.fullName}</p>
          <p className="text-white/40 text-sm mt-1">{mostActive.events} event{mostActive.events !== 1 ? 's' : ''} · {mostActive.books} books on the list</p>
        </div>
      )}

      {/* Campus breakdown */}
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-widest text-white/30 font-semibold">Events per campus</p>
        {byUni.map((u, i) => (
          <div key={u.id} className="flex items-center gap-4">
            <span className="text-sm font-semibold text-white/60 w-10 flex-shrink-0">{u.name}</span>
            <div className="flex-1 h-8 bg-white/5 rounded-xl overflow-hidden relative border border-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(u.events / maxEvents) * 100}%` }}
                transition={{ duration: 0.7, delay: i * 0.1, ease: 'easeOut' }}
                className="absolute inset-y-0 left-0 bg-amber-500/30 border-r border-amber-500/40"
              />
              <span className="absolute inset-0 flex items-center px-3 text-xs font-mono text-amber-400">
                {u.events} event{u.events !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Four numbers, clean */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { n: allEvents.length, label: 'Events total' },
          { n: past.length, label: 'Completed' },
          { n: allBooks.length, label: 'Books on list' },
          { n: totalVotes, label: 'Votes cast' },
        ].map(({ n, label }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 flex items-baseline gap-3">
            <span className="font-display text-4xl text-amber-400">{n}</span>
            <span className="text-white/40 text-sm">{label}</span>
          </div>
        ))}
      </div>

      {/* Reading List breakdown */}
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-widest text-white/30 font-semibold">Reading list by campus</p>
        {byUni.map(u => (
          <div key={u.id} className="flex items-center justify-between py-3 border-b border-white/5">
            <span className="text-white/60 text-sm">{u.fullName}</span>
            <span className="text-amber-400 text-sm font-mono">{u.books} book{u.books !== 1 ? 's' : ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── NOMINATIONS PAGE ──────────────────────────────────────────────────────────
function NominationsPage({ books, loading, activeUni, setActiveUni }: {
  books: Book[]; loading: boolean; activeUni: UniId; setActiveUni: (u: UniId) => void;
}) {
  return (
    <div>
      <div className="mb-8">
        <h2 className="font-display text-4xl text-white mb-1">Reading List</h2>
        <p className="text-white/40">Books members want to read</p>
      </div>
      <div className="flex gap-1 p-1 bg-white/5 rounded-2xl mb-8 w-fit border border-white/10">
        {UNIVERSITIES.map(uni => (
          <button key={uni.id} onClick={() => setActiveUni(uni.id)}
            className={`px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeUni === uni.id ? 'bg-amber-500 text-[#0D1B3E]' : 'text-white/50 hover:text-white'
            }`}>
            {uni.name}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {loading ? (
            <motion.div key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-16 text-center text-white/30 text-sm">Loading…</motion.div>
          ) : books.length > 0 ? books.map((book, idx) => (
            <motion.div layout key={book.id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="group flex items-center gap-4 bg-white/5 border border-white/10 hover:border-amber-500/30 rounded-2xl p-4 transition-all duration-200">
              <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500 transition-colors duration-200">
                <BookOpen className="w-5 h-5 text-amber-400 group-hover:text-[#0D1B3E] transition-colors duration-200" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{book.title}</p>
                <p className="text-white/40 text-sm">{book.author}</p>
              </div>
              <p className="text-white/20 text-xs font-mono hidden sm:block flex-shrink-0">
                {book.createdAt?.toDate?.()?.toLocaleDateString() || ''}
              </p>
            </motion.div>
          )) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="py-20 text-center border border-dashed border-white/10 rounded-3xl">
              <Star className="w-8 h-8 text-white/20 mx-auto mb-3" />
              <p className="text-white/30 text-sm">Nothing on the list yet for this campus.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<Page>('home');
  const [activeUni, setActiveUni] = useState<UniId>('AITU');
  const [books, setBooks] = useState<Book[]>([]);
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [events, setEvents] = useState<BookEvent[]>([]);
  const [allEvents, setAllEvents] = useState<BookEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<BookEvent | null>(null);

  useEffect(() => {
    setBooksLoading(true);
    const unsub = subscribeToBooks(activeUni, (b) => { setBooks(b); setBooksLoading(false); });
    return () => unsub();
  }, [activeUni]);

  useEffect(() => {
    const unsubs = UNIVERSITIES.map(u => subscribeToBooks(u.id, (b) => {
      setAllBooks(prev => [...prev.filter(x => x.uniId !== u.id), ...b]);
    }));
    return () => unsubs.forEach(u => u());
  }, []);

  useEffect(() => {
    setEventsLoading(true);
    const unsub = subscribeToEvents(activeUni, (e) => {
      setEvents(e); setEventsLoading(false);
      setSelectedEvent(prev => prev?.id ? (e.find(ev => ev.id === prev.id) ?? prev) : prev);
    });
    return () => unsub();
  }, [activeUni]);

  useEffect(() => {
    const unsubs = UNIVERSITIES.map(u => subscribeToEvents(u.id, (e) => {
      setAllEvents(prev => [...prev.filter(x => x.uniId !== u.id), ...e]);
    }));
    return () => unsubs.forEach(u => u());
  }, []);

  const NAV = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'nominations', label: 'Reading List', icon: BookMarked },
    { id: 'stats', label: 'Activity', icon: BarChart3 },
  ] as const;

  return (
    <div className="min-h-screen bg-[#0D1B3E]">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0D1B3E]/90 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <button onClick={() => setPage('home')} className="flex items-center gap-2.5">
            <img src="/serinclublogo.jpg" alt="Sërin" className="w-8 h-8 rounded-lg object-cover" />
          </button>
          <nav className="hidden sm:flex items-center gap-1">
            {NAV.map(({ id, label }) => (
              <button key={id} onClick={() => setPage(id as Page)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  page === id ? 'bg-amber-500 text-[#0D1B3E]' : 'text-white/50 hover:text-white'
                }`}>
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-3xl mx-auto px-6 py-10">
        <AnimatePresence mode="wait">
          {page === 'home' && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <HomePage onNavigate={setPage} allEvents={allEvents} allBooks={allBooks} />
            </motion.div>
          )}
          {page === 'events' && (
            <motion.div key="events" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <EventsPage events={events} loading={eventsLoading} onSelect={setSelectedEvent} activeUni={activeUni} setActiveUni={setActiveUni} />
            </motion.div>
          )}
          {page === 'nominations' && (
            <motion.div key="nominations" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <NominationsPage books={books} loading={booksLoading} activeUni={activeUni} setActiveUni={setActiveUni} />
            </motion.div>
          )}
          {page === 'stats' && (
            <motion.div key="stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <StatsPage allEvents={allEvents} allBooks={allBooks} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 border-t border-white/10 bg-[#0D1B3E]/95 backdrop-blur-md px-2 pb-safe">
        <div className="flex justify-around">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setPage(id as Page)}
              className={`flex flex-col items-center gap-1 px-4 py-3 transition-all ${
                page === id ? 'text-amber-400' : 'text-white/30'
              }`}>
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="h-20 sm:h-0" />

      <Modal open={!!selectedEvent} onClose={() => setSelectedEvent(null)}>
        {selectedEvent && <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
      </Modal>
    </div>
  );
}
