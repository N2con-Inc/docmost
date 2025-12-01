import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AIContextType {
    isChatOpen: boolean;
    toggleChat: () => void;
    setChatOpen: (open: boolean) => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export function AIProvider({ children }: { children: ReactNode }) {
    const [isChatOpen, setIsChatOpen] = useState(false);

    const toggleChat = () => setIsChatOpen((prev) => !prev);
    const setChatOpen = (open: boolean) => setIsChatOpen(open);

    return (
        <AIContext.Provider value={{ isChatOpen, toggleChat, setChatOpen }}>
            {children}
        </AIContext.Provider>
    );
}

export function useAIContext() {
    const context = useContext(AIContext);
    if (context === undefined) {
        throw new Error('useAIContext must be used within an AIProvider');
    }
    return context;
}
