import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Book as BookIcon, Plus, GraduationCap, Github, Library } from 'lucide-react';
import { addBook, subscribeToBooks, type Book } from './services/bookService';

const UNIVERSITIES = [
  { id: 'AMU', name: 'AMU', fullName: 'Astana Medical University' },
  { id: 'AITU', name: 'AITU', fullName: 'Astana IT University' },
  { id: 'NU', name: 'NU', fullName: 'Nazarbayev University' }
] as const;

type UniId = typeof UNIVERSITIES[number]['id'];

export default function App() {
  const [activeUni, setActiveUni] = useState<UniId>('AITU');
  const [books, setBooks] = useState<Book[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToBooks(activeUni, (fetchedBooks) => {
      setBooks(fetchedBooks);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [activeUni]);

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newAuthor) return;

    try {
      await addBook({
        title: newTitle,
        author: newAuthor,
        uniId: activeUni,
      });
      setNewTitle('');
      setNewAuthor('');
      setIsAdding(false);
    } catch (error) {
      alert('Failed to add book. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#1A1A1A] font-sans selection:bg-black selection:text-white">
      {/* Header */}
      <header className="border-b border-[#E5E5E5] bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Library className="w-5 h-5 text-black" />
            <h1 className="font-semibold text-lg tracking-tight">Serin Family</h1>
          </div>
          <p className="text-xs text-[#9E9E9E] font-medium uppercase tracking-widest hidden sm:block">
            AMU • AITU • NU Community
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Uni Selector */}
        <div className="flex gap-1 p-1 bg-[#EBEBEB] rounded-2xl mb-12 w-fit">
          {UNIVERSITIES.map((uni) => (
            <button
              key={uni.id}
              onClick={() => setActiveUni(uni.id)}
              className={`px-6 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeUni === uni.id 
                  ? 'bg-white text-black shadow-sm' 
                  : 'text-[#666] hover:text-black'
              }`}
            >
              {uni.name}
            </button>
          ))}
        </div>

        {/* Section Title */}
        <div className="mb-8 flex items-baseline justify-between">
          <div>
            <h2 className="text-3xl font-light tracking-tight mb-1">
              {UNIVERSITIES.find(u => u.id === activeUni)?.fullName}
            </h2>
            <p className="text-[#9E9E9E] text-sm italic">Member Reading List</p>
          </div>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="group flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full text-sm font-medium hover:bg-[#333] transition-all"
          >
            <Plus className={`w-4 h-4 transition-transform duration-300 ${isAdding ? 'rotate-45' : ''}`} />
            <span>{isAdding ? 'Cancel' : 'Add Book'}</span>
          </button>
        </div>

        {/* Add Form */}
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginBottom: 0 }}
              animate={{ height: 'auto', opacity: 1, marginBottom: 32 }}
              exit={{ height: 0, opacity: 0, marginBottom: 0 }}
              className="overflow-hidden"
            >
              <form onSubmit={handleAddBook} className="bg-white p-6 rounded-3xl border border-[#E5E5E5] space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-[#9E9E9E] font-bold">Book Title</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. The Great Gatsby"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full px-4 py-3 bg-[#F9F9F9] border border-[#EEEEEE] rounded-xl text-sm focus:outline-none focus:border-black transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-[#9E9E9E] font-bold">Author</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. F. Scott Fitzgerald"
                      value={newAuthor}
                      onChange={(e) => setNewAuthor(e.target.value)}
                      className="w-full px-4 py-3 bg-[#F9F9F9] border border-[#EEEEEE] rounded-xl text-sm focus:outline-none focus:border-black transition-colors"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-black text-white rounded-xl text-sm font-semibold hover:bg-[#333] transition-colors"
                >
                  Submit to Collection
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Book List */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {isLoading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                key="loading"
                className="py-12 text-center text-[#9E9E9E] text-sm"
              >
                Loading collection...
              </motion.div>
            ) : books.length > 0 ? (
              books.map((book, idx) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                  key={book.id}
                  className="group bg-white p-6 rounded-3xl border border-[#E5E5E5] hover:border-black transition-all duration-300 flex items-center justify-between"
                >
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
                    <p className="text-xs font-mono text-[#666]">
                      {book.createdAt?.toDate()?.toLocaleDateString() || 'Just now'}
                    </p>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                key="empty"
                className="py-20 text-center border-2 border-dashed border-[#E5E5E5] rounded-[40px]"
              >
                <div className="bg-[#EBEBEB] w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                  <GraduationCap className="w-6 h-6 text-[#9E9E9E]" />
                </div>
                <h3 className="text-lg font-medium mb-1">No books yet</h3>
                <p className="text-[#9E9E9E] text-sm">Be the first to share a recommendation.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-[#E5E5E5] py-12 text-center">
        <div className="flex justify-center gap-6 mb-4">
          <span className="text-[10px] uppercase tracking-widest text-[#9E9E9E] font-bold">Serin Family Union</span>
          <span className="text-[10px] uppercase tracking-widest text-[#9E9E9E] font-bold">Minimalist</span>
          <span className="text-[10px] uppercase tracking-widest text-[#9E9E9E] font-bold">Public List</span>
        </div>
        <p className="text-xs text-[#9E9E9E]">© 2026 Serin Family. AMU, AITU, and NU Book Clubs.</p>
      </footer>
    </div>
  );
}
