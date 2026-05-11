import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Library, Calendar, ChevronRight, X,
  Trash2, BookOpen, ShieldCheck, LogOut,
} from 'lucide-react';
import {
  subscribeToEvents, createEvent, deleteEvent,
  addVotingOption, removeVotingOption,
  type BookEvent, type EventStatus,
} from './services/eventService';

const UNIVERSITIES = [
  { id: 'AMU', name: 'AMU', fullName: 'Astana Medical University' },
  { id: 'AITU', name: 'AITU', fullName: 'Astana IT University' },
  { id: 'NU', name: 'NU', fullName: 'Nazarbayev University' },
] as const;

type UniId = (typeof UNIVERSITIES)[number]['id'];

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

const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || 'serin2024';

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={onClose}>
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="bg-white rounded-3xl border border-[#E5E5E5] w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      onLogin();
    } else {
      setError(true);
      setPin('');
      setTimeout(() => setError(false), 1500);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-[#E5E5E5] p-10 w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-semibold text-xl">Serin Admin</h1>
          <p className="text-[#9E9E9E] text-sm mt-1">This page is private. Enter your PIN.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input ref={ref} type="password" placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value)}
            className={`w-full px-4 py-3 bg-[#F9F9F9] border rounded-xl text-sm text-center tracking-widest focus:outline-none transition-colors ${
              error ? 'border-red-400 bg-red-50' : 'border-[#EEEEEE] focus:border-black'
            }`} />
          {error && <p className="text-red-500 text-xs text-center">Incorrect PIN.</p>}
          <button type="submit" className="w-full py-3 bg-black text-white rounded-xl text-sm font-semibold hover:bg-[#333] transition-colors">
            Enter
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function CreateEventModal({ uniId, onClose }: { uniId: UniId; onClose: () => void }) {
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
      await createEvent({
        title, description, date, status, uniId,
        bookTitle: status !== 'voting' ? bookTitle : undefined,
        bookAuthor: status !== 'voting' ? bookAuthor : undefined,
        votingOptions: status === 'voting' ? [] : undefined,
      });
      onClose();
    } catch (err) {
      alert('Failed to create event: ' + err);
    } finally { setSubmitting(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">New Book Event</h3>
        <button type="button" onClick={onClose} className="p-2 hover:bg-[#F5F5F5] rounded-full"><X className="w-4 h-4" /></button>
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
          Add voting options after creating the event by clicking into it.
        </p>
      )}
      <button type="submit" disabled={submitting}
        className="w-full py-3 bg-black text-white rounded-xl text-sm font-semibold hover:bg-[#333] transition-colors disabled:opacity-50">
        {submitting ? 'Creating…' : 'Create Event'}
      </button>
    </form>
  );
}

