import { Editor } from '@tiptap/react';
import { useCallback } from 'react';
import { notifications } from '@mantine/notifications';

export interface AILiveEditOptions {
    editor: Editor | null;
}

export function useAILiveEdit({ editor }: AILiveEditOptions) {
    
    const insertAtCursor = useCallback((content: string) => {
        if (!editor) {
            notifications.show({
                title: 'Error',
                message: 'Editor not available',
                color: 'red',
            });
            return false;
        }

        try {
            // Insert content at current cursor position
            editor.chain().focus().insertContent(content).run();
            
            notifications.show({
                title: 'Success',
                message: 'Content inserted at cursor',
                color: 'green',
            });
            
            return true;
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'Failed to insert content',
                color: 'red',
            });
            return false;
        }
    }, [editor]);

    const replaceSelection = useCallback((content: string) => {
        if (!editor) {
            notifications.show({
                title: 'Error',
                message: 'Editor not available',
                color: 'red',
            });
            return false;
        }

        try {
            const { from, to } = editor.state.selection;
            
            if (from === to) {
                // No selection, just insert
                return insertAtCursor(content);
            }

            // Replace selected content
            editor.chain()
                .focus()
                .deleteRange({ from, to })
                .insertContent(content)
                .run();
            
            notifications.show({
                title: 'Success',
                message: 'Selection replaced',
                color: 'green',
            });
            
            return true;
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'Failed to replace selection',
                color: 'red',
            });
            return false;
        }
    }, [editor, insertAtCursor]);

    const appendToDocument = useCallback((content: string) => {
        if (!editor) {
            notifications.show({
                title: 'Error',
                message: 'Editor not available',
                color: 'red',
            });
            return false;
        }

        try {
            // Move to end of document and insert
            const endPos = editor.state.doc.content.size;
            editor.chain()
                .focus()
                .setTextSelection(endPos)
                .insertContent('\n' + content)
                .run();
            
            notifications.show({
                title: 'Success',
                message: 'Content appended to document',
                color: 'green',
            });
            
            return true;
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'Failed to append content',
                color: 'red',
            });
            return false;
        }
    }, [editor]);

    const copyToClipboard = useCallback((content: string) => {
        try {
            navigator.clipboard.writeText(content);
            notifications.show({
                title: 'Success',
                message: 'Copied to clipboard',
                color: 'green',
            });
            return true;
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'Failed to copy to clipboard',
                color: 'red',
            });
            return false;
        }
    }, []);

    return {
        insertAtCursor,
        replaceSelection,
        appendToDocument,
        copyToClipboard,
    };
}
