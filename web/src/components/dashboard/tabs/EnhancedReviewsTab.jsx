import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSubmenu } from '../../ui/dropdown-menu';
import { CheckCircle, Eye, FileText, Calendar, User, Target, Clock, Code, Globe, MoreHorizontal, Download, ChevronRight, File } from '../../ui/icons';
import { PriorityDisplay } from '../../ui/priority-input';
import { EnhancedPriorityModal } from '../../ui/enhanced-priority-modal';
import { getFramework } from '../../../utils/prioritizationFrameworks';
import { API_BASE_URL } from '../../../utils/api';

/**
 * Enhanced Reviews Tab Component with improved UX
 */
export function EnhancedReviewsTab({ briefsForReview, loading, onSubmitReview, onViewDetails, onViewDocument, user }) {
  const [orgSettings, setOrgSettings] = useState(null);
  const [priorityModal, setPriorityModal] = useState(null);
  const [selectedBriefs, setSelectedBriefs] = useState(new Set());

  // Fetch organization settings
  useEffect(() => {
    const fetchOrgSettings = async () => {
      if (!user?.orgId) return;
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/orgs/${user.orgId}/settings/branding`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setOrgSettings(data.settings || {});
        }
      } catch (error) {
        console.error('Error fetching org settings:', error);
      }
    };

    fetchOrgSettings();
  }, [user?.orgId]);

  // Get enabled frameworks and default
  const enabledFrameworks = orgSettings?.enabled_prioritization_frameworks || ['simple', 'ice', 'moscow'];
  const defaultFramework = orgSettings?.prioritization_framework || 'simple';

  const handleSetPriority = (brief) => {
    setPriorityModal({
      brief,
      currentValue: brief.priority_data || (brief.priority ? { value: brief.priority } : null),
      currentFramework: brief.framework_id || 'simple'
    });
  };

  const handleModalSave = async (priorityValue, frameworkId) => {
    if (!priorityModal) return;
    
    await onSubmitReview(priorityModal.brief.id, priorityValue, frameworkId);
    setPriorityModal(null);
  };

  // Sort briefs by date (newest first)
  const sortedBriefs = [...briefsForReview].sort((a, b) => {
    return new Date(b.created_at) - new Date(a.created_at);
  });

  // Bulk actions
  const handleSelectAll = () => {
    if (selectedBriefs.size === sortedBriefs.length) {
      setSelectedBriefs(new Set());
    } else {
      setSelectedBriefs(new Set(sortedBriefs.map(b => b.id)));
    }
  };

  const handleSelectBrief = (briefId) => {
    const newSelected = new Set(selectedBriefs);
    if (newSelected.has(briefId)) {
      newSelected.delete(briefId);
    } else {
      newSelected.add(briefId);
    }
    setSelectedBriefs(newSelected);
  };

  // Download handler function
  const handleDownloadBrief = async (brief, format) => {
    const timestamp = new Date().toISOString().slice(0, 10);
    let filename, content, mimeType;
    
    const briefContent = brief.summary_md || 'No content available';
    const briefHeader = `# ${brief.title || 'Untitled Brief'}

**Brief ID:** ${brief.id}
**Campaign:** ${brief.campaign_name || 'N/A'}
**Created:** ${new Date(brief.created_at).toLocaleDateString()}
${brief.reviewed_at ? `**Reviewed:** ${new Date(brief.reviewed_at).toLocaleDateString()}` : ''}

---

`;

    switch (format) {
      case 'html':
        filename = `brief-${brief.id}-${timestamp}.html`;
        content = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Project Brief - ${brief.title || 'Untitled'}</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
      max-width: 800px; 
      margin: 0 auto; 
      padding: 2rem; 
      line-height: 1.6;
      color: #1f2937;
    }
    h1 { color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; }
    h2 { color: #374151; margin-top: 2rem; }
    pre { white-space: pre-wrap; font-family: inherit; background: #f9fafb; padding: 1rem; border-radius: 0.375rem; }
    .brief-header { background: #f3f4f6; padding: 1rem; border-radius: 0.5rem; margin-bottom: 2rem; }
  </style>
</head>
<body>
  <div class="brief-header">
    <h1>${brief.title || 'Untitled Brief'}</h1>
    <p><strong>Brief ID:</strong> ${brief.id}</p>
    <p><strong>Campaign:</strong> ${brief.campaign_name || 'N/A'}</p>
    <p><strong>Created:</strong> ${new Date(brief.created_at).toLocaleDateString()}</p>
    ${brief.reviewed_at ? `<p><strong>Reviewed:</strong> ${new Date(brief.reviewed_at).toLocaleDateString()}</p>` : ''}
  </div>
  <pre>${briefContent}</pre>
</body>
</html>`;
        mimeType = 'text/html';
        break;
        
      case 'pdf':
        try {


          const apiUrl = API_BASE_URL || 'http://localhost:8787';
          const exportUrl = `${apiUrl}/api/orgs/${user?.orgId}/briefs/${brief.id}/export/pdf`;
          
          const response = await fetch(exportUrl, { 
            credentials: 'include',
            headers: {
              'Accept': 'application/pdf'
            }
          });
          
          if (!response.ok) throw new Error('PDF export failed');
          
          const blob = await response.blob();
          filename = `brief-${brief.id}-${timestamp}.pdf`;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          return;
        } catch (error) {
          console.error('PDF export failed:', error);
          alert('PDF export failed. Please try again.');
          return;
        }
        
      case 'docx':
        try {
          const apiUrl = API_BASE_URL || 'http://localhost:8787';
          const exportUrl = `${apiUrl}/api/orgs/${user?.orgId}/briefs/${brief.id}/export/docx`;
          
          const response = await fetch(exportUrl, { 
            credentials: 'include',
            headers: {
              'Accept': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            }
          });
          
          if (!response.ok) throw new Error('DOCX export failed');
          
          const blob = await response.blob();
          filename = `brief-${brief.id}-${timestamp}.docx`;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          return;
        } catch (error) {
          console.error('DOCX export failed:', error);
          alert('DOCX export failed. Please try again.');
          return;
        }
        
      default: // markdown
        filename = `brief-${brief.id}-${timestamp}.md`;
        content = briefHeader + briefContent;
        mimeType = 'text/markdown';
        break;
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card className="shadow-sm border">
        <CardContent className="p-12 text-center">
          <div className="w-8 h-8 border-3 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading briefs for review...</p>
        </CardContent>
      </Card>
    );
  }



  return (
    <>
      <div className="flex flex-col space-y-6">
        {/* Header with bulk actions - Survey Manager Style */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Brief Reviews
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Review and prioritize project briefs from survey responses
            </p>
          </div>
          <div className="flex items-center gap-3">
            {selectedBriefs.size > 0 && (
              <Button 
                onClick={() => {/* TODO: Implement bulk review */}}
                className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
              >
                <Target className="w-4 h-4 mr-2" />
                Review {selectedBriefs.size} Selected
              </Button>
            )}
            <Badge variant="outline" className="text-sm px-4 py-2">
              {briefsForReview.length} Total Briefs
            </Badge>
          </div>
        </div>

        {/* Modern Table Container - Survey Manager Style */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 border-b border-gray-200">
                  <TableHead className="w-12 pl-4">
                    <input
                      type="checkbox"
                      checked={selectedBriefs.size === sortedBriefs.length && sortedBriefs.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-sm">
                    Brief Details
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-sm">
                    Campaign
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-sm text-center">
                    Priority
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-sm text-center">
                    Status
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-sm text-center">
                    Framework
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-sm">
                    Last Activity
                  </TableHead>
                  <TableHead className="w-20 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedBriefs.map((brief) => (
                <BriefTableRow
                  key={brief.id}
                  brief={brief}
                  selected={selectedBriefs.has(brief.id)}
                  onSelect={() => handleSelectBrief(brief.id)}
                  onSetPriority={handleSetPriority}
                  onViewDetails={onViewDetails}
                  onViewDocument={onViewDocument}
                  onDownloadBrief={handleDownloadBrief}
                />
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Enhanced Priority Modal */}
      {priorityModal && (
        <EnhancedPriorityModal
          isOpen={true}
          onClose={() => setPriorityModal(null)}
          onSave={handleModalSave}
          enabledFrameworks={enabledFrameworks}
          defaultFramework={defaultFramework}
          currentValue={priorityModal.currentValue}
          currentFramework={priorityModal.currentFramework}
          briefTitle={priorityModal.brief.title || 'Untitled Brief'}
        />
      )}
    </>
  );
}





/**
 * Survey Manager Style Table Row Component
 */
function BriefTableRow({ brief, selected, onSelect, onSetPriority, onViewDetails, onViewDocument, onDownloadBrief }) {
  const isPending = brief.review_status === 'pending';

  return (
    <TableRow 
      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
        selected ? 'bg-blue-50' : 'bg-white'
      }`}
    >
      <TableCell className="pl-4">
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
        />
      </TableCell>
      
      <TableCell className="py-4 px-3">
        <div>
          <div className="font-semibold text-gray-900 text-sm mb-1">
            {brief.title || 'Untitled Brief'}
          </div>
          <div className="text-xs text-gray-600 leading-relaxed">
            Brief #{brief.id}
          </div>
          {brief.session_id && (
            <div className="text-xs text-gray-400 font-mono mt-1">
              Session: {brief.session_id.slice(0, 8)}...
            </div>
          )}
        </div>
      </TableCell>

      <TableCell className="py-4 px-3">
        {brief.campaign_name ? (
          <div>
            <Badge 
              variant="secondary" 
              className="text-xs bg-blue-50 text-blue-700 border border-blue-200 mb-1"
            >
              <Target className="w-2.5 h-2.5 mr-1" />
              {brief.campaign_name}
            </Badge>
          </div>
        ) : (
          <span className="text-xs text-gray-400 italic">
            No campaign
          </span>
        )}
      </TableCell>

      <TableCell className="py-4 px-3 text-center">
        <PriorityDisplay 
          frameworkId={brief.framework_id || 'simple'}
          value={brief.priority_data || (brief.priority ? { value: brief.priority } : null)}
          size="sm"
          showScore={true}
        />
      </TableCell>

      <TableCell className="py-4 px-3 text-center">
        <Badge 
          variant={isPending ? "secondary" : "default"}
          className={`text-xs ${
            isPending 
              ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' 
              : 'bg-green-100 text-green-800 border border-green-200'
          }`}
        >
          {isPending ? (
            <Clock className="w-3 h-3 mr-1" />
          ) : (
            <CheckCircle className="w-3 h-3 mr-1" />
          )}
          {isPending ? 'Pending' : 'Reviewed'}
        </Badge>
      </TableCell>

      <TableCell className="py-4 px-3 text-center">
        {brief.framework_id && brief.framework_id !== 'simple' ? (
          <Badge 
            variant="outline" 
            className="text-xs bg-purple-100 text-purple-800 border border-purple-200"
          >
            {getFramework(brief.framework_id).name}
          </Badge>
        ) : (
          <span className="text-xs text-gray-400 italic">
            Simple
          </span>
        )}
      </TableCell>

      <TableCell className="py-4 px-3">
        <div className="text-xs text-gray-600">
          <div className="flex items-center gap-1 mb-1">
            <Calendar className="w-3 h-3" />
            Created {new Date(brief.created_at).toLocaleDateString()}
          </div>
          {brief.reviewed_at && (
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Reviewed {new Date(brief.reviewed_at).toLocaleDateString()}
            </div>
          )}
          {brief.reviewed_by_email && (
            <div className="flex items-center gap-1 mt-1">
              <User className="w-3 h-3" />
              {brief.reviewed_by_email}
            </div>
          )}
        </div>
      </TableCell>

      <TableCell className="py-4 px-3 text-center">
        <div className="flex items-center justify-center gap-2">
          {isPending && (
            <Button
              size="sm"
              onClick={() => onSetPriority(brief)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs px-2 py-1"
            >
              <Target className="w-3 h-3 mr-1" />
              Review
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuItem onClick={() => onViewDetails(brief)}>
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewDocument(brief)}>
              <FileText className="w-4 h-4 mr-2" />
              Styled View
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSubmenu 
              trigger={
                <>
                  <Download className="w-4 h-4" />
                  Download
                </>
              }
            >
              <DropdownMenuItem onClick={async () => {
                await onDownloadBrief(brief, 'html');
              }}>
                <Globe className="w-4 h-4 mr-2" />
                Styled HTML
              </DropdownMenuItem>
              <DropdownMenuItem onClick={async () => {
                await onDownloadBrief(brief, 'markdown');
              }}>
                <Code className="w-4 h-4 mr-2" />
                Plain Markdown
              </DropdownMenuItem>
              <DropdownMenuItem onClick={async () => {
                await onDownloadBrief(brief, 'pdf');
              }}>
                <File className="w-4 h-4 mr-2" />
                PDF Document
              </DropdownMenuItem>
              <DropdownMenuItem onClick={async () => {
                await onDownloadBrief(brief, 'docx');
              }}>
                <FileText className="w-4 h-4 mr-2" />
                Word Document
              </DropdownMenuItem>
            </DropdownMenuSubmenu>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}
