import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar, BarChart3, Home, ChevronRight,
  X, CheckCircle, BookMarked, ArrowRight, Send,
} from 'lucide-react';
import { subscribeToBooks, type Book } from './services/bookService';
import {
  subscribeToEvents, castVote, getUserVote, postReview,
  type BookEvent, type EventStatus,
} from './services/eventService';

const UNIVERSITIES = [
  { id: 'AMU',  name: 'AMU',  fullName: 'Astana Medical University' },
  { id: 'AITU', name: 'AITU', fullName: 'Astana IT University' },
  { id: 'NU',   name: 'NU',   fullName: 'Nazarbayev University' },
] as const;

type UniId = (typeof UNIVERSITIES)[number]['id'];
type Page  = 'home' | 'events' | 'books' | 'activity';

const STATUS_LABELS: Record<EventStatus, string> = {
  voting: 'Voting Open', upcoming: 'Upcoming', active: 'Reading Now', past: 'Finished',
};
const SC: Record<EventStatus, { pill: string; dot: string }> = {
  voting:   { pill: 'bg-white/10 text-white/80 border-white/15',       dot: 'bg-white' },
  upcoming: { pill: 'bg-sky-400/15 text-sky-300 border-sky-400/20',             dot: 'bg-sky-400' },
  active:   { pill: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/20', dot: 'bg-emerald-400 animate-pulse' },
  past:     { pill: 'bg-white/5 text-white/30 border-white/10',                 dot: 'bg-white/20' },
};

// ── Text-only book card — no external API, no images ─────────────────────────
function BookCard({ title, author, size = 'md' }: { title: string; author: string; size?: 'sm' | 'md' | 'lg' }) {
  const hue  = title.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const bg   = `hsl(${hue},22%,15%)`;
  const acc  = `hsl(${hue},55%,58%)`;
  const bdr  = `hsl(${hue},28%,22%)`;
  const dims = { sm: 'w-10 h-14', md: 'w-14 h-20', lg: 'w-16 h-24' };
  const font = { sm: 16, md: 20, lg: 22 };
  const txt  = { sm: '8px', md: '9px', lg: '9px' };
  return (
    <div className={`${dims[size]} rounded-lg flex-shrink-0 flex flex-col items-center justify-center gap-1 p-1.5 select-none`}
      style={{ background: bg, border: `1px solid ${bdr}` }}>
      <span className="font-display leading-none" style={{ color: acc, fontSize: font[size] }}>
        {title.charAt(0)}
      </span>
      <span className="text-center leading-tight line-clamp-3 opacity-70" style={{ color: acc, fontSize: txt[size] }}>
        {title}
      </span>
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
            className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#0d1645] border border-white/10 p-6 space-y-5"
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
  const [reviewText, setReviewText] = useState('');
  const [reviewName, setReviewName] = useState('');
  const [posting, setPosting]       = useState(false);
  const [reviews, setReviews]       = useState<any[]>(event.reviews ?? []);

  const [localOpts, setLocalOpts] = useState(opts);

  const handleVote = async (optionId: string) => {
    if (!event.id || voting) return;
    const existing = userVote;
    if (existing === optionId) return;

    // Optimistic update
    setLocalOpts(prev => prev.map(o => {
      if (o.id === existing) return { ...o, votes: Math.max(0, o.votes - 1) };
      if (o.id === optionId) return { ...o, votes: o.votes + 1 };
      return o;
    }));
    setUserVote(optionId);
    setVoting(true);

    try { await castVote(event.id, optionId); }
    catch (e: any) {
      // Revert optimistic update on failure
      setLocalOpts(opts);
      setUserVote(existing);
      if (e?.message?.includes('permission')) {
        alert('Voting is not available right now. The admin may need to update Firestore rules.');
      } else {
        alert('Could not save your vote. Try again.');
      }
    }
    finally { setVoting(false); }
  };

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event.id || !reviewText.trim()) return;
    setPosting(true);
    try {
      await postReview(event.id, reviewText.trim(), reviewName.trim() || 'Anonymous');
      const newRev = { id: `rev_${Date.now()}`, text: reviewText.trim(), author: reviewName.trim() || 'Anonymous', createdAt: new Date().toISOString() };
      setReviews(prev => [...prev, newRev]);
      setReviewText(''); setReviewName('');
    } catch { alert('Could not post review.'); }
    finally { setPosting(false); }
  };

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border mb-3 ${sc.pill}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{STATUS_LABELS[event.status]}
          </span>
          <h2 className="font-display text-2xl text-white leading-snug">{event.title}</h2>
          <p className="text-white/30 text-xs font-mono mt-1">{event.date.replace('|', ' → ')}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/10 text-white/30 hover:text-white transition-colors mt-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {event.description && <p className="text-white/50 text-sm leading-relaxed">{event.description}</p>}

      {event.bookTitle && (
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/8 border border-white/12">
          <BookCard title={event.bookTitle} author={event.bookAuthor ?? ''} size="md" />
          <div>
            <p className="font-semibold text-white">{event.bookTitle}</p>
            <p className="text-white/40 text-sm">{event.bookAuthor}</p>
          </div>
        </div>
      )}

      {event.status === 'voting' && opts.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-[10px] uppercase tracking-widest text-white/25 font-semibold">{localOpts.reduce((s,o) => s+o.votes,0)} vote{localOpts.reduce((s,o)=>s+o.votes,0) !== 1 ? 's' : ''} cast</p>
          {localOpts.map(opt => {
            const total2 = localOpts.reduce((s, o) => s + o.votes, 0);
            const maxV2  = Math.max(...localOpts.map(o => o.votes), 0);
            const pct = total2 > 0 ? Math.round((opt.votes / total2) * 100) : 0;
            const isVoted   = userVote === opt.id;
            const isLeading = opt.votes > 0 && opt.votes === maxV2;
            return (
              <button key={opt.id} onClick={() => handleVote(opt.id)} disabled={voting}
                className={`w-full text-left rounded-2xl border overflow-hidden transition-all duration-150 ${
                  isVoted ? 'border-white/60 bg-white/10' : 'border-white/8 bg-white/3 hover:border-white/20'
                }`}>
                <div className="relative p-3.5">
                  {total > 0 && (
                    <div className="absolute inset-0 bg-white/3 rounded-2xl" style={{ width: `${pct}%`, transition: 'width .5s ease' }} />
                  )}
                  <div className="relative flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <BookCard title={opt.title} author={opt.author} size="sm" />
                      <div>
                        <p className="font-medium text-sm text-white">{opt.title}</p>
                        <p className="text-white/35 text-xs">{opt.author}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isLeading && !isVoted && <span className="text-[10px] font-bold text-white tracking-wider">TOP</span>}
                      <span className={`text-sm font-mono ${isVoted ? 'text-white' : 'text-white/25'}`}>{pct}%</span>
                      {isVoted && <CheckCircle className="w-4 h-4 text-white" />}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
          {userVote && <p className="text-[10px] text-white/20 text-center pt-1">Tap another option to change your vote</p>}
        </div>
      )}

      {/* Reviews — auto-shown when event is finished */}
      {event.status === 'past' && (
        <div className="space-y-3 pt-1 border-t border-white/6">
          <p className="text-[10px] uppercase tracking-widest text-white/25 font-semibold pt-1">
            Thoughts on this book
          </p>
          {reviews.length > 0 ? reviews.map((r: any) => (
            <div key={r.id} className="p-3 rounded-xl bg-white/3 border border-white/6">
              <p className="text-white/60 text-sm leading-relaxed">{r.text}</p>
              <p className="text-white/20 text-[10px] mt-2">{r.author}</p>
            </div>
          )) : (
            <p className="text-white/20 text-xs italic">No thoughts shared yet. Be the first.</p>
          )}
          <form onSubmit={handleReview} className="space-y-2 pt-1">
            <textarea
              placeholder="What did you think?"
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors resize-none"
            />
            <div className="flex gap-2">
              <input
                placeholder="Your name (optional)"
                value={reviewName}
                onChange={e => setReviewName(e.target.value)}
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors"
              />
              <button type="submit" disabled={posting || !reviewText.trim()}
                className="px-4 py-2 bg-white text-[#070e3c] rounded-xl text-sm font-semibold hover:bg-white/90 transition-colors disabled:opacity-30 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

// ── Count-up hook ─────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1000, delay = 0) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    const timer = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(timer);
  }, [target, duration, delay]);
  return val;
}

const FAQ = [
  { q: 'Is there a membership fee?',                   a: 'No. Participation is completely free.' },
  { q: 'Is there an age restriction?',                  a: 'Yes, the club is 18+.' },
  { q: 'How often do you meet?',                        a: 'Approximately once every two weeks.' },
  { q: 'Do you have required reading deadlines?',       a: 'No strict deadlines. Participation is flexible.' },
  { q: 'What kind of books do you read?',               a: 'All genres. Selections are made collectively by members.' },
  { q: 'Do I have to finish the book to attend?',       a: 'No. Come even if you haven\'t finished — or haven\'t started.' },
  { q: 'Do I need to be well-read to join?',            a: 'Not at all. The club is open to everyone regardless of experience.' },
  { q: 'What language are discussions in?',             a: 'A mix of Kazakh, English, and Russian depending on participants. Foreigners are welcome.' },
  { q: 'Is it only about reading?',                     a: 'No. It\'s also about community, conversation, and shared experiences.' },
  { q: 'What if I\'m shy or introverted?',              a: 'That\'s completely fine. You can participate at your own pace.' },
  { q: 'Are there additional activities?',              a: 'Yes — themed events, discussions, and community activities.' },
  { q: 'What are the main rules?',                      a: 'Respect, openness, and a comfortable environment for everyone.' },
];

// ── HOME ──────────────────────────────────────────────────────────────────────
function HomePage({ onNav, allEvents, allBooks }: {
  onNav: (p: Page) => void; allEvents: BookEvent[]; allBooks: Book[];
}) {
  const finished = allEvents.filter(e => e.status === 'past').length;
  const votes    = allEvents.flatMap(e => e.votingOptions ?? []).reduce((s, o) => s + o.votes, 0);
  const [scrollY, setScrollY]   = useState(0);
  const [openFaq, setOpenFaq]   = useState<number | null>(null);
  const nBooks = useCountUp(allBooks.length, 900, 300);
  const nRead  = useCountUp(finished, 900, 400);
  const nVotes = useCountUp(votes, 900, 500);

  useEffect(() => {
    const h = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <div className="pb-16">

      {/* ── Hero ── */}
      <div className="pt-10 pb-16 border-b border-white/6">
        <motion.div style={{ y: scrollY * -0.08 }} className="mb-10 inline-block">
          <img src="/serinclublogo.jpg" alt="Sërin" className="w-28 h-28 object-contain" />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="text-white/45 text-lg leading-relaxed max-w-xs mb-10">
            A book community across Astana's universities — where reading is social, slow, and honest.
          </p>
          <div className="flex flex-col gap-3 w-fit">
            <a href="https://t.me/+GjXC-aQ_TbcxMTE6" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white border border-white/15 rounded-full text-sm font-semibold hover:bg-white/15 active:scale-95 transition-all">
              Join Telegram community <ArrowRight className="w-4 h-4" />
            </a>
            <button onClick={() => onNav('events')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-[#070e3c] rounded-full text-sm font-semibold hover:bg-white/90 active:scale-95 transition-all">
              See what we're reading <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>

      {/* ── Three pillars ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="py-14 border-b border-white/6 space-y-8">
        {[
          { num: '01', title: 'One book, everyone reads',  body: 'Every event, the whole community picks one book together. No lectures, no tests — just the same pages, different minds.' },
          { num: '02', title: 'You vote on what\'s next',  body: 'Suggest books, cast your vote, see what wins. The next read is always a collective decision.' },
          { num: '03', title: 'Show up as you are',        body: 'No deadlines. No correct taste. Read slow, read weird, or just come for the conversation. Everyone belongs here.' },
        ].map(({ num, title, body }, i) => (
          <motion.div key={num} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.1 }}
            className="flex gap-6">
            <span className="font-mono text-[11px] text-white/20 pt-0.5 flex-shrink-0 w-6">{num}</span>
            <div>
              <p className="font-semibold text-white mb-1">{title}</p>
              <p className="text-white/35 text-sm leading-relaxed">{body}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Stats ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        className="py-14 border-b border-white/6">
        <div className="grid grid-cols-3 gap-8 text-center">
          {[{ val: nBooks, label: 'On the list' }, { val: nRead, label: 'Books read' }, { val: nVotes, label: 'Votes cast' }].map(({ val, label }) => (
            <div key={label}>
              <p className="font-display text-4xl text-white leading-none">{val}</p>
              <p className="text-white/25 text-xs mt-2 uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Campus cards ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
        className="py-14 border-b border-white/6">
        <p className="text-[10px] uppercase tracking-widest text-white/20 font-semibold mb-6">Campuses</p>
        <div className="space-y-4">
          {[
            {
              name: 'Nazarbayev University',
              tag: 'NU',
              est: 'est. 16 Apr 2026',
              links: [
                { label: 'Instagram', href: 'https://www.instagram.com/serinlabs' },
                { label: 'serin@nu.edu.kz', href: 'mailto:serin@nu.edu.kz' },
              ],
            },
            {
              name: 'Astana IT University',
              tag: 'AITU',
              est: 'est. 30 Apr 2026',
              links: [
                { label: 'Instagram', href: 'https://www.instagram.com/aituserin' },
                { label: 'Telegram', href: 'https://t.me/bookmateAITU' },
              ],
            },
            {
              name: 'Astana Medical University',
              tag: 'AMU',
              est: 'est. 22 Apr 2026',
              links: [
                { label: 'Instagram', href: 'https://www.instagram.com/muaserin' },
              ],
            },
          ].map((campus, i) => (
            <motion.div key={campus.tag}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.08 }}
              className="flex items-start justify-between gap-4 py-4 border-b border-white/5 last:border-0">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-wider">{campus.tag}</span>
                  <span className="text-[10px] text-white/20">{campus.est}</span>
                </div>
                <p className="text-white/70 text-sm font-medium">Sërin at {campus.name}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {campus.links.map(l => (
                  <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-white/25 hover:text-white transition-colors">
                    {l.label} ↗
                  </a>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── FAQ ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        className="py-14 border-b border-white/6">
        <p className="text-[10px] uppercase tracking-widest text-white/20 font-semibold mb-6">FAQ</p>
        <div className="space-y-0">
          {FAQ.map(({ q, a }, i) => (
            <div key={i} className="border-b border-white/5 last:border-0">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between py-4 text-left gap-4 group">
                <span className="text-sm text-white/60 group-hover:text-white transition-colors">{q}</span>
                <motion.span
                  animate={{ rotate: openFaq === i ? 45 : 0 }}
                  transition={{ duration: 0.15 }}
                  className="text-white/20 group-hover:text-white transition-colors flex-shrink-0 text-lg leading-none">
                  +
                </motion.span>
              </button>
              <AnimatePresence>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden">
                    <p className="text-white/35 text-sm leading-relaxed pb-4">{a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Footer ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
        className="pt-14 pb-4 border-t border-white/6 mt-4">
        <p className="text-white/20 text-xs leading-relaxed max-w-sm">
          If you reached the bottom of the page, you're probably avoiding reading your current book. Congratulations. You scrolled further than most people read.
        </p>
        <p className="text-white/15 text-xs mt-3">
          Built in Astana, 2026 by Imangali. Probably instead of sleeping.
        </p>
      </motion.div>
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
              className="group w-full text-left rounded-2xl border border-white/8 bg-white/4 hover:border-white/25 hover:bg-white/6 transition-all duration-150 p-4">
              <div className="flex items-center gap-4">
                {ev.bookTitle && <BookCard title={ev.bookTitle} author={ev.bookAuthor ?? ''} size="sm" />}
                <div className="flex-1 min-w-0">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border mb-1 ${SC[ev.status].pill}`}>
                    <span className={`w-1 h-1 rounded-full ${SC[ev.status].dot}`} />{STATUS_LABELS[ev.status]}
                  </span>
                  <p className="font-semibold text-white text-sm truncate">{ev.title}</p>
                  {ev.bookTitle
                    ? <p className="text-white/35 text-xs truncate">{ev.bookTitle} · {ev.bookAuthor}</p>
                    : ev.status === 'voting'
                      ? <p className="text-white/35 text-xs">{(ev.votingOptions ?? []).reduce((s, o) => s + o.votes, 0)} votes · {(ev.votingOptions ?? []).length} options</p>
                      : null}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <p className="text-white/20 text-xs font-mono hidden sm:block">{ev.date}</p>
                  <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white transition-colors" />
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
              <BookCard title={book.title} author={book.author} size="sm" />
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
        <div className="rounded-2xl border border-white/12 bg-white/6 p-5">
          <p className="text-white/35 text-[10px] uppercase tracking-widest font-semibold mb-1">Most active</p>
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
              <motion.div className="absolute inset-y-0 left-0 bg-white/20 border-r border-white/15"
                initial={{ width: 0 }} animate={{ width: `${(u.events / maxE) * 100}%` }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeOut' }} />
              <span className="absolute inset-0 flex items-center px-3 text-xs text-white/40 font-mono">
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
            <span className="font-display text-3xl text-white leading-none">{n}</span>
            <span className="text-white/30 text-xs mb-0.5">{l}</span>
          </div>
        ))}
      </div>

      <div className="space-y-px rounded-2xl overflow-hidden border border-white/8">
        {byUni.map((u, i) => (
          <div key={u.id} className={`flex items-center justify-between px-4 py-3 ${i % 2 === 0 ? 'bg-white/3' : 'bg-white/2'}`}>
            <span className="text-white/50 text-sm">{u.fullName}</span>
            <span className="text-white/50 text-sm font-mono">{u.books} book{u.books !== 1 ? 's' : ''}</span>
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
            active === u.id ? 'bg-white text-[#070e3c]' : 'text-white/40 hover:text-white'
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
    <div className="min-h-screen bg-[#070e3c]">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/6 bg-[#070e3c]/90 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-5 h-13 flex items-center justify-between">
          <button onClick={() => setPage('home')}>
            <img src="/serinclublogo.jpg" alt="Sërin" className="w-10 h-10 object-contain" />
          </button>
          <nav className="hidden sm:flex items-center gap-0.5">
            {NAV.map(({ id, label }) => (
              <button key={id} onClick={() => setPage(id as Page)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                  page === id ? 'bg-white text-[#070e3c]' : 'text-white/40 hover:text-white'
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
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 border-t border-white/6 bg-[#070e3c]/95 backdrop-blur-md">
        <div className="flex justify-around px-2 py-2">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setPage(id as Page)}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 transition-colors ${
                page === id ? 'text-white' : 'text-white/25'
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
