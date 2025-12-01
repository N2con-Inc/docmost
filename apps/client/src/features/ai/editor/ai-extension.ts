import { Extension } from '@tiptap/core';

export interface AIExtensionOptions {
    onAskAI: (text: string) => void;
}

export const AIExtension = Extension.create<AIExtensionOptions>({
    name: 'ai',

    addOptions() {
        return {
            onAskAI: () => { },
        };
    },

    addCommands() {
        return {
            askAI:
                (text: string) =>
                    ({ editor }) => {
                        this.options.onAskAI(text);
                        return true;
                    },
        };
    },
});
