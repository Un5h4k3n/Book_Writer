import { useState } from "react";
import { useProjectStore } from "../stores/projectStore";
import { OutlineQA, type Citation } from "../services/ai/outlineQA";
import {
  MessageCircle,
  Send,
  Loader,
  MapPin,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface QAHistory {
  question: string;
  answer: string;
  citations: Citation[];
}

export default function OutlineQAPanel() {
  const { chapters, characters, worldItems } = useProjectStore();
  const [expanded, setExpanded] = useState(false);
  const [question, setQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [history, setHistory] = useState<QAHistory[]>([]);

  const handleAsk = async () => {
    if (!question.trim() || isAsking) return;

    setIsAsking(true);
    const q = question;
    setQuestion("");

    try {
      const response = await OutlineQA.askQuestion(
        q,
        chapters,
        characters,
        worldItems,
      );
      setHistory((prev) => [...prev, { question: q, ...response }]);
    } catch (e) {
      console.error("Q&A error:", e);
      setHistory((prev) => [
        ...prev,
        {
          question: q,
          answer: "Error processing question",
          citations: [],
        },
      ]);
    }

    setIsAsking(false);
  };

  const scrollToElement = (type: string, id: string) => {
    // Try to find element by ID
    const el = document.getElementById(`${type}-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Add highlight effect
      el.classList.add("ring-2", "ring-accent-color", "ring-offset-2");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-accent-color", "ring-offset-2");
      }, 2000);
    }
  };

  const citationTypeColors: Record<string, string> = {
    chapter: "bg-blue-500/20 text-blue-400",
    scene: "bg-green-500/20 text-green-400",
    character: "bg-purple-500/20 text-purple-400",
    world: "bg-orange-500/20 text-orange-400",
  };

  return (
    <div className="bg-bg-secondary border border-border-color rounded-lg overflow-hidden mb-4">
      {/* Header */}
      <div
        className="flex justify-between items-center p-3 cursor-pointer hover:bg-bg-tertiary"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <MessageCircle size={18} className="text-cyan-400" />
          <span className="font-bold">Ask About Outline</span>
          {history.length > 0 && (
            <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full">
              {history.length} Q&A
            </span>
          )}
        </div>
      </div>

      {expanded && (
        <div className="p-4 pt-0 border-t border-border-color">
          {/* Input */}
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              placeholder="Ask a question about your outline..."
              className="flex-1 bg-bg-primary border border-border-color rounded-lg px-4 py-2 text-sm focus:border-accent-color focus:outline-none"
            />
            <button
              onClick={handleAsk}
              disabled={isAsking || !question.trim()}
              className="bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 disabled:opacity-50"
            >
              {isAsking ? (
                <Loader className="animate-spin" size={18} />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="mt-4 space-y-4 max-h-96 overflow-y-auto">
              {history.map((item, i) => (
                <div key={i} className="bg-bg-primary rounded-lg p-4">
                  <div className="text-sm text-cyan-400 font-bold mb-2">
                    Q: {item.question}
                  </div>
                  <div className="text-sm mb-3 text-text-primary">
                    {item.answer}
                  </div>

                  {/* Citations */}
                  {item.citations.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {item.citations.map((citation, j) => (
                        <button
                          key={j}
                          onClick={() =>
                            scrollToElement(citation.type, citation.id)
                          }
                          className={`text-xs px-2 py-1 rounded flex items-center gap-1 hover:opacity-80 ${citationTypeColors[citation.type] || "bg-bg-tertiary"}`}
                          title={citation.excerpt}
                        >
                          <MapPin size={12} />
                          {citation.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {history.length === 0 && (
            <div className="text-center text-text-muted text-sm mt-4 py-4">
              <MessageCircle size={24} className="mx-auto mb-2 opacity-50" />
              Ask questions like "Who is the antagonist?" or "What happens in
              Chapter 3?"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
