import { useCallback, useState, useMemo, useEffect } from 'react';
import { createEditor, Descendant, Editor, Element as SlateElement, Transforms, Range, BaseEditor } from 'slate';
import { Editable, Slate, withReact, ReactEditor } from 'slate-react';
import { withHistory, HistoryEditor } from 'slate-history';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AlignCenter, AlignLeft, AlignRight, Link, List, ListOrdered, AlignJustify, ChevronDown, Italic, Underline, Strikethrough, Heading, Bold, Code } from 'lucide-react';
import { LinkModal } from './LinkModal';
import { EmojiPicker } from './EmojiPicker';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CustomInputBoxProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    key?: string | number;
}

type ParagraphElement = { type: 'paragraph'; align?: 'left' | 'center' | 'right' | 'justify'; children: CustomText[] };
type LinkElement = { type: 'link'; url: string; children: CustomText[] };
type ListItemElement = { type: 'list-item'; children: CustomText[] };
type BulletedListElement = { type: 'bulleted-list'; children: ListItemElement[] };
type NumberedListElement = { type: 'numbered-list'; children: ListItemElement[] };
type CodeBlockElement = { type: 'code-block'; children: CodeLineElement[] };
type CodeLineElement = { type: 'code-line'; children: CustomText[] };

type HeadingElement = { type: 'heading'; align?: 'left' | 'center' | 'right' | 'justify', children: CustomText[] };

type CustomElement =
    | ParagraphElement
    | LinkElement
    | ListItemElement
    | BulletedListElement
    | NumberedListElement
    | HeadingElement
    | CodeBlockElement
    | CodeLineElement;

type FormattedText = { text: string; bold?: boolean; italic?: boolean; underline?: boolean; strikethrough?: boolean };
type CustomText = FormattedText;

declare module 'slate' {
    interface CustomTypes {
        Editor: BaseEditor & ReactEditor & HistoryEditor;
        Element: CustomElement;
        Text: CustomText;
    }
}

const initialValue: Descendant[] = [
    {
        type: 'paragraph',
        children: [{ text: '' }],
    },
];

const LIST_TYPES = ['numbered-list', 'bulleted-list'];
const TEXT_ALIGN_TYPES = ['left', 'center', 'right', 'justify'];

const withLinks = (editor: BaseEditor & ReactEditor & HistoryEditor) => {
    const { isInline, insertText } = editor;

    editor.isInline = (element) => {
        return element.type === 'link' ? true : isInline(element);
    };

    return editor;
};

const isBlockActive = (editor: Editor, type: string, textAlign?: string) => {
    const { selection } = editor;
    if (!selection) return false;

    const [match] = Editor.nodes(
        editor,
        {
            at: Editor.unhangRange(editor, selection),
            match: n =>
                !Editor.isEditor(n) &&
                SlateElement.isElement(n) &&
                n.type === type &&
                (!textAlign || (n as any).align === textAlign),
        }
    );

    return !!match;
};

const isHeadingActive = (editor: Editor) => {
     return isBlockActive(editor, 'heading');
};

const toggleBlock = (editor: Editor, type: string) => {
    const isActive = isBlockActive(editor, type);
    const isList = LIST_TYPES.includes(type);

    Transforms.unwrapNodes(editor, {
        match: n =>
            !Editor.isEditor(n) &&
            SlateElement.isElement(n) &&
            (LIST_TYPES.includes(n.type as string) || n.type === 'heading'),
        split: true,
    });

    const newProperties: Partial<SlateElement> = { type: (isActive ? 'paragraph' : isList ? 'list-item' : type) as CustomElement['type'] };
    Transforms.setNodes<SlateElement>(editor, newProperties);

    if (!isActive && isList) {
        const block: CustomElement = { type: type as 'numbered-list' | 'bulleted-list', children: [] };
        Transforms.wrapNodes(editor, block);
    }
};

const toggleHeading = (editor: Editor) => {
     const isActive = isHeadingActive(editor);

     Transforms.unwrapNodes(editor, {
         match: n =>
             !Editor.isEditor(n) &&
             SlateElement.isElement(n) &&
             LIST_TYPES.includes(n.type as string),
         split: true,
     });

     Transforms.setNodes<SlateElement>(
         editor,
         { type: isActive ? 'paragraph' : 'heading' },
         { match: n => SlateElement.isElement(n) && Editor.isBlock(editor, n) }
     );
};

const toggleMark = (editor: Editor, format: keyof FormattedText) => {
    const isActive = isMarkActive(editor, format);

    if (isActive) {
        Editor.removeMark(editor, format);
    } else {
        Editor.addMark(editor, format, true);
    }
};

const isMarkActive = (editor: Editor, format: keyof FormattedText) => {
    const marks = Editor.marks(editor);
    return marks ? (marks as any)[format] === true : false;
};

