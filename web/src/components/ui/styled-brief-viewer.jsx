import { useState } from 'react';
import { Button } from './button';
import { Modal } from './modal';
import { Eye, Download, ExternalLink } from './icons';
import { useOrganizationSettings } from '../../hooks/useOrganizationSettings';
import { EnhancedDownloadButton } from './enhanced-download';

/**
 * Styled Brief Viewer Component
 * Displays briefs with organization branding and styling
 */
export function StyledBriefViewer({ brief, user, trigger, title }) {
  const [isOpen, setIsOpen] = useState(false);
  const { settings } = useOrganizationSettings(user);

  const openStyledBrief = () => {
    if (!brief?.summary_md) {
      console.error('No brief content available');
      return;
    }

    if (!user?.orgId) {
      console.error('Cannot open styled brief: user or orgId is null');
      return;
    }

    // Use the organization's preview endpoint with current settings
    const params = new URLSearchParams({
      settings: JSON.stringify(settings || {}),
      content: brief.summary_md
    });

    const previewUrl = `http://localhost:8787/api/orgs/${user.orgId}/briefs/preview?${params}`;
    
    // Open preview in new window
    const newWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
    newWindow.location.href = previewUrl;
  };

  return (
    <>
      {trigger ? (
        <div onClick={() => setIsOpen(true)}>
          {trigger}
        </div>
      ) : (
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setIsOpen(true)}
        >
          <Eye style={{ width: '14px', height: '14px', marginRight: '4px' }} />
          View Styled Brief
        </Button>
      )}

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <div className="w-full max-w-4xl bg-white rounded-lg shadow-xl">
          <div className="flex justify-between items-center p-6 border-b">
            <h2 className="text-xl font-semibold">
              {title || brief?.title || 'Project Brief'}
            </h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={openStyledBrief}
              >
                <ExternalLink style={{ width: '14px', height: '14px', marginRight: '4px' }} />
                Open in New Window
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                ✕
              </Button>
            </div>
          </div>
          
          <div className="p-6">
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600">
                <strong>Preview:</strong> This shows how your brief will appear with your organization's custom styling.
                Click "Open in New Window" to see the full styled version.
              </p>
            </div>
            
            <div 
              className="border rounded-lg p-4 bg-white max-h-96 overflow-y-auto"
              style={{ fontFamily: settings?.font_family || 'Inter, sans-serif' }}
            >
              <div 
                className="prose max-w-none"
                style={{ 
                  color: settings?.primary_color || '#1f2937',
                  lineHeight: '1.6'
                }}
              >
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {brief?.summary_md || 'No brief content available'}
                </pre>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
              <EnhancedDownloadButton
                briefId={brief?.id}
                orgId={user?.orgId}
                briefContent={brief?.summary_md}
                sessionId={brief?.session_id}
                variant="outline"
                size="sm"
              />
              <Button
                variant="default"
                onClick={openStyledBrief}
              >
                <ExternalLink style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                View Full Styled Brief
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}

/**
 * Quick Styled Brief Button
 * For use in tables and compact layouts
 */
export function StyledBriefButton({ brief, user, variant = "outline", size = "sm" }) {
  const { settings } = useOrganizationSettings(user);

  const openStyledBrief = () => {
    if (!brief?.summary_md) {
      console.error('No brief content available');
      return;
    }

    if (!user?.orgId) {
      console.error('Cannot open styled brief: user or orgId is null');
      return;
    }

    const params = new URLSearchParams({
      settings: JSON.stringify(settings || {}),
      content: brief.summary_md
    });

    const previewUrl = `http://localhost:8787/api/orgs/${user.orgId}/briefs/preview?${params}`;
    
    const newWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
    newWindow.location.href = previewUrl;
  };

  return (
    <Button 
      variant={variant}
      size={size}
      onClick={openStyledBrief}
    >
      <Eye style={{ width: '14px', height: '14px', marginRight: '4px' }} />
      Styled View
    </Button>
  );
}

/**
 * Inline Styled Brief Display
 * For showing brief content within cards/sections
 */
export function InlineStyledBrief({ brief, user, maxHeight = "300px" }) {
  const { settings } = useOrganizationSettings(user);

  if (!brief?.summary_md) {
    return (
      <div className="text-center py-8 text-gray-500">
        No brief content available
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-8 text-gray-500">
        Loading user information...
      </div>
    );
  }

  return (
    <div 
      className="border rounded-lg p-4 bg-white overflow-y-auto"
      style={{ 
        maxHeight,
        fontFamily: settings?.font_family || 'Inter, sans-serif',
        backgroundColor: settings?.theme === 'minimal' ? '#ffffff' : '#f9fafb'
      }}
    >
      <div 
        className="prose max-w-none"
        style={{ 
          color: settings?.primary_color || '#1f2937',
          lineHeight: '1.6'
        }}
      >
        <pre 
          className="whitespace-pre-wrap font-sans text-sm leading-relaxed"
          style={{ 
            fontFamily: 'inherit',
            background: 'transparent',
            border: 'none',
            padding: 0,
            margin: 0
          }}
        >
          {brief.summary_md}
        </pre>
      </div>
    </div>
  );
}
