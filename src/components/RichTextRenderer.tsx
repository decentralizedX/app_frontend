import { useCallback } from 'react';
import { Descendant } from 'slate';
import { Element as SlateElement } from 'slate';

interface RichTextRendererProps {
  content: string;
}

const renderElement = (props: any) => {
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
          className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md my-2 font-mono text-sm overflow-x-auto"
        >
          {children}
        </pre>
      );
    case 'code-line':
      return children;
    case 'link':
      return (
        <a 
          {...attributes} 
          href={element.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            window.open(element.url, '_blank');
          }}
        >
          {children}
        </a>
      );
    default:
      const isEmpty = !children || (Array.isArray(children) && children.every(child => !child.props.children));
      return <p style={{...style}} className="my-2 text-sm md:text-lg" {...attributes}>{isEmpty ? <br /> : children}</p>;
  }
};

const renderLeaf = (props: any) => {
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
};

const renderNode = (node: Descendant, index: number) => {
  if (SlateElement.isElement(node)) {
    const children = node.children.map((child, i) => renderNode(child, i));
    return renderElement({ attributes: {}, children, element: node });
  } else {
    return renderLeaf({ attributes: {}, children: node.text, leaf: node });
  }
};

export const RichTextRenderer = ({ content }: RichTextRendererProps) => {
  try {
    const parsedContent = JSON.parse(content) as Descendant[];
    return (
      <div className="rich-text-content">
        {parsedContent.map((node, index) => renderNode(node, index))}
      </div>
    );
  } catch (error) {
    console.error('Error parsing rich text content:', error);
    return <div className="text-muted-foreground">Invalid content format</div>;
  }
}; 