const toggleAlignment = (editor: Editor, align: 'left' | 'center' | 'right' | 'justify') => {
    const { selection } = editor;
     if (!selection) return;

    Transforms.setNodes(
        editor,
        { align: isBlockActive(editor, 'paragraph', align) ? undefined : align },
        {
            match: n => SlateElement.isElement(n) && Editor.isBlock(editor, n),
            split: true
        }
    );
};

const toggleCodeBlock = (editor: Editor) => {
    const { selection } = editor;
    if (!selection) return;

    const isActive = isBlockActive(editor, 'code-block');

    Transforms.unwrapNodes(editor, {
        match: n =>
            !Editor.isEditor(n) &&
            SlateElement.isElement(n) &&
            (LIST_TYPES.includes(n.type as string) || n.type === 'heading' || n.type === 'code-block'),
        split: true,
    });

    const newProperties: Partial<SlateElement> = { type: isActive ? 'paragraph' : 'code-line' };
    Transforms.setNodes<SlateElement>(editor, newProperties);

    if (!isActive) {
        const block: CustomElement = { type: 'code-block', children: [] };
        Transforms.wrapNodes(editor, block, { match: n => SlateElement.isElement(n) && (n.type === 'code-line' || n.type === 'paragraph') });

    }
};

const isCodeBlockActive = (editor: Editor) => {
    const [match] = Editor.nodes(editor, {
        match: n =>
            !Editor.isEditor(n) &&
            SlateElement.isElement(n) &&
            n.type === 'code-block',
        universal: true,
    });

    return !!match;
};

