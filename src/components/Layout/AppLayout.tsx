import { type ReactNode, useState } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { RightPanel } from "./RightPanel";
import { Menu } from "lucide-react";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const isDrafting = location.pathname.includes("/draft");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-primary text-primary transition-colors duration-300 overflow-hidden">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar (Responsive) */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center p-4 border-b border-border-color bg-bg-secondary shrink-0">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 -ml-2 hover:bg-bg-tertiary rounded-md text-text-primary"
          >
            <Menu size={24} />
          </button>
          <span className="ml-2 font-serif font-bold text-lg">Tehk</span>
        </header>

        {/* Main Content Scrollable */}
        <main
          className={`flex-1 overflow-y-auto relative ${isDrafting ? "p-0" : "p-4 md:p-8"
            }`}
        >
          <div className={isDrafting ? "h-full" : "max-w-4xl mx-auto h-full"}>
            {children}
          </div>
        </main>
      </div>

      {/* Right Sidebar (Interrogator) - hidden on mobile/drafting */}
      {!isDrafting && (
        <div className="hidden lg:block h-full">
          <RightPanel />
        </div>
      )}
    </div>
  );
}
