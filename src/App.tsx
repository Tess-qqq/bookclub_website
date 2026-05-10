import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Book as BookIcon,
  Plus,
  GraduationCap,
  Library,
  Calendar,
  ChevronRight,
  X,
  Trash2,
  CheckCircle,
  Lock,
  BookOpen,
  ShieldCheck,
} from 'lucide-react';
import { addBook, subscribeToBooks, type Book } from './services/bookService';
import {
  subscribeToEvents,
  createEvent,
  deleteEvent,
  castVote,
  getUserVote,
  addVotingOption,
  removeVotingOption,
  checkAdminPin,
  type BookEvent,
  type EventStatus,
} from './services/eventService';

const UNIVERSITIES = [
  { id: 'AMU', name: 'AMU', fullName: 'Astana Medical University' },
  { id: 'AITU', name: 'AITU', fullName: 'Astana IT University' },
  { id: 'NU', name: 'NU', fullName: 'Nazarbayev University' },
] as const;

type UniId = (typeof UNIVERSITIES)[number]['id'];
type Tab = 'books' | 'events';

const STATUS_LABELS: Record<EventStatus, string> = {
  voting: 'Open for Voting',
  upcoming: 'Upcoming',
  active: 'Reading Now',
  past: 'Past',
};

const STATUS_COLORS: Record<EventStatus, string> = {
  voting: 'bg-amber-50 text-amber-700 border-amber-200',
  upcoming: 'bg-blue-50 text-blue-700 border-blue-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  past: 'bg-[#F5F5F5] text-[#9E9E9E] border-[#E5E5E5]',
};

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="bg-white rounded-3xl border border-[#E5E5E5] w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AdminLogin({ onSuccess }: { onSuccess: (pin: string) => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (checkAdminPin(pin)) {
      onSuccess(pin);
    } else {
      setError(true);
      setPin('');
      setTimeout(() => setError(false), 1500);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center pb-2">
        <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center mx-auto mb-3">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <h3 className="font-semibold text-lg">Admin Access</h3>
        <p className="text-[#9E9E9E] text-sm mt-1">Enter your admin PIN to continue</p>
      </div>
      <input
        ref={inputRef}
        type="password"
        placeholder="PIN"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        className={`w-full px-4 py-3 bg-[#F9F9F9] border rounded-xl text-sm text-center tracking-widest focus:outline-none transition-colors ${
          error ? 'border-red-400 bg-red-50' : 'border-[#EEEEEE] focus:border-black'
        }`}
      />
      {error && <p className="text-red-500 text-xs text-center">Incorrect PIN. Try again.</p>}
      <button type="submit" className="w-full py-3 bg-black text-white rounded-xl text-sm font-semibold hover:bg-[#333] transition-colors">
        Unlock
      </button>
    </form>
  );
}

