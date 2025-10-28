/**
 * Rich Text Editor Component using Slate.js
 * MIT-licensed, API key-free rich text editor
 */

import React, { useState, useCallback, useRef } from 'react';
import { Editable, Slate, withReact, useSlate, ReactEditor } from 'slate-react';
import { createEditor, Transforms } from 'slate';
import { withHistory } from 'slate-history';
import { FontPicker } from './font-picker.jsx';

// Toolbar buttons
const ToolbarButton = ({ icon, isActive, onClick, title }) => (
  <button
    type="button"
    onMouseDown={onClick}
    className={`px-3 py-1 rounded text-sm ${isActive ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
    title={title}
  >
    {icon}
  </button>
);

const FormatButton = ({ format, icon, title }) => {
  const editor = useSlate();
  const isActive = isMarkActive(editor, format);
  
  return (
    <ToolbarButton
      icon={icon}
      isActive={isActive}
      onClick={(e) => {
        e.preventDefault();
        toggleMark(editor, format);
      }}
      title={title}
    />
  );
};

const AlignButton = ({ alignment, icon, title }) => {
  const editor = useSlate();
  const { selection } = editor;
  
  const isActive = React.useMemo(() => {
    if (!selection) return false;
    const [match] = Array.from(
      editor.nodes({
        at: selection,
        match: n => !editor.isInline(n)
      })
    );
    return match ? match[0].align === alignment : false;
  }, [editor, selection, alignment]);
  
  return (
    <ToolbarButton
      icon={icon}
      isActive={isActive}
      onClick={(e) => {
        e.preventDefault();
        
        // Get all top-level blocks that intersect with the selection
        const blocks = Array.from(
          editor.nodes({
            match: n => !editor.isInline(n),
            mode: 'lowest'
          })
        );
        
        // Apply alignment to each block
        blocks.forEach(([, path]) => {
          Transforms.setNodes(
            editor,
            { align: alignment },
            { at: path }
          );
        });
      }}
      title={title}
    />
  );
};

const ColorSelector = ({ format, title }) => {
  const editor = useSlate();
  
  return (
    <div className="relative inline-block">
      <input
        type="color"
        onChange={(e) => {
          if (format === 'textColor') {
            editor.addMark('color', e.target.value);
          } else {
            editor.addMark('backgroundColor', e.target.value);
          }
        }}
        className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
        title={title}
      />
    </div>
  );
};

const FontSizeSelector = ({ title }) => {
  const editor = useSlate();
  
  const sizes = [
    { label: '8pt', value: '8pt' },
    { label: '10pt', value: '10pt' },
    { label: '12pt', value: '12pt' },
    { label: '14pt', value: '14pt' },
    { label: '16pt', value: '16pt' },
    { label: '18pt', value: '18pt' },
    { label: '20pt', value: '20pt' },
    { label: '24pt', value: '24pt' },
    { label: '28pt', value: '28pt' },
    { label: '32pt', value: '32pt' },
  ];
  
  return (
    <select
      onChange={(e) => {
        e.preventDefault();
        editor.addMark('fontSize', e.target.value);
      }}
      className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
      title={title}
    >
      <option value="">Size</option>
      {sizes.map(size => (
        <option key={size.value} value={size.value}>{size.label}</option>
      ))}
    </select>
  );
};

const FontFamilySelector = ({ availableFonts, title }) => {
  const editor = useSlate();
  
  const defaultFonts = [
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Times New Roman', value: '"Times New Roman", serif' },
    { label: 'Courier New', value: '"Courier New", monospace' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Verdana', value: 'Verdana, sans-serif' },
  ];
  
  const fonts = availableFonts && availableFonts.length > 0 ? availableFonts : defaultFonts;
  
  return (
    <select
      onChange={(e) => {
        e.preventDefault();
        if (e.target.value) {
          editor.addMark('fontFamily', e.target.value);
        }
      }}
      className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
      title={title}
    >
      <option value="">Font</option>
      {fonts.map(font => (
        <option key={typeof font === 'string' ? font : font.value} value={typeof font === 'string' ? font : font.value}>
          {typeof font === 'string' ? font : font.label}
        </option>
      ))}
    </select>
  );
};

const ImageUploadButton = ({ title }) => {
  const editor = useSlate();
  const inputRef = useRef(null);
  
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result;
        if (imageUrl) {
          // Insert image at current cursor position
          Transforms.insertNodes(editor, {
            type: 'image',
            url: imageUrl,
            children: [{ text: '' }]
          });
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be selected again
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };
  
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageUpload}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="px-3 py-1 rounded text-sm bg-gray-200 text-gray-700 hover:bg-gray-300"
        title={title}
      >
        📷
      </button>
    </>
  );
};

// Helper functions
const isMarkActive = (editor, format) => {
  const marks = editor.getMarks();
  return marks ? marks[format] === true : false;
};

const toggleMark = (editor, format) => {
  const isActive = isMarkActive(editor, format);
  
  if (isActive) {
    editor.removeMark(format);
  } else {
    editor.addMark(format, true);
  }
};

export function RichTextEditor({ 
  label, 
  value, 
  onChange, 
  enableVariables = false,
  height = 300,
  placeholder = '',
  disabled = false,
  availableFonts = []
}) {
  const [editor] = useState(() => withHistory(withReact(createEditor())));

  // Convert HTML string to Slate value
  const htmlToSlateValue = (html) => {
    if (!html) return [{ type: 'paragraph', children: [{ text: '' }] }];
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const body = doc.body;
    
    const convert = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return { text: node.textContent };
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        // Handle images
        if (node.tagName === 'IMG') {
          return {
            type: 'image',
            url: node.src,
            alt: node.alt || '',
            children: [{ text: '' }]
          };
        }
        
        const children = Array.from(node.childNodes).map(convert).flat();
        const text = children.filter(c => typeof c === 'object' && c.text).map(c => c.text).join('');
        
        const leaf = { text };
        
        // Handle formatting
        if (node.tagName === 'STRONG' || node.tagName === 'B') {
          leaf.bold = true;
        }
        if (node.tagName === 'EM' || node.tagName === 'I') {
          leaf.italic = true;
        }
        if (node.tagName === 'U') {
          leaf.underline = true;
        }
        
        // Check for inline styles for color, fontSize, and fontFamily
        if (node.style && node.style.color) {
          leaf.color = node.style.color;
        }
        if (node.style && node.style.backgroundColor) {
          leaf.backgroundColor = node.style.backgroundColor;
        }
        if (node.style && node.style.fontSize) {
          leaf.fontSize = node.style.fontSize;
        }
        if (node.style && node.style.fontFamily) {
          leaf.fontFamily = node.style.fontFamily;
        }
        
        return leaf;
      }
      
      return { text: '' };
    };
    
    const paragraphs = Array.from(body.querySelectorAll('p, br'));
    if (paragraphs.length === 0) {
      return [{ type: 'paragraph', children: [{ text: body.textContent || '' }] }];
    }
    
    return paragraphs.map(p => ({
      type: 'paragraph',
      children: convert(p)
    }));
  };

  // Convert Slate value to HTML string
  const slateValueToHtml = (value) => {
    return value.map(node => {
      if (node.type === 'image') {
        return `<img src="${node.url}" alt="${node.alt || ''}" style="max-width: 100%; height: auto;" />`;
      }
      if (node.type === 'paragraph') {
        const style = node.align ? ` style="text-align: ${node.align}"` : '';
        const children = node.children.map(child => {
          let html = child.text;
          let styleAttrs = [];
          
          if (child.bold) html = `<strong>${html}</strong>`;
          if (child.italic) html = `<em>${html}</em>`;
          if (child.underline) html = `<u>${html}</u>`;
          
          if (child.color) styleAttrs.push(`color: ${child.color}`);
          if (child.backgroundColor) styleAttrs.push(`background-color: ${child.backgroundColor}`);
          if (child.fontSize) styleAttrs.push(`font-size: ${child.fontSize}`);
          if (child.fontFamily) styleAttrs.push(`font-family: ${child.fontFamily}`);
          
          if (styleAttrs.length > 0) {
            html = `<span style="${styleAttrs.join('; ')}">${html}</span>`;
          }
          
          return html;
        }).join('');
        return `<p${style}>${children}</p>`;
      }
      return '';
    }).join('');
  };

  const [slateValue, setSlateValue] = useState(() => 
    value ? htmlToSlateValue(value) : [{ type: 'paragraph', children: [{ text: '' }] }]
  );

  const handleChange = useCallback((newValue) => {
    setSlateValue(newValue);
    const html = slateValueToHtml(newValue);
    onChange(html);
  }, [onChange]);

  const insertVariable = (variable) => {
    editor.insertText(variable);
  };

  const templateVariables = [
    { text: 'Date', value: '{{date}}' },
    { text: 'Page Number', value: '{{page_number}}' },
    { text: 'Company Name', value: '{{company_name}}' },
    { text: 'Company Address', value: '{{company_address}}' },
    { text: 'Company Contact', value: '{{company_contact}}' },
    { text: 'Document Title', value: '{{document_title}}' },
    { text: 'Document Type', value: '{{document_type}}' },
    { text: 'Year', value: '{{year}}' },
    { text: 'Month', value: '{{month}}' },
  ];

  const renderLeaf = useCallback(({ attributes, children, leaf }) => {
    if (leaf.bold) {
      children = <strong>{children}</strong>;
    }
    if (leaf.italic) {
      children = <em>{children}</em>;
    }
    if (leaf.underline) {
      children = <u>{children}</u>;
    }

    const style = {};
    if (leaf.color) {
      style.color = leaf.color;
    }
    if (leaf.backgroundColor) {
      style.backgroundColor = leaf.backgroundColor;
    }
    if (leaf.fontSize) {
      style.fontSize = leaf.fontSize;
    }
    if (leaf.fontFamily) {
      style.fontFamily = leaf.fontFamily;
    }

    return <span {...attributes} style={Object.keys(style).length > 0 ? style : undefined}>{children}</span>;
  }, []);

  const renderElement = useCallback(({ attributes, children, element }) => {
    const style = element.align ? { textAlign: element.align } : {};
    
    switch (element.type) {
      case 'paragraph':
        return <p {...attributes} style={style}>{children}</p>;
      case 'image':
        return (
          <div {...attributes} contentEditable={false} style={{ textAlign: 'center', margin: '10px 0' }}>
            <img
              src={element.url}
              alt={element.alt || ''}
              style={{ 
                maxWidth: element.width ? `${element.width}px` : '100%', 
                height: element.height ? `${element.height}px` : 'auto',
                cursor: 'pointer',
                border: '2px solid transparent',
                transition: 'border-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.border = '2px solid #3b82f6'}
              onMouseLeave={(e) => e.target.style.border = '2px solid transparent'}
              draggable={false}
            />
            {/* Resize handles */}
            <div style={{ 
              display: 'inline-flex', 
              gap: '8px', 
              marginTop: '8px',
              fontSize: '12px'
            }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const currentWidth = element.width || 300;
                  const newWidth = Math.max(50, currentWidth - 20);
                  const path = ReactEditor.findPath(editor, element);
                  Transforms.setNodes(
                    editor,
                    { width: newWidth },
                    { at: path }
                  );
                }}
                style={{ padding: '4px 8px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px' }}
              >
                -
              </button>
              <span style={{ padding: '4px 8px', color: '#666' }}>
                {element.width || 'Auto'}px
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const currentWidth = element.width || 300;
                  const newWidth = Math.min(800, currentWidth + 20);
                  const path = ReactEditor.findPath(editor, element);
                  Transforms.setNodes(
                    editor,
                    { width: newWidth },
                    { at: path }
                  );
                }}
                style={{ padding: '4px 8px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px' }}
              >
                +
              </button>
            </div>
          </div>
        );
      default:
        return <p {...attributes} style={style}>{children}</p>;
    }
  }, [editor]);

  return (
    <div className="rich-text-editor">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      
      <div className="border border-gray-300 rounded-md">
        <Slate editor={editor} initialValue={slateValue} onChange={handleChange}>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-x-1 gap-y-2 p-2 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-1">
              <FormatButton format="bold" icon={<strong>B</strong>} title="Bold" />
              <FormatButton format="italic" icon={<em>I</em>} title="Italic" />
              <FormatButton format="underline" icon={<u>U</u>} title="Underline" />
            </div>
            
            <div className="border-l border-gray-300 pl-2 flex items-center gap-1">
              <FontFamilySelector availableFonts={availableFonts} title="Font Family" />
              <FontSizeSelector title="Font Size" />
            </div>
            
            <div className="border-l border-gray-300 pl-2 flex items-center gap-1">
              <ColorSelector format="textColor" title="Text Color" />
              <ColorSelector format="backgroundColor" title="Background Color" />
            </div>
            
            <div className="border-l border-gray-300 pl-2 flex items-center gap-1">
              <AlignButton alignment="left" icon="◀" title="Align Left" />
              <AlignButton alignment="center" icon="◐" title="Align Center" />
              <AlignButton alignment="right" icon="▶" title="Align Right" />
              <AlignButton alignment="justify" icon="⬌" title="Justify" />
            </div>
            
            <div className="border-l border-gray-300 pl-2 flex items-center gap-1">
              <ImageUploadButton title="Insert Image" />
            </div>
            
            {enableVariables && (
              <div className="border-l border-gray-300 pl-2">
                <select
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                  onChange={(e) => {
                    if (e.target.value) {
                      insertVariable(e.target.value);
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="">Insert Variable...</option>
                  {templateVariables.map(v => (
                    <option key={v.value} value={v.value}>{v.text}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Editor */}
          <Editable
            renderElement={renderElement}
            renderLeaf={renderLeaf}
            placeholder={placeholder}
            readOnly={disabled}
            className="p-3 min-h-48 outline-none prose prose-sm max-w-none"
            style={{ minHeight: `${height}px` }}
          />
        </Slate>
      </div>

      {enableVariables && (
        <div className="mt-2 text-sm text-gray-600">
          <p className="font-medium">Available variables:</p>
          <div className="flex flex-wrap gap-2 mt-1">
            {templateVariables.map((variable) => (
              <code 
                key={variable.value} 
                className="px-2 py-1 bg-gray-100 rounded text-xs"
              >
                {variable.value}
              </code>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default RichTextEditor;
