import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { RightPanel } from './RightPanel';

interface AppLayoutProps {
    children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    const location = useLocation();
    const isDrafting = location.pathname.includes('/draft');

    return (
        <div className="flex h-screen w-full bg-primary text-primary transition-colors duration-300">
            {/* Left Sidebar */}
            <Sidebar />

            {/* Main Content */}
            <main className={`flex-1 overflow-y-auto relative ${isDrafting ? 'p-0' : 'p-8'}`}>
                <div className={isDrafting ? 'h-full' : 'max-w-4xl mx-auto h-full'}>
                    {children}
                </div>
            </main>

            {/* Right Sidebar (Interrogator) - hide on drafting since it has its own right panel */}
            {!isDrafting && <RightPanel />}
        </div>
    );
}
