import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../../stores/projectStore';
import { ArrowLeft, MessageSquare, Mic } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { InterviewerService } from '../../services/ai/interviewer';

interface Message {
    role: 'system' | 'user';
    text: string;
}

export default function CharacterEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { characters, updateCharacter } = useProjectStore();

    const character = characters.find(c => c.id === id);

    const [activeTab, setActiveTab] = useState<'profile' | 'interview'>('profile');
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll chat
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    if (!character) return <div className="p-8">Character not found.</div>;

    const handleStartInterview = async () => {
        setLoading(true);
        setMessages([{ role: 'system', text: 'Starting interview...' }]);
        try {
            const q = await InterviewerService.generateNextQuestion('character', character);
            setMessages([{ role: 'system', text: q }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'system', text: 'Error starting interview.' }]);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!input.trim()) return;
        const answer = input;
        setMessages(prev => [...prev, { role: 'user', text: answer }]);
        setInput('');
        setLoading(true);

        try {
            // 1. Synthesize Attribute
            const lastQ = messages[messages.length - 1]?.text || '';
            if (lastQ) {
                const attr = await InterviewerService.synthesizeAttribute(lastQ, answer);
                if (attr && attr.key) {
                    updateCharacter(character.id, {
                        attributes: { ...character.attributes, [attr.key]: attr.value }
                    });
                }
            }

            // 2. Generate Next Question
            const nextQ = await InterviewerService.generateNextQuestion('character', character, answer);
            setMessages(prev => [...prev, { role: 'system', text: nextQ }]);

        } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, { role: 'system', text: 'Sorry, I got confused. Try again?' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-border-color pb-4 mb-4">
                <button onClick={() => navigate('/characters')} className="p-2 hover:bg-bg-tertiary rounded-full">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-serif font-bold">{character.name}</h1>
                    <p className="text-xs text-text-muted uppercase tracking-wider">{character.archetype}</p>
                </div>
                <div className="flex-1" />
                <div className="flex bg-bg-secondary rounded-lg p-1 border border-border-color">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`px-4 py-1 rounded-md text-sm transition-colors ${activeTab === 'profile' ? 'bg-accent-color text-white' : 'text-text-muted hover:text-text-primary'}`}
                    >
                        Profile
                    </button>
                    <button
                        onClick={() => setActiveTab('interview')}
                        className={`px-4 py-1 rounded-md text-sm transition-colors flex items-center gap-2 ${activeTab === 'interview' ? 'bg-accent-color text-white' : 'text-text-muted hover:text-text-primary'}`}
                    >
                        <Mic size={14} /> Interview
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex gap-6">
                {/* LEFT COLUMN: Form/Attributes (Visible in both modes, but main focus in Profile) */}
                <div className={`flex flex-col gap-4 overflow-y-auto transition-all ${activeTab === 'interview' ? 'w-1/3' : 'w-full max-w-2xl mx-auto'}`}>
                    <div className="bg-bg-secondary p-6 rounded-lg border border-border-color space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-text-muted">Name</label>
                                <input
                                    className="w-full bg-bg-primary text-lg font-bold font-serif"
                                    value={character.name}
                                    onChange={(e) => updateCharacter(character.id, { name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-text-muted">Archetype</label>
                                <input
                                    className="w-full bg-bg-primary"
                                    value={character.archetype}
                                    onChange={(e) => updateCharacter(character.id, { archetype: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase text-text-muted">Short Description</label>
                            <textarea
                                className="w-full bg-bg-primary h-24 resize-none"
                                value={character.shortDescription}
                                onChange={(e) => updateCharacter(character.id, { shortDescription: e.target.value })}
                            />
                        </div>

                        <div className="border-t border-border-color pt-4">
                            <h3 className="font-bold mb-2 flex items-center justify-between">
                                <span>Known Attributes</span>
                                <span className="text-xs font-normal text-text-muted bg-bg-tertiary px-2 py-1 rounded-full">{Object.keys(character.attributes).length}</span>
                            </h3>
                            <div className="space-y-2">
                                {Object.entries(character.attributes).map(([key, val]) => (
                                    <div key={key} className="flex flex-col bg-bg-primary p-2 rounded border border-border-color">
                                        <span className="text-[10px] font-bold uppercase text-accent-color">{key.replace(/_/g, ' ')}</span>
                                        <span className="text-sm">{val}</span>
                                    </div>
                                ))}
                                {Object.keys(character.attributes).length === 0 && (
                                    <p className="text-sm text-text-muted italic">No attributes discovered yet. Start an interview!</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Interview Chat (Only visible in Interview mode) */}
                {activeTab === 'interview' && (
                    <div className="flex-1 bg-bg-secondary rounded-lg border border-border-color flex flex-col shadow-inner">
                        <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                            {messages.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-text-muted">
                                    <MessageSquare size={48} className="mb-4 opacity-50" />
                                    <p>Ready to flesh out {character.name}?</p>
                                    <button
                                        onClick={handleStartInterview}
                                        disabled={loading}
                                        className="mt-4 bg-accent-color text-white px-6 py-2 rounded-full hover:bg-accent-hover disabled:opacity-50"
                                    >
                                        {loading ? 'Thinking...' : 'Start Session'}
                                    </button>
                                </div>
                            )}
                            {messages.map((m, i) => (
                                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-3 rounded-lg ${m.role === 'user'
                                        ? 'bg-accent-color text-white rounded-br-none'
                                        : 'bg-bg-tertiary text-text-primary rounded-bl-none border border-border-color'
                                        }`}>
                                        {m.text}
                                    </div>
                                </div>
                            ))}
                            {loading && messages.length > 0 && <div className="text-xs text-text-muted animate-pulse">AI is thinking...</div>}
                        </div>

                        <div className="p-4 border-t border-border-color bg-bg-primary">
                            <div className="flex gap-2">
                                <input
                                    className="flex-1"
                                    placeholder="Type your answer..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                    disabled={loading || messages.length === 0}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={loading || messages.length === 0}
                                    className="bg-bg-tertiary p-2 rounded-md hover:bg-accent-color hover:text-white transition-colors disabled:opacity-50"
                                >
                                    <MessageSquare size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