function EventDetailModal({
  event, isAdmin, onClose, onUpdate, onDelete,
}: {
  event: BookEvent; isAdmin: boolean; onClose: () => void; onUpdate: () => void; onDelete: () => void;
}) {
  const [userVote, setUserVote] = useState<string | null>(event.id ? getUserVote(event.id) : null);
  const [voting, setVoting] = useState(false);
  const [addingOption, setAddingOption] = useState(false);
  const [optTitle, setOptTitle] = useState('');
  const [optAuthor, setOptAuthor] = useState('');

  const handleVote = async (optionId: string) => {
    if (!event.id || voting) return;
    setVoting(true);
    try {
      await castVote(event.id, optionId);
      setUserVote(optionId);
      onUpdate();
    } catch { alert('Could not register vote. Please try again.'); }
    finally { setVoting(false); }
  };

  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event.id || !optTitle || !optAuthor) return;
    try {
      await addVotingOption(event.id, optTitle, optAuthor);
      setOptTitle(''); setOptAuthor(''); setAddingOption(false); onUpdate();
    } catch { alert('Failed to add option.'); }
  };

  const totalVotes = (event.votingOptions ?? []).reduce((s, o) => s + o.votes, 0);
  const leadingVotes = Math.max(0, ...(event.votingOptions ?? []).map(o => o.votes));

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border mb-2 ${STATUS_COLORS[event.status]}`}>
            {STATUS_LABELS[event.status]}
          </span>
          <h3 className="font-semibold text-xl leading-tight">{event.title}</h3>
          <p className="text-[#9E9E9E] text-sm mt-0.5">{event.date}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-[#F5F5F5] rounded-full transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {event.description && (
        <p className="text-[#666] text-sm leading-relaxed">{event.description}</p>
      )}

      {(event.bookTitle || event.bookAuthor) && (
        <div className="bg-[#F9F9F9] border border-[#EEEEEE] rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-sm">{event.bookTitle}</p>
            <p className="text-[#9E9E9E] text-xs">{event.bookAuthor}</p>
          </div>
        </div>
      )}

      {event.status === 'voting' && (event.votingOptions ?? []).length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-[#9E9E9E] font-bold">
            Vote for the next read · {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
          </p>
          {(event.votingOptions ?? []).map((opt) => {
            const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
            const isVoted = userVote === opt.id;
            const isWinning = opt.votes > 0 && opt.votes === leadingVotes;
            return (
              <div key={opt.id} className="relative">
                <button
                  onClick={() => handleVote(opt.id)}
                  disabled={voting}
                  className={`w-full text-left p-3 rounded-2xl border transition-all duration-200 relative overflow-hidden ${
                    isVoted ? 'border-black bg-black text-white' : 'border-[#E5E5E5] bg-white hover:border-black'
                  }`}
                >
                  {!isVoted && totalVotes > 0 && (
                    <div className="absolute inset-y-0 left-0 bg-[#F5F5F5] transition-all duration-500 rounded-2xl" style={{ width: `${pct}%` }} />
                  )}
                  <div className="relative flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{opt.title}</p>
                      <p className={`text-xs ${isVoted ? 'text-white/70' : 'text-[#9E9E9E]'}`}>{opt.author}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isWinning && !isVoted && <span className="text-[10px] font-bold text-amber-600">LEADING</span>}
                      <span className={`text-sm font-mono font-semibold ${isVoted ? 'text-white' : 'text-[#666]'}`}>{pct}%</span>
                      {isVoted && <CheckCircle className="w-4 h-4 text-white" />}
                    </div>
                  </div>
                </button>
                {isAdmin && (
                  <button
                    onClick={() => { if (!event.id) return; removeVotingOption(event.id, opt.id).then(onUpdate); }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-100 text-red-500 rounded-full flex items-center justify-center hover:bg-red-200 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
          {userVote && (
            <p className="text-[10px] text-[#9E9E9E] text-center pt-1">Your vote is recorded. Tap another option to switch.</p>
          )}
        </div>
      )}

      {isAdmin && event.status === 'voting' && (
        <div>
          {!addingOption ? (
            <button onClick={() => setAddingOption(true)} className="flex items-center gap-1.5 text-xs font-medium text-[#9E9E9E] hover:text-black transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add voting option
            </button>
          ) : (
            <form onSubmit={handleAddOption} className="space-y-2 p-3 bg-[#F9F9F9] rounded-2xl border border-[#EEEEEE]">
              <p className="text-[10px] uppercase tracking-wider text-[#9E9E9E] font-bold">New option</p>
              <input required type="text" placeholder="Book title" value={optTitle} onChange={(e) => setOptTitle(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#EEEEEE] rounded-xl text-sm focus:outline-none focus:border-black transition-colors" />
              <input required type="text" placeholder="Author" value={optAuthor} onChange={(e) => setOptAuthor(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#EEEEEE] rounded-xl text-sm focus:outline-none focus:border-black transition-colors" />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-2 bg-black text-white rounded-xl text-xs font-semibold hover:bg-[#333] transition-colors">Add</button>
                <button type="button" onClick={() => setAddingOption(false)} className="px-4 py-2 bg-[#EBEBEB] text-[#666] rounded-xl text-xs font-semibold">Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}

      {isAdmin && (
        <div className="pt-2 border-t border-[#F0F0F0] flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-wider text-amber-600 font-bold flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Admin
          </p>
          <button onClick={onDelete} className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> Delete event
          </button>
        </div>
      )}
    </>
  );
}

function CreateEventModal({ uniId, adminPin, onClose, onCreated }: { uniId: UniId; adminPin: string; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [status, setStatus] = useState<EventStatus>('upcoming');
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createEvent(adminPin, {
        title, description, date, status, uniId,
        bookTitle: status !== 'voting' ? bookTitle : undefined,
        bookAuthor: status !== 'voting' ? bookAuthor : undefined,
        votingOptions: status === 'voting' ? [] : undefined,
      });
      onCreated(); onClose();
    } catch { alert('Failed to create event.'); }
    finally { setSubmitting(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">New Book Event</h3>
        <button type="button" onClick={onClose} className="p-2 hover:bg-[#F5F5F5] rounded-full transition-colors"><X className="w-4 h-4" /></button>
      </div>
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-wider text-[#9E9E9E] font-bold">Event Title</label>
        <input required type="text" placeholder="e.g. May Reading Circle" value={title} onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-3 bg-[#F9F9F9] border border-[#EEEEEE] rounded-xl text-sm focus:outline-none focus:border-black transition-colors" />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-wider text-[#9E9E9E] font-bold">Description</label>
        <textarea placeholder="What's this event about?" value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
          className="w-full px-4 py-3 bg-[#F9F9F9] border border-[#EEEEEE] rounded-xl text-sm focus:outline-none focus:border-black transition-colors resize-none" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-[#9E9E9E] font-bold">Date</label>
          <input required type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-3 bg-[#F9F9F9] border border-[#EEEEEE] rounded-xl text-sm focus:outline-none focus:border-black transition-colors" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-[#9E9E9E] font-bold">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as EventStatus)}
            className="w-full px-4 py-3 bg-[#F9F9F9] border border-[#EEEEEE] rounded-xl text-sm focus:outline-none focus:border-black transition-colors">
            <option value="voting">Open for Voting</option>
            <option value="upcoming">Upcoming</option>
            <option value="active">Reading Now</option>
            <option value="past">Past</option>
          </select>
        </div>
      </div>
      {status !== 'voting' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-[#9E9E9E] font-bold">Book Title</label>
            <input type="text" placeholder="e.g. Educated" value={bookTitle} onChange={(e) => setBookTitle(e.target.value)}
              className="w-full px-4 py-3 bg-[#F9F9F9] border border-[#EEEEEE] rounded-xl text-sm focus:outline-none focus:border-black transition-colors" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-[#9E9E9E] font-bold">Author</label>
            <input type="text" placeholder="e.g. Tara Westover" value={bookAuthor} onChange={(e) => setBookAuthor(e.target.value)}
              className="w-full px-4 py-3 bg-[#F9F9F9] border border-[#EEEEEE] rounded-xl text-sm focus:outline-none focus:border-black transition-colors" />
          </div>
        </div>
      )}
      {status === 'voting' && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl p-3">
          You can add book options after creating the event by clicking into it.
        </p>
      )}
      <button type="submit" disabled={submitting}
        className="w-full py-3 bg-black text-white rounded-xl text-sm font-semibold hover:bg-[#333] transition-colors disabled:opacity-50">
        {submitting ? 'Creating…' : 'Create Event'}
      </button>
    </form>
  );
}

function EventCard({ event, onClick }: { event: BookEvent; onClick: () => void }) {
  const totalVotes = (event.votingOptions ?? []).reduce((s, o) => s + o.votes, 0);
  return (
    <motion.button layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      onClick={onClick}
      className="group w-full text-left bg-white p-6 rounded-3xl border border-[#E5E5E5] hover:border-black transition-all duration-300"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${STATUS_COLORS[event.status]}`}>
              {STATUS_LABELS[event.status]}
            </span>
          </div>
          <h3 className="font-semibold text-base leading-tight mb-1 truncate">{event.title}</h3>
          {event.bookTitle ? (
            <p className="text-[#666] text-sm truncate">{event.bookTitle} · <span className="text-[#9E9E9E]">{event.bookAuthor}</span></p>
          ) : event.status === 'voting' ? (
            <p className="text-amber-600 text-sm font-medium">{totalVotes} vote{totalVotes !== 1 ? 's' : ''} · {(event.votingOptions ?? []).length} options</p>
          ) : null}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="hidden sm:block text-right">
            <p className="text-[10px] uppercase tracking-widest text-[#9E9E9E] font-bold">Date</p>
            <p className="text-xs font-mono text-[#666]">{event.date}</p>
          </div>
          <div className="w-8 h-8 bg-[#F5F5F5] rounded-full flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors duration-300">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </motion.button>
  );
}

