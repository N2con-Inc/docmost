import { Editor } from '@tiptap/react';
import { useCallback, useState } from 'react';
import { notifications } from '@mantine/notifications';
import { markdownToHtml } from '@docmost/editor-ext';
import { DOMParser } from '@tiptap/pm/model';
import { Mark } from '@tiptap/pm/model';

export interface AILiveEditOptions {
    editor: Editor | null;
}

export interface PreviewState {
    isActive: boolean;
    originalContent: any;
    previewContent: string;
    range: { from: number; to: number } | null;
    mode: 'insert' | 'replace' | 'append';
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
    const [previewState, setPreviewState] = useState<PreviewState>({
        isActive: false,
        originalContent: null,
        previewContent: '',
        range: null,
        mode: 'insert',
    });

    /**
     * Preview an edit before applying it
     */
    const previewEdit = useCallback(async (
        content: string, 
        mode: 'insert' | 'replace' | 'append' = 'insert'
    ) => {
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
            let range = { from, to };

            // Store original content
            let originalContent;
            if (mode === 'replace') {
                originalContent = editor.state.doc.slice(from, to);
            } else if (mode === 'append') {
                const endPos = editor.state.doc.content.size;
                range = { from: endPos, to: endPos };
                originalContent = null;
            } else {
                originalContent = null;
            }

            // Convert Markdown to editor format
            const editorContent = await convertMarkdownForEditor(content, editor);

            // Apply temporary preview with highlight mark
            const tr = editor.state.tr;
            
            if (mode === 'replace') {
                tr.delete(from, to);
                tr.insert(from, editorContent);
                // Add preview mark
                tr.addMark(from, from + editorContent.size, editor.schema.marks.highlight.create({ color: '#d4f8d4' }));
            } else if (mode === 'insert') {
                tr.insert(from, editorContent);
                tr.addMark(from, from + editorContent.size, editor.schema.marks.highlight.create({ color: '#d4f8d4' }));
            } else if (mode === 'append') {
                const endPos = editor.state.doc.content.size;
                tr.insert(endPos, editorContent);
                tr.addMark(endPos, endPos + editorContent.size, editor.schema.marks.highlight.create({ color: '#d4f8d4' }));
            }

            editor.view.dispatch(tr);

            setPreviewState({
                isActive: true,
                originalContent,
                previewContent: content,
                range,
                mode,
            });

            notifications.show({
                title: 'Preview Active',
                message: 'Review changes and apply or discard',
                color: 'blue',
                autoClose: 3000,
            });

            return true;
        } catch (error) {
            console.error('Preview error:', error);
            notifications.show({
                title: 'Error',
                message: 'Failed to preview changes',
                color: 'red',
            });
            return false;
        }
    }, [editor]);

    /**
     * Apply the previewed edit
     */
    const applyEdit = useCallback(() => {
        if (!editor || !previewState.isActive) {
            return false;
        }

        try {
            // Remove highlight marks
            const tr = editor.state.tr;
            tr.removeMark(0, editor.state.doc.content.size, editor.schema.marks.highlight);
            editor.view.dispatch(tr);

            setPreviewState({
                isActive: false,
                originalContent: null,
                previewContent: '',
                range: null,
                mode: 'insert',
            });

            notifications.show({
                title: 'Success',
                message: 'Changes applied',
                color: 'green',
            });

            return true;
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'Failed to apply changes',
                color: 'red',
            });
            return false;
        }
    }, [editor, previewState]);

    /**
     * Revert the previewed edit
     */
    const revertEdit = useCallback(() => {
        if (!editor || !previewState.isActive) {
            return false;
        }

        try {
            // Undo the last transaction(s) to restore original state
            editor.commands.undo();

            setPreviewState({
                isActive: false,
                originalContent: null,
                previewContent: '',
                range: null,
                mode: 'insert',
            });

            notifications.show({
                title: 'Reverted',
                message: 'Changes discarded',
                color: 'gray',
            });

            return true;
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'Failed to revert changes',
                color: 'red',
            });
            return false;
        }
    }, [editor, previewState]);

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
        previewEdit,
        applyEdit,
        revertEdit,
        previewState,
    };
}
