import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../../stores/projectStore';
import { Plus, Book, Trash2, Calendar, Edit3 } from 'lucide-react';

export default function LibraryPage() {
    const navigate = useNavigate();
    const { projects, createNewProject, loadProject, deleteProject } = useProjectStore();
    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newGenre, setNewGenre] = useState('');

    // init() is now handled globally in App.tsx

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle) return;

        await createNewProject(newTitle, newGenre || 'General Fiction');
        // Auto navigate
        navigate('/outline');
    };

    const handleOpen = async (id: string) => {
        await loadProject(id);
        navigate('/outline');
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this book? This cannot be undone.')) {
            await deleteProject(id);
        }
    };

    const formatDate = (ts: number) => {
        return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(ts));
    };

    return (
        <div className="animate-fade-in space-y-8 max-w-5xl mx-auto p-8">
            <header className="flex justify-between items-center border-b border-border-color pb-6">
                <div>
                    <h1 className="text-4xl font-serif font-bold text-accent-color">Library</h1>
                    <p className="text-text-secondary mt-1">Manage your collection of novels.</p>
                </div>
            </header>

            {isCreating ? (
                <div className="bg-bg-secondary p-8 rounded-xl border border-border-color max-w-xl mx-auto shadow-lg animate-in fade-in slide-in-from-bottom-4">
                    <h2 className="text-2xl font-bold mb-6">Start a New Book</h2>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold mb-2">Title</label>
                            <input
                                autoFocus
                                value={newTitle}
                                onChange={e => setNewTitle(e.target.value)}
                                className="w-full px-4 py-3 text-lg bg-bg-primary border border-border-color rounded-lg focus:ring-2 ring-accent-color outline-none"
                                placeholder="The Great Novel"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2">Genre</label>
                            <input
                                value={newGenre}
                                onChange={e => setNewGenre(e.target.value)}
                                className="w-full px-4 py-3 bg-bg-primary border border-border-color rounded-lg focus:ring-2 ring-accent-color outline-none"
                                placeholder="e.g. Sci-Fi, Romance, Thriller"
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => setIsCreating(false)}
                                className="px-6 py-2 rounded-lg hover:bg-bg-tertiary"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!newTitle}
                                className="px-8 py-2 bg-accent-color text-white rounded-lg font-bold hover:bg-accent-hover disabled:opacity-50"
                            >
                                Create Book
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Create New Card */}
                    <button
                        onClick={() => setIsCreating(true)}
                        className="group flex flex-col items-center justify-center min-h-[240px] border-2 border-dashed border-border-color rounded-xl hover:border-accent-color hover:bg-bg-secondary/50 transition-all"
                    >
                        <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Plus size={32} className="text-accent-color" />
                        </div>
                        <span className="font-bold text-lg text-text-muted group-hover:text-accent-color">New Book</span>
                    </button>

                    {/* Book Cards */}
                    {projects.map(project => (
                        <div
                            key={project.id}
                            onClick={() => handleOpen(project.id)}
                            className="bg-bg-secondary border border-border-color rounded-xl p-6 relative group hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer flex flex-col"
                        >
                            <div className="flex-1">
                                <span className="text-xs font-bold uppercase tracking-wider text-accent-color block mb-2">{project.genre}</span>
                                <h3 className="text-2xl font-serif font-bold leading-tight mb-2 line-clamp-2" title={project.title}>{project.title}</h3>
                                <div className="text-sm text-text-muted flex items-center gap-2">
                                    <Calendar size={14} />
                                    <span>Updated {formatDate(project.updated_at)}</span>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-border-color flex justify-between items-center opacity-60 group-hover:opacity-100 transition-opacity">
                                <span className="text-xs text-text-muted">{project.author}</span>
                                <button
                                    onClick={(e) => handleDelete(e, project.id)}
                                    className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-full transition-colors"
                                    title="Delete Book"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
