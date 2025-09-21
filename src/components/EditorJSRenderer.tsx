import React from 'react';

interface EditorJSBlock {
  id?: string;
  type: string;
  data: any;
}

interface EditorJSData {
  blocks: EditorJSBlock[];
  time?: number;
  version?: string;
}

interface EditorJSRendererProps {
  data: EditorJSData;
}

const EditorJSRenderer: React.FC<EditorJSRendererProps> = ({ data }) => {
  if (!data || !data.blocks) {
    return <div className="text-muted-foreground text-sm italic">No content available</div>;
  }

  const renderBlock = (block: EditorJSBlock, index: number) => {
    const { type, data: blockData } = block;

    switch (type) {
      case 'header':
        const HeaderTag = `h${blockData.level || 1}` as keyof JSX.IntrinsicElements;
        const headerClasses = {
          1: 'text-3xl font-bold mb-4 mt-6',
          2: 'text-2xl font-bold mb-3 mt-5',
          3: 'text-xl font-semibold mb-3 mt-4',
          4: 'text-lg font-semibold mb-2 mt-4',
          5: 'text-base font-semibold mb-2 mt-3',
          6: 'text-sm font-semibold mb-2 mt-3',
        };
        return (
          <HeaderTag 
            key={index} 
            className={headerClasses[blockData.level as keyof typeof headerClasses] || headerClasses[1]}
            dangerouslySetInnerHTML={{ __html: blockData.text || '' }}
          />
        );

      case 'paragraph':
        return (
          <p 
            key={index} 
            className="text-sm leading-relaxed mb-4"
            dangerouslySetInnerHTML={{ __html: blockData.text || '' }}
          />
        );

      case 'list':
        const isOrdered = blockData.style === 'ordered';
        const ListTag = isOrdered ? 'ol' : 'ul';
        const listClass = isOrdered 
          ? 'list-decimal space-y-3 mb-6 pl-6 marker:text-muted-foreground' 
          : 'list-disc space-y-3 mb-6 pl-6 marker:text-muted-foreground';
        
        const renderListItem = (item: any, itemIndex: number): React.ReactNode => {
          // Handle different item formats
          let content = '';
          let nestedItems: any[] = [];
          
          if (typeof item === 'string') {
            // Simple string item
            content = item;
          } else if (typeof item === 'object' && item !== null) {
            // Object item with content and possibly nested items
            content = item.content || item.text || item.value || '';
            nestedItems = item.items || [];
          } else {
            // Fallback for other types
            content = String(item);
          }
          
          return (
            <li key={itemIndex} className="text-sm leading-7 text-foreground/90 hover:text-foreground transition-colors">
              <div 
                className="pl-1" 
                dangerouslySetInnerHTML={{ __html: content }} 
              />
              {nestedItems.length > 0 && (
                <ListTag className={`${listClass} mt-2 ml-4`}>
                  {nestedItems.map((nestedItem: any, nestedIndex: number) => 
                    renderListItem(nestedItem, nestedIndex)
                  )}
                </ListTag>
              )}
            </li>
          );
        };
        
        return (
          <ListTag key={index} className={listClass}>
            {blockData.items?.map((item: any, itemIndex: number) => 
              renderListItem(item, itemIndex)
            )}
          </ListTag>
        );

      case 'quote':
        return (
          <blockquote key={index} className="border-l-4 border-primary/30 pl-4 py-2 mb-4 bg-muted/30 rounded-r-lg">
            <p 
              className="text-sm italic text-muted-foreground mb-2"
              dangerouslySetInnerHTML={{ __html: blockData.text || '' }}
            />
            {blockData.caption && (
              <cite 
                className="text-xs text-muted-foreground font-medium"
                dangerouslySetInnerHTML={{ __html: `— ${blockData.caption}` }}
              />
            )}
          </blockquote>
        );

      case 'code':
        return (
          <pre key={index} className="bg-muted p-4 rounded-lg mb-4 overflow-x-auto">
            <code className="text-sm font-mono">{blockData.code || ''}</code>
          </pre>
        );

      case 'table':
        return (
          <div key={index} className="overflow-x-auto mb-4">
            <table className="min-w-full border border-border rounded-lg">
              <tbody>
                {blockData.content?.map((row: string[], rowIndex: number) => (
                  <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-muted/20' : 'bg-background'}>
                    {row.map((cell: string, cellIndex: number) => (
                      <td 
                        key={cellIndex} 
                        className="border border-border px-3 py-2 text-sm"
                        dangerouslySetInnerHTML={{ __html: cell }}
                      />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'image':
        // Extract image sizing and styling information
        const imageUrl = blockData.file?.url || blockData.url;
        const isStretched = blockData.stretched;
        const hasBackground = blockData.withBackground;
        const hasBorder = blockData.withBorder;
        const caption = blockData.caption;
        
        // Check for custom dimensions from editor (prioritize customWidth/customHeight from our tool)
        const customWidth = blockData.customWidth || blockData.width || blockData.file?.width;
        const customHeight = blockData.customHeight || blockData.height || blockData.file?.height;
        
        // Debug: Log the dimensions being used
        console.log('🎨 EditorJSRenderer - Image dimensions:', {
          url: imageUrl,
          customWidth,
          customHeight,
          blockData: {
            customWidth: blockData.customWidth,
            customHeight: blockData.customHeight,
            width: blockData.width,
            height: blockData.height,
            fileWidth: blockData.file?.width,
            fileHeight: blockData.file?.height
          }
        });
        
        
        // Calculate image dimensions and styling
        let imageStyle: React.CSSProperties = {};
        let containerClass = "mb-6"; // Base container class
        let imageClass = "rounded-lg transition-all duration-200";
        
        if (isStretched) {
          // Stretched images take full width
          imageStyle.width = '100%';
          imageStyle.maxWidth = '100%';
        } else if (customWidth && customHeight) {
          // Use exact custom dimensions from editor
          imageStyle.width = `${customWidth}px`;
          imageStyle.height = `${customHeight}px`;
          imageStyle.maxWidth = '100%'; // Ensure responsive behavior on small screens
          imageStyle.objectFit = 'contain'; // Maintain aspect ratio if container is smaller
          
        } else if (customWidth) {
          // Only width specified - maintain aspect ratio
          imageStyle.width = `${customWidth}px`;
          imageStyle.height = 'auto';
          imageStyle.maxWidth = '100%';
        } else {
          // Default behavior: maintain original size but responsive
          imageStyle.maxWidth = '100%';
          imageStyle.height = 'auto';
        }
        
        // Add border if specified
        if (hasBorder) {
          imageClass += " border-2 border-border";
        } else {
          imageClass += " border border-border/50";
        }
        
        // Add background if specified
        if (hasBackground) {
          imageClass += " p-4 bg-muted/20";
        }
        
        return (
          <figure key={index} className={containerClass}>
            <div className="w-full flex flex-col items-center">
              <img 
                src={imageUrl} 
                alt={caption || 'Image'}
                className={imageClass}
                style={imageStyle}
                loading="lazy"
              />
              {caption && (
                <figcaption 
                  className="text-xs text-muted-foreground text-center mt-3 italic leading-relaxed w-full"
                  dangerouslySetInnerHTML={{ __html: caption }}
                />
              )}
            </div>
          </figure>
        );

      case 'linkTool':
        return (
          <div key={index} className="border border-border rounded-lg p-3 mb-4 hover:bg-muted/20 transition-colors">
            <a 
              href={blockData.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block text-primary hover:text-primary/80"
            >
              {blockData.meta?.image && (
                <img 
                  src={blockData.meta.image.url} 
                  alt={blockData.meta.title}
                  className="w-full h-32 object-cover rounded mb-2"
                />
              )}
              <div className="space-y-1">
                <h4 className="font-medium text-sm line-clamp-2">
                  {blockData.meta?.title || blockData.link}
                </h4>
                {blockData.meta?.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {blockData.meta.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground font-mono">
                  {new URL(blockData.link).hostname}
                </p>
              </div>
            </a>
          </div>
        );

      case 'delimiter':
        return (
          <div key={index} className="flex justify-center my-6">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
              <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
              <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
            </div>
          </div>
        );

      case 'raw':
        return (
          <div key={index} className="bg-muted/30 p-3 rounded border-l-4 border-yellow-500 mb-4">
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
              {blockData.html || 'Raw HTML block'}
            </pre>
          </div>
        );

      case 'embed':
        return (
          <div key={index} className="mb-4">
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground text-sm">
                Embedded content: {blockData.service || 'Unknown service'}
              </p>
            </div>
            {blockData.caption && (
              <p className="text-xs text-muted-foreground text-center mt-2 italic">
                {blockData.caption}
              </p>
            )}
          </div>
        );

      default:
        return (
          <div key={index} className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded mb-4 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-2 text-xs text-yellow-700 dark:text-yellow-300">
              <span className="bg-yellow-200 dark:bg-yellow-800 px-2 py-1 rounded font-mono">{type}</span>
              <span>Unsupported block type</span>
            </div>
            {blockData && typeof blockData === 'object' && (
              <details className="mt-2">
                <summary className="text-xs cursor-pointer hover:text-yellow-600 dark:hover:text-yellow-200">
                  View raw data
                </summary>
                <pre className="text-xs mt-2 bg-background p-2 rounded overflow-x-auto max-h-32 overflow-y-auto">
                  {JSON.stringify(blockData, null, 2)}
                </pre>
              </details>
            )}
          </div>
        );
    }
  };

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none editorjs-content">
      <style dangerouslySetInnerHTML={{
        __html: `
          .editorjs-content mark {
            background-color: hsl(var(--primary) / 0.2);
            padding: 0.125rem 0.25rem;
            border-radius: 0.25rem;
          }
          .editorjs-content u {
            text-decoration: underline;
            text-decoration-color: hsl(var(--primary));
            text-underline-offset: 0.2em;
          }
          .editorjs-content code:not(pre code) {
            background-color: hsl(var(--muted));
            padding: 0.125rem 0.25rem;
            border-radius: 0.25rem;
            font-size: 0.875em;
            color: hsl(var(--foreground));
          }
          .editorjs-content a {
            color: hsl(var(--primary));
            text-decoration: underline;
            text-decoration-color: hsl(var(--primary) / 0.5);
          }
          .editorjs-content a:hover {
            text-decoration-color: hsl(var(--primary));
          }
        `
      }} />
      {data.blocks.map((block, index) => renderBlock(block, index))}
    </div>
  );
};

export default EditorJSRenderer;
