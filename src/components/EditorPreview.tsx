import React from 'react';

interface EditorPreviewProps {
  data: any;
  className?: string;
}

const EditorPreview: React.FC<EditorPreviewProps> = ({ data, className = '' }) => {
  
  // Image size management functions
  const getImageSizes = () => {
    try {
      const sizes = localStorage.getItem('editorjs-image-sizes');
      return sizes ? JSON.parse(sizes) : {};
    } catch (error) {
      console.error('Error loading image sizes:', error);
      return {};
    }
  };

  // Render EditorJS blocks to HTML for preview
  const renderPreview = (data: any) => {
    if (!data || !data.blocks) return [];

    return data.blocks.map((block: any, index: number) => {
      const key = `${block.type}-${index}`;
      
      switch (block.type) {
        case 'header':
          const HeaderTag = `h${block.data.level || 1}` as keyof JSX.IntrinsicElements;
          return (
            <HeaderTag key={key} className={`preview-header-${block.data.level || 1}`}>
              {block.data.text}
            </HeaderTag>
          );
          
        case 'paragraph':
          return (
            <p key={key} className="preview-paragraph" dangerouslySetInnerHTML={{ 
              __html: block.data.text || '' 
            }} />
          );
          
        case 'list':
          const ListTag = block.data.style === 'ordered' ? 'ol' : 'ul';
          return (
            <ListTag key={key} className="preview-list">
              {block.data.items.map((item: string, idx: number) => (
                <li key={idx} dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </ListTag>
          );
          
        case 'quote':
          return (
            <blockquote key={key} className="preview-quote">
              <div className="quote-text" dangerouslySetInnerHTML={{ 
                __html: block.data.text || '' 
              }} />
              {block.data.caption && (
                <cite className="quote-caption">{block.data.caption}</cite>
              )}
            </blockquote>
          );
          
        case 'code':
          return (
            <pre key={key} className="preview-code">
              <code>{block.data.code}</code>
            </pre>
          );
          
        case 'delimiter':
          return (
            <div key={key} className="preview-delimiter">
              <span>* * *</span>
            </div>
          );
          
        case 'image':
          // Generate consistent image ID for preview mode
          const imageUrl = block.data.file?.url || '';
          const imageAlt = block.data.caption || '';
          const previewImageId = `${imageUrl}_${imageAlt}_${index}`.replace(/[^a-zA-Z0-9_-]/g, '_');
          
          // Get saved image dimensions - try multiple ID formats for better compatibility
          const savedSizes = getImageSizes();
          let savedSize = savedSizes[previewImageId];
          
          // Try alternative ID formats if primary one doesn't exist
          if (!savedSize) {
            // Try without caption/alt
            const altId = `${imageUrl}__${index}`.replace(/[^a-zA-Z0-9_-]/g, '_');
            savedSize = savedSizes[altId];
          }
          
          if (!savedSize) {
            // Try with empty alt field (common case)
            const emptyAltId = `${imageUrl}_${''}_${index}`.replace(/[^a-zA-Z0-9_-]/g, '_');
            savedSize = savedSizes[emptyAltId];
          }
          
          // Apply saved dimensions or use auto sizing
          const imageStyle = savedSize ? {
            width: `${savedSize.width}px`,
            height: `${savedSize.height}px`,
            maxWidth: 'none'
          } : {};

          return (
            <figure key={key} className="preview-image">
              <img 
                src={imageUrl} 
                alt={imageAlt} 
                className="preview-image-img"
                style={imageStyle}
              />
              {block.data.caption && (
                <figcaption className="preview-image-caption">
                  {block.data.caption}
                </figcaption>
              )}
            </figure>
          );
          
        case 'table':
          return (
            <table key={key} className="preview-table">
              <tbody>
                {block.data.content.map((row: string[], rowIdx: number) => (
                  <tr key={rowIdx}>
                    {row.map((cell: string, cellIdx: number) => (
                      <td key={cellIdx} dangerouslySetInnerHTML={{ __html: cell }} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          );
          
        case 'linkTool':
          return (
            <div key={key} className="preview-link">
              <a href={block.data.link} target="_blank" rel="noopener noreferrer">
                {block.data.meta?.image && (
                  <img src={block.data.meta.image.url} alt="" className="link-image" />
                )}
                <div className="link-content">
                  <div className="link-title">{block.data.meta?.title || block.data.link}</div>
                  {block.data.meta?.description && (
                    <div className="link-description">{block.data.meta.description}</div>
                  )}
                  <div className="link-url">{block.data.link}</div>
                </div>
              </a>
            </div>
          );
          
        default:
          return (
            <div key={key} className="preview-unknown">
              <p>Unsupported block type: {block.type}</p>
            </div>
          );
      }
    });
  };

  return (
    <div className={`preview-container ${className}`}>
      {data ? renderPreview(data) : (
        <div className="text-center text-gray-500 dark:text-gray-400 py-20">
          <p>No content to preview</p>
        </div>
      )}
    </div>
  );
};

export default EditorPreview;
