import { Editor } from '@tiptap/react';
import { useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { markdownToHtml } from '@docmost/editor-ext';
import { DOMParser } from '@tiptap/pm/model';

export interface AILiveEditOptions {
    editor: Editor | null;
}

/**
 * Converts Markdown content to TipTap-compatible format
 */
async function convertMarkdownForEditor(markdown: string, editor: Editor): Promise<any> {
    try {
        // Convert Markdown to HTML (may be async)
        const html = await Promise.resolve(markdownToHtml(markdown));
        
        // Parse HTML into ProseMirror nodes
        const parser = DOMParser.fromSchema(editor.schema);
        const element = document.createElement('div');
        element.innerHTML = html;
        
        const doc = parser.parse(element, {
            preserveWhitespace: true,
        });
        
        return doc.content;
    } catch (error) {
        // Fallback to plain text if conversion fails
        console.warn('Markdown conversion failed, falling back to plain text:', error);
        return markdown;
    }
}

export function useAILiveEdit({ editor }: AILiveEditOptions) {
    
    const insertAtCursor = useCallback(async (content: string) => {
        if (!editor) {
            notifications.show({
                title: 'Error',
                message: 'Editor not available',
                color: 'red',
            });
            return false;
        }

        try {
            // Convert Markdown to editor format
            const editorContent = await convertMarkdownForEditor(content, editor);
            
            // Insert content at current cursor position
            editor.chain().focus().insertContent(editorContent).run();
            
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

    const replaceSelection = useCallback(async (content: string) => {
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

            // Convert Markdown to editor format
            const editorContent = await convertMarkdownForEditor(content, editor);

            // Replace selected content
            editor.chain()
                .focus()
                .deleteRange({ from, to })
                .insertContent(editorContent)
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

    const appendToDocument = useCallback(async (content: string) => {
        if (!editor) {
            notifications.show({
                title: 'Error',
                message: 'Editor not available',
                color: 'red',
            });
            return false;
        }

        try {
            // Convert Markdown to editor format
            const editorContent = await convertMarkdownForEditor(content, editor);
            
            // Move to end of document and insert
            const endPos = editor.state.doc.content.size;
            editor.chain()
                .focus()
                .setTextSelection(endPos)
                .insertContent('\n')
                .insertContent(editorContent)
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