export const RichTextArea = ({
    value,
    onChange,
    placeholder = "",
    disabled = false,
    className = "",
    key,
}: CustomInputBoxProps) => {
    const [editor] = useState(() => withLinks(withHistory(withReact(createEditor()))));
    const [activeGroup, setActiveGroup] = useState<string | null>(null);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

    useEffect(() => {
        if (key) {
            Transforms.delete(editor, {
                at: {
                    anchor: Editor.start(editor, []),
                    focus: Editor.end(editor, []),
                },
            });
            Transforms.insertNodes(editor, initialValue);
        }
    }, [key, editor]);

    const renderElement = useCallback((props: any) => {
        const { attributes, children, element } = props;
        
        const style: React.CSSProperties = { textAlign: (element as any).align };

        switch (element.type) {
             case 'heading':
                return <h3 style={{ ...style, fontSize: '1.5em' }} className="text-2xl font-bold my-2" {...attributes}>{children}</h3>;
            case 'bulleted-list':
                return <ul style={style} className="list-disc pl-6 my-2 text-sm md:text-lg" {...attributes}>{children}</ul>;
            case 'list-item':
                return <li style={style} className="my-1 text-sm md:text-lg" {...attributes}>{children}</li>;
            case 'numbered-list':
                return <ol style={style} className="list-decimal pl-6 my-2 text-sm md:text-lg" {...attributes}>{children}</ol>;
            case 'code-block':
                return (
                    <pre 
                        {...attributes} 
                        className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md my-2 font-mono text-sm whitespace-pre-wrap"
                    >
                        {children}
                    </pre>
                );
            case 'code-line':
                return <div className="whitespace-pre-wrap">{children}</div>;
            case 'link':
                return (
                    <a 
                        {...attributes} 
                        href={element.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 underline cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            window.open(element.url, '_blank');
                        }}
                    >
                        {children}
                    </a>
                );
            default:
                return <p style={{...style, marginTop: 0}} className="my-2 text-sm md:text-lg" {...attributes}>{children}</p>;
        }
    }, []);

    const renderLeaf = useCallback((props: any) => {
        let { attributes, children, leaf } = props;

        if (leaf.bold) {
            children = <strong>{children}</strong>;
        }

        if (leaf.italic) {
            children = <em>{children}</em>;
        }

        if (leaf.underline) {
            children = <u>{children}</u>;
        }

        if (leaf.strikethrough) {
            children = <span style={{ textDecoration: 'line-through' }}>{children}</span>;
        }

        if (leaf.code) {
            children = <code className="bg-gray-100 dark:bg-gray-900 px-1 rounded font-mono text-sm">{children}</code>;
        }

        return <span {...attributes}>{children}</span>;
    }, []);

    const handleGroupClick = (group: string) => {
        setActiveGroup(activeGroup === group ? null : group);
    };

    const insertLink = () => {
        setIsLinkModalOpen(true);
    };

    const handleLinkInsert = (url: string) => {
        const { selection } = editor;
        if (!selection) return;

        const isCollapsed = Range.isCollapsed(selection);

        const link: CustomElement = {
            type: 'link',
            url,
            children: isCollapsed ? [{ text: url }] : [],
        };

        if (isCollapsed) {
            Transforms.insertNodes(editor, link);
        } else {
            Transforms.wrapNodes(editor, link, { split: true });
        }
    };

    const handleEmojiInsert = (emoji: string) => {
        // Ensure editor is focused
        ReactEditor.focus(editor);
        
        // Insert just the emoji - no automatic space
        Transforms.insertText(editor, emoji);
        
        // Move cursor to after the emoji without adding extra space
        // This should resolve the spacing issue while maintaining cursor position
    };

    return (
        <div 
            className={cn("border rounded-md py-3 flex flex-col", className, "focus-within:ring focus-within:ring-gray-900 dark:focus-within:ring-white focus-within:ring-opacity-50")}
            onClick={() => {
                ReactEditor.focus(editor);
            }}
        >
            <Slate
                editor={editor}
                initialValue={value ? JSON.parse(value) : initialValue}
                onChange={value => {
                    const isAstChange = editor.operations.some(
                        op => 'set_selection' !== op.type
                    );
                    if (isAstChange) {
                        const content = JSON.stringify(value);
                        onChange(content);
                    }
                }}
            >
                <div className="border-b flex flex-wrap gap-2 md:gap-6 items-center md:pl-4 pb-2 mb-2 justify-center">
                    <div className="md:hidden">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="flex items-center gap-0.2"
                                >
                                    <Bold />
                                    <span className="bg-gray-100 dark:bg-gray-900">
                                        <ChevronDown />
                                    </span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className='md:gap-4'>
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.preventDefault();
                                        toggleMark(editor, 'bold');
                                    }}
                                >
                                    <Bold />
                                    Bold
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.preventDefault();
                                        toggleMark(editor, 'italic');
                                    }}
                                >
                                    <Italic />
                                    Italic
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.preventDefault();
                                        toggleMark(editor, 'underline');
                                    }}
                                >
                                    <Underline />
                                    Underline
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.preventDefault();
                                        toggleMark(editor, 'strikethrough');
                                    }}
                                >
                                    <Strikethrough />
                                    Strikethrough
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="hidden md:flex md:gap-4 items-center">
                        <span
                            onClick={(e) => { e.preventDefault(); toggleMark(editor, 'bold'); }}
                            className={cn("cursor-pointer p-1 rounded-md hover:bg-accent hover:text-accent-foreground", isMarkActive(editor, 'bold') && 'bg-accent')}
                            title="Bold"
                        >
                            <Bold className="h-4 w-4 md:h-5 md:w-5" />
                        </span>
                        <span
                            onClick={(e) => {
                                e.preventDefault();
                                toggleMark(editor, 'italic');
                            }}
                            className={cn("cursor-pointer p-1 rounded-md hover:bg-accent hover:text-accent-foreground", isMarkActive(editor, 'italic') && 'bg-accent')}
                            title="Italic"
                        >
                            <Italic className="h-4 w-4 md:h-5 md:w-5" />
                        </span>
                        <span
                            onClick={(e) => {
                                e.preventDefault();
                                toggleMark(editor, 'underline');
                            }}
                            className={cn("cursor-pointer p-1 rounded-md hover:bg-accent hover:text-accent-foreground", isMarkActive(editor, 'underline') && 'bg-accent')}
                            title="Underline"
                        >
                            <Underline className="h-4 w-4 md:h-5 md:w-5" />
                        </span>
                        <span
                            onClick={(e) => { e.preventDefault(); toggleMark(editor, 'strikethrough'); }}
                            className={cn("cursor-pointer p-1 rounded-md hover:bg-accent hover:text-accent-foreground", isMarkActive(editor, 'strikethrough') && 'bg-accent')}
                            title="Strikethrough"
                        >
                            <Strikethrough className="h-4 w-4 md:h-5 md:w-5" />
                        </span>
                    </div>

                    <span
                        onClick={(e) => { e.preventDefault(); toggleHeading(editor); }}
                        className={cn("cursor-pointer p-1 rounded-md hover:bg-accent hover:text-accent-foreground", isHeadingActive(editor) && 'bg-accent')}
                         title="Heading"
                    >
                        <Heading className="h-4 w-4 md:h-5 md:w-5"/>
                    </span>

                    <div className="md:hidden">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="flex items-center gap-0.2"
                                >
                                    <List />
                                    <span className="bg-gray-100 dark:bg-gray-900">
                                        <ChevronDown />
                                    </span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className='md:gap-4'>
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.preventDefault();
                                        toggleBlock(editor, 'numbered-list');
                                    }}
                                >
                                    <ListOrdered />
                                    Numbered List
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.preventDefault();
                                        toggleBlock(editor, 'bulleted-list');
                                    }}
                                >
                                    <List />
                                    Bullet List
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="hidden md:flex md:gap-4 items-center">
                        <span
                            onClick={(e) => { e.preventDefault(); toggleBlock(editor, 'numbered-list'); }}
                            className={cn("cursor-pointer p-1 rounded-md hover:bg-accent hover:text-accent-foreground", isBlockActive(editor, 'numbered-list') && 'bg-accent')}
                            title="Numbered List"
                        >
                            <ListOrdered className="h-4 w-4 md:h-5 md:w-5"/>
                        </span>
                        <span
                            onClick={(e) => {
                                e.preventDefault();
                                toggleBlock(editor, 'bulleted-list');
                            }}
                             className={cn("cursor-pointer p-1 rounded-md hover:bg-accent hover:text-accent-foreground", isBlockActive(editor, 'bulleted-list') && 'bg-accent')}
                             title="Bulleted List"
                        >
                            <List className="h-4 w-4 md:h-5 md:w-5"/>
                        </span>
                    </div>

                    <div className="md:hidden">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="flex items-center gap-0.2"
                                >
                                    <AlignLeft />
                                    <span className="bg-gray-100 dark:bg-gray-900">
                                        <ChevronDown />
                                    </span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.preventDefault();
                                        toggleAlignment(editor, 'left');
                                    }}
                                >
                                    <AlignLeft />
                                    Align Left
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.preventDefault();
                                        toggleAlignment(editor, 'center');
                                    }}
                                >
                                    <AlignCenter />
                                    Align Center
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.preventDefault();
                                        toggleAlignment(editor, 'right');
                                    }}
                                >
                                    <AlignRight />
                                    Align Right
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.preventDefault();
                                        toggleAlignment(editor, 'justify');
                                    }}
                                >
                                    <AlignJustify />
                                    Justify
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="hidden md:flex md:gap-4 items-center">
                        <span
                            onClick={(e) => {
                                e.preventDefault();
                                toggleAlignment(editor, 'left');
                            }}
                            className={cn(isBlockActive(editor, 'paragraph', 'left') && 'bg-accent', "cursor-pointer p-1 rounded-md hover:bg-accent hover:text-accent-foreground")}
                            title="Align Left"
                        >
                            <AlignLeft className="h-4 w-4 md:h-5 md:w-5"/>
                        </span>
                        <span
                            onClick={(e) => {
                                e.preventDefault();
                                toggleAlignment(editor, 'center');
                            }}
                            className={cn(isBlockActive(editor, 'paragraph', 'center') && 'bg-accent', "cursor-pointer p-1 rounded-md hover:bg-accent hover:text-accent-foreground")}
                            title="Align Center"
                        >
                            <AlignCenter className="h-4 w-4 md:h-5 md:w-5"/>
                        </span>
                        <span
                            onClick={(e) => {
                                e.preventDefault();
                                toggleAlignment(editor, 'right');
                            }}
                            className={cn(isBlockActive(editor, 'paragraph', 'right') && 'bg-accent', "cursor-pointer p-1 rounded-md hover:bg-accent hover:text-accent-foreground")}
                            title="Align Right"
                        >
                            <AlignRight className="h-4 w-4 md:h-5 md:w-5"/>
                        </span>
                        <span
                            onClick={(e) => {
                                e.preventDefault();
                                toggleAlignment(editor, 'justify');
                            }}
                            className={cn(isBlockActive(editor, 'paragraph', 'justify') && 'bg-accent', "cursor-pointer p-1 rounded-md hover:bg-accent hover:text-accent-foreground")}
                             title="Justify"
                        >
                            <AlignJustify className="h-4 w-4 md:h-5 md:w-5"/>
                        </span>
                    </div>

                    <span
                        onClick={(e) => { e.preventDefault(); toggleCodeBlock(editor); }}
                        className={cn(isCodeBlockActive(editor) && 'bg-accent', "cursor-pointer p-1 rounded-md hover:bg-accent hover:text-accent-foreground")}
                        title="Code Block"
                    >
                        <Code className="h-4 w-4 md:h-5 md:w-5"/>
                    </span>

                    <span
                        onClick={(e) => { e.preventDefault(); insertLink(); }}
                        className='cursor-pointer p-1 rounded-md hover:bg-accent hover:text-accent-foreground'
                        title="Link"
                    >
                        <Link className="h-4 w-4 md:h-5 md:w-5"/>
                    </span>

                    <EmojiPicker onEmojiSelect={handleEmojiInsert} />
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                    <Editable
                        className="outline-none ring-0 border-transparent shadow-none custom-no-focus-border w-full px-2 md:px-4 text-xs md:text-xl"
                        renderElement={renderElement}
                        renderLeaf={renderLeaf}
                        placeholder={placeholder}
                        readOnly={disabled}
                    />
                </div>
            </Slate>

            <LinkModal
                isOpen={isLinkModalOpen}
                onClose={() => setIsLinkModalOpen(false)}
                onConfirm={handleLinkInsert}
            />
        </div>
    );
};