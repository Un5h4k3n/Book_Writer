import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useProjectStore } from '../../stores/projectStore';
import { MessageSquare, Send, X } from 'lucide-react';
import { InterrogatorService } from '../../services/ai/interrogator';

interface Message {
    role: 'user' | 'system';
    text: string;
}

export function RightPanel() {
    const { pathname } = useLocation();
    const { chapters } = useProjectStore();

    // Identify context based on URL
    // /draft/:sceneId -> Find chapter containing this scene
    // /outline -> Maybe context is full book? default to first chapter?
    // For MVP, only active in Draft mode.

    const isDrafting = pathname.includes('/draft/');
    const sceneId = pathname.split('/').pop();

    const activeChapter = chapters.find(c => c.scenes.some(s => s.id === sceneId));

    const [isOpen, setIsOpen] = useState(true);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    if (!isOpen) {
        return (
            <div className="w-12 border-l border-border-color bg-bg-secondary flex flex-col items-center py-4">
                <button onClick={() => setIsOpen(true)} className="p-2 hover:bg-bg-tertiary rounded-full text-accent-color">
                    <MessageSquare size={20} />
                </button>
            </div>
        );
    }

    if (!isDrafting || !activeChapter) {
        return (
            <div className="w-80 border-l border-border-color bg-bg-secondary flex flex-col p-4 animate-slide-in-right">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold font-serif">Interrogator</h3>
                    <button onClick={() => setIsOpen(false)}><X size={16} /></button>
                </div>
                <p className="text-sm text-text-muted mt-10 text-center">
                    Open a Scene in Drafting mode to chat with your documents.
                </p>
            </div>
        );
    }

    const handleSend = async () => {
        if (!input.trim() || !activeChapter) return;
        const userMsg = input;
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInput('');
        setLoading(true);

        try {
            const response = await InterrogatorService.askAboutChapter(userMsg, activeChapter);
            setMessages(prev => [...prev, { role: 'system', text: response }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'system', text: "Error: Couldn't analyze chapter." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-80 border-l border-border-color bg-bg-secondary flex flex-col animate-slide-in-right h-full">
            <div className="p-4 border-b border-border-color flex justify-between items-center bg-bg-secondary sticky top-0">
                <div>
                    <h3 className="font-bold font-serif text-accent-color">Chapter Assistant</h3>
                    <p className="text-[10px] uppercase tracking-wider text-text-muted">Chat with Ch {activeChapter.order}</p>
                </div>
                <button onClick={() => setIsOpen(false)} className="hover:text-red-500"><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-bg-primary/50" ref={scrollRef}>
                {messages.length === 0 && (
                    <p className="text-xs text-text-muted text-center mt-10">
                        Ask about plot holes, continuity, or tone in this chapter.
                    </p>
                )}
                {messages.map((m, i) => (
                    <div key={i} className={`p-3 rounded-lg text-sm ${m.role === 'user' ? 'bg-accent-color text-white ml-4' : 'bg-bg-secondary border border-border-color mr-4'}`}>
                        {m.text}
                    </div>
                ))}
                {loading && <div className="text-xs text-text-muted animate-pulse">Analyzing text...</div>}
            </div>

            <div className="p-3 border-t border-border-color bg-bg-secondary">
                <div className="flex gap-2">
                    <input
                        className="flex-1 bg-bg-primary border border-border-color rounded px-2 py-1 text-sm focus:border-accent-color outline-none"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask a question..."
                    />
                    <button onClick={handleSend} disabled={loading} className="text-accent-color hover:bg-bg-tertiary p-2 rounded">
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