export default function App() {
  const [activeUni, setActiveUni] = useState<UniId>('AITU');
  const [activeTab, setActiveTab] = useState<Tab>('events');
  const [books, setBooks] = useState<Book[]>([]);
  const [isAddingBook, setIsAddingBook] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [booksLoading, setBooksLoading] = useState(true);
  const [events, setEvents] = useState<BookEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<BookEvent | null>(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  useEffect(() => {
    setBooksLoading(true);
    const unsub = subscribeToBooks(activeUni, (b) => { setBooks(b); setBooksLoading(false); });
    return () => unsub();
  }, [activeUni]);

  useEffect(() => {
    setEventsLoading(true);
    const unsub = subscribeToEvents(activeUni, (e) => {
      setEvents(e);
      setEventsLoading(false);
      setSelectedEvent(prev => prev?.id ? (e.find(ev => ev.id === prev.id) ?? prev) : prev);
    });
    return () => unsub();
  }, [activeUni]);

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newAuthor) return;
    try {
      await addBook({ title: newTitle, author: newAuthor, uniId: activeUni });
      setNewTitle(''); setNewAuthor(''); setIsAddingBook(false);
    } catch { alert('Failed to add book. Please try again.'); }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent?.id) return;
    if (!confirm('Delete this event?')) return;
    await deleteEvent(adminPin, selectedEvent.id);
    setSelectedEvent(null);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#1A1A1A] font-sans selection:bg-black selection:text-white">
      <header className="border-b border-[#E5E5E5] bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Library className="w-5 h-5 text-black" />
            <h1 className="font-semibold text-lg tracking-tight">Serin Family</h1>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs text-[#9E9E9E] font-medium uppercase tracking-widest hidden sm:block">AMU • AITU • NU Community</p>
            {isAdmin ? (
              <button onClick={() => setIsAdmin(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-xs font-semibold hover:bg-amber-100 transition-colors">
                <ShieldCheck className="w-3.5 h-3.5" /> Admin
              </button>
            ) : (
              <button onClick={() => setShowAdminLogin(true)} className="p-2 text-[#9E9E9E] hover:text-black hover:bg-[#F5F5F5] rounded-full transition-colors" title="Admin login">
                <Lock className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex gap-1 p-1 bg-[#EBEBEB] rounded-2xl mb-8 w-fit">
          {UNIVERSITIES.map((uni) => (
            <button key={uni.id} onClick={() => setActiveUni(uni.id)}
              className={`px-6 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${activeUni === uni.id ? 'bg-white text-black shadow-sm' : 'text-[#666] hover:text-black'}`}>
              {uni.name}
            </button>
          ))}
        </div>

        <div className="flex gap-6 mb-8 border-b border-[#E5E5E5]">
          {(['events', 'books'] as Tab[]).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium capitalize transition-colors relative ${activeTab === tab ? 'text-black' : 'text-[#9E9E9E] hover:text-black'}`}>
              {tab === 'events' ? 'Book Events' : 'Reading List'}
              {activeTab === tab && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-black rounded-full" />}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'events' && (
            <motion.div key="events" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="mb-6 flex items-baseline justify-between">
                <div>
                  <h2 className="text-3xl font-light tracking-tight mb-1">{UNIVERSITIES.find((u) => u.id === activeUni)?.fullName}</h2>
                  <p className="text-[#9E9E9E] text-sm italic">Shared Reading Events</p>
                </div>
                {isAdmin && (
                  <button onClick={() => setIsCreatingEvent(true)}
                    className="group flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full text-sm font-medium hover:bg-[#333] transition-all">
                    <Plus className="w-4 h-4" /><span>New Event</span>
                  </button>
                )}
              </div>
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {eventsLoading ? (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center text-[#9E9E9E] text-sm">Loading events…</motion.div>
                  ) : events.length > 0 ? (
                    events.map((ev) => <EventCard key={ev.id} event={ev} onClick={() => setSelectedEvent(ev)} />)
                  ) : (
                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center border-2 border-dashed border-[#E5E5E5] rounded-[40px]">
                      <div className="bg-[#EBEBEB] w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"><Calendar className="w-6 h-6 text-[#9E9E9E]" /></div>
                      <h3 className="text-lg font-medium mb-1">No events yet</h3>
                      <p className="text-[#9E9E9E] text-sm">{isAdmin ? 'Create the first book event for your club.' : 'Check back soon for upcoming reading events.'}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {activeTab === 'books' && (
            <motion.div key="books" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="mb-8 flex items-baseline justify-between">
                <div>
                  <h2 className="text-3xl font-light tracking-tight mb-1">{UNIVERSITIES.find((u) => u.id === activeUni)?.fullName}</h2>
                  <p className="text-[#9E9E9E] text-sm italic">Member Reading List</p>
                </div>
                <button onClick={() => setIsAddingBook(!isAddingBook)}
                  className="group flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full text-sm font-medium hover:bg-[#333] transition-all">
                  <Plus className={`w-4 h-4 transition-transform duration-300 ${isAddingBook ? 'rotate-45' : ''}`} />
                  <span>{isAddingBook ? 'Cancel' : 'Add Book'}</span>
                </button>
              </div>
              <AnimatePresence>
                {isAddingBook && (
                  <motion.div initial={{ height: 0, opacity: 0, marginBottom: 0 }} animate={{ height: 'auto', opacity: 1, marginBottom: 32 }} exit={{ height: 0, opacity: 0, marginBottom: 0 }} className="overflow-hidden">
                    <form onSubmit={handleAddBook} className="bg-white p-6 rounded-3xl border border-[#E5E5E5] space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-wider text-[#9E9E9E] font-bold">Book Title</label>
                          <input required type="text" placeholder="e.g. The Great Gatsby" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                            className="w-full px-4 py-3 bg-[#F9F9F9] border border-[#EEEEEE] rounded-xl text-sm focus:outline-none focus:border-black transition-colors" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-wider text-[#9E9E9E] font-bold">Author</label>
                          <input required type="text" placeholder="e.g. F. Scott Fitzgerald" value={newAuthor} onChange={(e) => setNewAuthor(e.target.value)}
                            className="w-full px-4 py-3 bg-[#F9F9F9] border border-[#EEEEEE] rounded-xl text-sm focus:outline-none focus:border-black transition-colors" />
                        </div>
                      </div>
                      <button type="submit" className="w-full py-3 bg-black text-white rounded-xl text-sm font-semibold hover:bg-[#333] transition-colors">Submit to Collection</button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {booksLoading ? (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center text-[#9E9E9E] text-sm">Loading collection…</motion.div>
                  ) : books.length > 0 ? (
                    books.map((book, idx) => (
                      <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: idx * 0.05 }} key={book.id}
                        className="group bg-white p-6 rounded-3xl border border-[#E5E5E5] hover:border-black transition-all duration-300 flex items-center justify-between">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 bg-[#F5F5F5] rounded-2xl flex items-center justify-center text-[#9E9E9E] group-hover:bg-black group-hover:text-white transition-colors duration-300">
                            <BookIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg leading-tight mb-0.5">{book.title}</h3>
                            <p className="text-[#666] text-sm">{book.author}</p>
                          </div>
                        </div>
                        <div className="hidden sm:block text-right">
                          <p className="text-[10px] uppercase tracking-widest text-[#9E9E9E] font-bold">Added</p>
                          <p className="text-xs font-mono text-[#666]">{book.createdAt?.toDate?.()?.toLocaleDateString() || 'Just now'}</p>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center border-2 border-dashed border-[#E5E5E5] rounded-[40px]">
                      <div className="bg-[#EBEBEB] w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"><GraduationCap className="w-6 h-6 text-[#9E9E9E]" /></div>
                      <h3 className="text-lg font-medium mb-1">No books yet</h3>
                      <p className="text-[#9E9E9E] text-sm">Be the first to share a recommendation.</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-20 border-t border-[#E5E5E5] py-12 text-center">
        <div className="flex justify-center gap-6 mb-4">
          <span className="text-[10px] uppercase tracking-widest text-[#9E9E9E] font-bold">Serin Family Union</span>
          <span className="text-[10px] uppercase tracking-widest text-[#9E9E9E] font-bold">Minimalist</span>
          <span className="text-[10px] uppercase tracking-widest text-[#9E9E9E] font-bold">Public List</span>
        </div>
        <p className="text-xs text-[#9E9E9E]">© 2026 Serin Family. AMU, AITU, and NU Book Clubs.</p>
      </footer>

      <Modal open={showAdminLogin} onClose={() => setShowAdminLogin(false)}>
        <AdminLogin onSuccess={(pin) => { setAdminPin(pin); setIsAdmin(true); setShowAdminLogin(false); }} />
      </Modal>
      <Modal open={isCreatingEvent} onClose={() => setIsCreatingEvent(false)}>
        <CreateEventModal uniId={activeUni} adminPin={adminPin} onClose={() => setIsCreatingEvent(false)} onCreated={() => {}} />
      </Modal>
      <Modal open={!!selectedEvent} onClose={() => setSelectedEvent(null)}>
        {selectedEvent && (
          <EventDetailModal event={selectedEvent} isAdmin={isAdmin} onClose={() => setSelectedEvent(null)} onUpdate={() => {}} onDelete={handleDeleteEvent} />
        )}
      </Modal>
    </div>
  );
}
