import { NavLink, useLocation } from 'react-router-dom';
import { BookOpen, FileText, Users, Map, Settings, Upload, Library, ChevronLeft, ChevronRight } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { useThemeStore } from '../../stores/themeStore';
import { useState } from 'react';

export function Sidebar() {
    const { project } = useProjectStore();
    const { theme, setTheme } = useThemeStore();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const navClass = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
            ? 'bg-accent-color text-white shadow-md font-bold'
            : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
        } ${isCollapsed ? 'justify-center px-2' : ''}`;

    return (
        <aside className={`h-full bg-bg-secondary border-r border-border-color flex flex-col transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
            {/* Header */}
            <div className={`p-4 border-b border-border-color flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                {/* Logo - always visible */}
                <div className="w-8 h-8 bg-accent-color rounded-lg flex items-center justify-center text-white font-bold font-serif text-xl shadow-lg flex-shrink-0">
                    A
                </div>

                {/* Title - only when expanded */}
                {!isCollapsed && (
                    <div className="flex-1 ml-3 overflow-hidden">
                        <h1 className="font-serif font-bold text-lg leading-none">Tehk</h1>
                        {project && <p className="text-xs text-text-muted truncate" title={project.title}>{project.title}</p>}
                    </div>
                )}

                {/* Collapse button */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={`p-1.5 hover:bg-bg-tertiary rounded transition-colors text-text-muted hover:text-text-primary ${isCollapsed ? 'mt-2' : 'ml-2'}`}
                    title={isCollapsed ? 'Expand menu' : 'Collapse menu'}
                >
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
            </div>

            <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
                <NavLink to="/library" className={navClass} title="Library">
                    <Library size={20} />
                    {!isCollapsed && <span>Library</span>}
                </NavLink>

                {project && (
                    <>
                        {!isCollapsed && (
                            <div className="pt-4 pb-2 px-4 text-xs font-bold text-text-muted uppercase tracking-wider">
                                Project
                            </div>
                        )}
                        <NavLink to="/outline" className={navClass} title="Outline">
                            <BookOpen size={20} />
                            {!isCollapsed && <span>Outline</span>}
                        </NavLink>
                        <NavLink to="/draft" className={navClass} title="Drafting">
                            <FileText size={20} />
                            {!isCollapsed && <span>Drafting</span>}
                        </NavLink>
                        <NavLink to="/characters" className={navClass} title="Characters">
                            <Users size={20} />
                            {!isCollapsed && <span>Characters</span>}
                        </NavLink>
                        <NavLink to="/world" className={navClass} title="World Building">
                            <Map size={20} />
                            {!isCollapsed && <span>World Building</span>}
                        </NavLink>
                        <NavLink to="/import" className={navClass} title="Import">
                            <Upload size={20} />
                            {!isCollapsed && <span>Import</span>}
                        </NavLink>
                    </>
                )}
            </nav>

            <div className="p-2 pt-4 border-t border-border-color space-y-2">
                <NavLink to="/settings" className={navClass} title="Settings">
                    <Settings size={20} />
                    {!isCollapsed && <span>Settings</span>}
                </NavLink>

                {/* Theme Switcher - only show when expanded */}
                {!isCollapsed && (
                    <div>
                        <p className="text-xs text-text-muted mb-2 uppercase font-bold tracking-wider px-2">Theme</p>
                        <div className="flex gap-2 px-2">
                            <button
                                onClick={() => setTheme('dark')}
                                className={`w-6 h-6 rounded-full bg-neutral-800 border ${theme === 'dark' ? 'border-accent-color ring-1 ring-accent-color' : 'border-gray-600'}`}
                                title="Dark Mode"
                            />
                            <button
                                onClick={() => setTheme('light')}
                                className={`w-6 h-6 rounded-full bg-white border ${theme === 'light' ? 'border-accent-color ring-1 ring-accent-color' : 'border-gray-300'}`}
                                title="Light Mode"
                            />
                            <button
                                onClick={() => setTheme('paper')}
                                className={`w-6 h-6 rounded-full bg-[#f4ecd8] border ${theme === 'paper' ? 'border-accent-color ring-1 ring-accent-color' : 'border-[#d1c4a9]'}`}
                                title="Paper Mode"
                            />
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}