function EventDetailModal({ event, onClose, onDelete }: { event: BookEvent; onClose: () => void; onDelete: () => void }) {
  const [addingOption, setAddingOption] = useState(false);
  const [optTitle, setOptTitle] = useState('');
  const [optAuthor, setOptAuthor] = useState('');

  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event.id || !optTitle || !optAuthor) return;
    try {
      await addVotingOption(event.id, optTitle, optAuthor);
      setOptTitle(''); setOptAuthor(''); setAddingOption(false);
    } catch { alert('Failed to add option.'); }
  };

  const totalVotes = (event.votingOptions ?? []).reduce((s, o) => s + o.votes, 0);

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
        <button onClick={onClose} className="p-2 hover:bg-[#F5F5F5] rounded-full"><X className="w-4 h-4" /></button>
      </div>

      {event.description && <p className="text-[#666] text-sm leading-relaxed">{event.description}</p>}

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

      {event.status === 'voting' && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-[#9E9E9E] font-bold">
            Voting options · {totalVotes} total vote{totalVotes !== 1 ? 's' : ''}
          </p>
          {(event.votingOptions ?? []).length === 0 && (
            <p className="text-sm text-[#9E9E9E] italic">No options yet. Add some below.</p>
          )}
          {(event.votingOptions ?? []).map((opt) => (
            <div key={opt.id} className="flex items-center justify-between p-3 bg-[#F9F9F9] border border-[#EEEEEE] rounded-2xl">
              <div>
                <p className="font-medium text-sm">{opt.title}</p>
                <p className="text-[#9E9E9E] text-xs">{opt.author} · {opt.votes} vote{opt.votes !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => event.id && removeVotingOption(event.id, opt.id)}
                className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          {!addingOption ? (
            <button onClick={() => setAddingOption(true)} className="flex items-center gap-1.5 text-xs font-medium text-[#9E9E9E] hover:text-black transition-colors mt-1">
              <Plus className="w-3.5 h-3.5" /> Add option
            </button>
          ) : (
            <form onSubmit={handleAddOption} className="space-y-2 p-3 bg-white border border-[#EEEEEE] rounded-2xl">
              <input required type="text" placeholder="Book title" value={optTitle} onChange={(e) => setOptTitle(e.target.value)}
                className="w-full px-3 py-2 bg-[#F9F9F9] border border-[#EEEEEE] rounded-xl text-sm focus:outline-none focus:border-black transition-colors" />
              <input required type="text" placeholder="Author" value={optAuthor} onChange={(e) => setOptAuthor(e.target.value)}
                className="w-full px-3 py-2 bg-[#F9F9F9] border border-[#EEEEEE] rounded-xl text-sm focus:outline-none focus:border-black transition-colors" />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-2 bg-black text-white rounded-xl text-xs font-semibold hover:bg-[#333] transition-colors">Add</button>
                <button type="button" onClick={() => setAddingOption(false)} className="px-4 py-2 bg-[#EBEBEB] text-[#666] rounded-xl text-xs font-semibold">Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="pt-2 border-t border-[#F0F0F0]">
        <button onClick={onDelete} className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors w-full">
          <Trash2 className="w-4 h-4" /> Delete this event
        </button>
      </div>
    </>
  );
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [activeUni, setActiveUni] = useState<UniId>('AITU');
  const [events, setEvents] = useState<BookEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<BookEvent | null>(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

  useEffect(() => {
    if (!loggedIn) return;
    setEventsLoading(true);
    const unsub = subscribeToEvents(activeUni, (e) => {
      setEvents(e);
      setEventsLoading(false);
      setSelectedEvent(prev => prev?.id ? (e.find(ev => ev.id === prev.id) ?? prev) : prev);
    });
    return () => unsub();
  }, [activeUni, loggedIn]);

  const handleDeleteEvent = async () => {
    if (!selectedEvent?.id) return;
    if (!confirm('Delete this event permanently?')) return;
    await deleteEvent(selectedEvent.id);
    setSelectedEvent(null);
  };

  if (!loggedIn) return <LoginScreen onLogin={() => setLoggedIn(true)} />;

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#1A1A1A] font-sans selection:bg-black selection:text-white">
      <header className="border-b border-[#E5E5E5] bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Library className="w-5 h-5 text-black" />
            <h1 className="font-semibold text-lg tracking-tight">Serin Admin</h1>
            <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Admin
            </span>
          </div>
          <button onClick={() => setLoggedIn(false)} className="flex items-center gap-1.5 text-xs text-[#9E9E9E] hover:text-black transition-colors">
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
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

        <div className="mb-6 flex items-baseline justify-between">
          <div>
            <h2 className="text-3xl font-light tracking-tight mb-1">{UNIVERSITIES.find((u) => u.id === activeUni)?.fullName}</h2>
            <p className="text-[#9E9E9E] text-sm italic">Manage Events</p>
          </div>
          <button onClick={() => setIsCreatingEvent(true)}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full text-sm font-medium hover:bg-[#333] transition-all">
            <Plus className="w-4 h-4" /> New Event
          </button>
        </div>

        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {eventsLoading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center text-[#9E9E9E] text-sm">Loading…</motion.div>
            ) : events.length > 0 ? (
              events.map((ev) => (
                <motion.button layout key={ev.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => setSelectedEvent(ev)}
                  className="group w-full text-left bg-white p-6 rounded-3xl border border-[#E5E5E5] hover:border-black transition-all duration-300">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border mb-2 ${STATUS_COLORS[ev.status]}`}>
                        {STATUS_LABELS[ev.status]}
                      </span>
                      <h3 className="font-semibold text-base leading-tight mb-1 truncate">{ev.title}</h3>
                      {ev.bookTitle ? (
                        <p className="text-[#666] text-sm truncate">{ev.bookTitle} · <span className="text-[#9E9E9E]">{ev.bookAuthor}</span></p>
                      ) : ev.status === 'voting' ? (
                        <p className="text-amber-600 text-sm">{(ev.votingOptions ?? []).length} options · {(ev.votingOptions ?? []).reduce((s, o) => s + o.votes, 0)} votes</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="hidden sm:block text-right">
                        <p className="text-[10px] uppercase tracking-widest text-[#9E9E9E] font-bold">Date</p>
                        <p className="text-xs font-mono text-[#666]">{ev.date}</p>
                      </div>
                      <div className="w-8 h-8 bg-[#F5F5F5] rounded-full flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors duration-300">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center border-2 border-dashed border-[#E5E5E5] rounded-[40px]">
                <div className="bg-[#EBEBEB] w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"><Calendar className="w-6 h-6 text-[#9E9E9E]" /></div>
                <h3 className="text-lg font-medium mb-1">No events yet</h3>
                <p className="text-[#9E9E9E] text-sm">Create the first event for this club.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <Modal open={isCreatingEvent} onClose={() => setIsCreatingEvent(false)}>
        <CreateEventModal uniId={activeUni} onClose={() => setIsCreatingEvent(false)} />
      </Modal>
      <Modal open={!!selectedEvent} onClose={() => setSelectedEvent(null)}>
        {selectedEvent && <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} onDelete={handleDeleteEvent} />}
      </Modal>
    </div>
  );
}
