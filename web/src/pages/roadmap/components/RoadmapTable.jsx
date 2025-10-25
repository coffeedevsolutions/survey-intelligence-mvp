import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSubmenu } from '../../../components/ui/dropdown-menu';
import { CheckCircle, Eye, FileText, Calendar, User, Target, Clock, Code, Globe, MoreHorizontal, Download, ChevronRight, File, MessageSquare, Mail, Share2, GripVertical, Archive } from '../../../components/ui/icons';
import { PriorityDisplay } from '../../../components/ui/priority-input';
import { EnhancedPriorityModal } from '../../../components/ui/enhanced-priority-modal';
import { BriefCommentsModal } from '../../documentation/modals/BriefCommentsModal';
import { ReviewModal } from '../../documentation/modals/ReviewModal';
import { getFramework } from '../../../utils/prioritizationFrameworks';
import { API_BASE_URL } from '../../../utils/api';
import { dashboardUtils } from '../../../utils/dashboardApi';
import { useNotifications } from '../../../components/ui/notifications';
import { useSolutionGenerationContext } from '../../../hooks/useSolutionGenerationContext';
import { SolutionGenerationQueue } from '../../solutionmgmt/components/SolutionGenerationQueue';
import { PMTemplateSelector } from '../../solutionmgmt/components/PMTemplateSelector';

/**
 * Sortable Row Component
 */
function SortableRow({ brief, selected, onSelect, onViewDetails, onViewDocument, onDownloadBrief, onShowComments, onOpenReview, onShareBrief, onGenerateSolution, user, enabledFrameworks, defaultFramework }) {
  const navigate = useNavigate();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: brief.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow 
      ref={setNodeRef}
      style={style}
      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
        selected ? 'bg-blue-50' : 'bg-white'
      } ${isDragging ? 'shadow-lg' : ''}`}
    >
      <TableCell className="pl-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={onSelect}
            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
          />
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </TableCell>
      
      <TableCell className="py-4 px-3 text-center">
        <div className="text-lg font-bold text-blue-600">
          {brief.rank || 'N/A'}
        </div>
      </TableCell>
      
      <TableCell className="py-4 px-3">
        <div>
          <div className="font-semibold text-gray-900 text-sm mb-1 flex items-center gap-2">
            {brief.title || 'Untitled Brief'}
            {brief.comment_count > 0 && (
              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border border-blue-200">
                <MessageSquare className="w-2.5 h-2.5 mr-1" />
                {brief.comment_count}
              </Badge>
            )}
          </div>
          <div className="text-xs text-gray-500">
            Brief #{brief.id}
          </div>
        </div>
      </TableCell>
      
      <TableCell className="py-4 px-3">
        <div className="text-sm text-gray-600">
          {brief.campaign_name || 'No Campaign'}
        </div>
      </TableCell>
      
      <TableCell className="w-32 py-4 px-3 text-center">
        {(() => {
          const frameworkId = brief.framework_id || brief.priority_data?.framework_id || defaultFramework;
          const priorityValue = brief.priority_data || (brief.priority ? { value: brief.priority } : null);
          
          // Debug logging for first few items
          if (brief.id <= 3) {
            console.log(`🔍 Priority Debug for Brief ${brief.id}:`, {
              frameworkId,
              priorityValue,
              briefFrameworkId: brief.framework_id,
              briefPriorityData: brief.priority_data,
              briefPriority: brief.priority,
              defaultFramework
            });
          }
          
          return (
            <PriorityDisplay 
              frameworkId={frameworkId}
              value={priorityValue}
              size="sm"
            />
          );
        })()}
      </TableCell>
      
      <TableCell className="py-4 px-3 text-center">
        <Badge 
          variant={
            brief.review_status === 'pending' ? 'destructive' : 
            brief.review_status === 'solutioned' ? 'default' : 
            'default'
          }
          className={`text-xs ${
            brief.review_status === 'solutioned' ? 'bg-green-100 !text-green-900 border border-green-200 hover:bg-green-800 hover:!text-white transition-colors' : ''
          }`}
        >
          {brief.review_status === 'pending' ? 'Pending' : 
           brief.review_status === 'solutioned' ? 'Solutioned' : 
           'Reviewed'}
        </Badge>
      </TableCell>
      
      <TableCell className="py-4 px-3 text-center">
        {(() => {
          const frameworkId = brief.framework_id || brief.priority_data?.framework_id;
          
          // Debug logging for first few items
          if (brief.id <= 3) {
            console.log(`🔍 Framework Debug for Brief ${brief.id}:`, {
              frameworkId,
              briefFrameworkId: brief.framework_id,
              briefPriorityDataFrameworkId: brief.priority_data?.framework_id,
              frameworkName: frameworkId ? getFramework(frameworkId)?.name : 'Unknown'
            });
          }
          
          if (frameworkId && frameworkId !== 'simple') {
            return (
              <Badge 
                variant="outline" 
                className="text-xs bg-purple-100 text-purple-800 border border-purple-200"
              >
                {getFramework(frameworkId).name}
              </Badge>
            );
          } else {
            return (
              <span className="text-xs text-gray-400 italic">
                Simple
              </span>
            );
          }
        })()}
      </TableCell>
      
      <TableCell className="py-4 px-3">
        <div className="text-sm text-gray-600">
          {new Date(brief.created_at).toLocaleDateString()}
        </div>
      </TableCell>
      
      <TableCell className="py-4 px-3 text-center">
        {brief.review_status === 'solutioned' ? (
          <Button
            onClick={() => navigate(brief.solution_slug ? `/solution/${brief.solution_slug}` : '/solution-management')}
            size="sm"
            variant="outline"
            className="h-8 px-3 text-xs bg-green-100 hover:bg-green-200 text-green-700 border-green-300"
          >
            View Solution
          </Button>
        ) : (
          <Button
            onClick={() => onGenerateSolution(brief)}
            size="sm"
            variant="outline"
            className="h-8 px-3 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
          >
            Generate Solution
          </Button>
        )}
      </TableCell>
      
      <TableCell className="py-4 px-3 text-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 w-8 p-0 bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {/* TODO: Implement archive functionality */}}>
              <Archive className="w-4 h-4 mr-2" />
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

/**
 * Roadmap Table Component with Drag and Drop
 */
export function RoadmapTable({ briefsForReview, loading, onSubmitReview, onViewDetails, onViewDocument, user, onRefreshBriefs }) {
  const { showSuccess, showError } = useNotifications();
  const { addGeneratingItem, generatingItems, removeGeneratingItem } = useSolutionGenerationContext();
  const navigate = useNavigate();
  
  const [orgSettings, setOrgSettings] = useState(null);
  const [priorityModal, setPriorityModal] = useState(null);
  const [selectedBriefs, setSelectedBriefs] = useState(new Set());
  const [commentsModal, setCommentsModal] = useState(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [briefForSolution, setBriefForSolution] = useState(null);
  const [reviewModal, setReviewModal] = useState(null);
  const [roadmapItems, setRoadmapItems] = useState([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get enabled frameworks and default
  const enabledFrameworks = orgSettings?.enabled_prioritization_frameworks || ['simple', 'ice', 'moscow'];
  const defaultFramework = orgSettings?.prioritization_framework || 'simple';

  // Initialize roadmap items from briefs
  useEffect(() => {
    if (briefsForReview && briefsForReview.length > 0) {
      // Filter for reviewed and solutioned briefs with priority data
      const filteredBriefs = briefsForReview.filter(brief => {
        const hasPriority = brief.priority_data?.value || brief.priority;
        return (brief.review_status === 'reviewed' || brief.review_status === 'solutioned') && hasPriority;
      });
      
      // Deduplicate by brief ID (keep the most recent one)
      const uniqueBriefs = filteredBriefs.reduce((acc, brief) => {
        const existingBrief = acc.find(b => b.id === brief.id);
        if (!existingBrief) {
          acc.push(brief);
        } else {
          // Keep the one with the most recent solution_slug or created_at
          const currentIsNewer = brief.solution_slug && (!existingBrief.solution_slug || 
            new Date(brief.created_at) > new Date(existingBrief.created_at));
          if (currentIsNewer) {
            const index = acc.findIndex(b => b.id === brief.id);
            acc[index] = brief;
          }
        }
        return acc;
      }, []);
      
      // Sort by roadmap_rank first (if exists), then by priority, then by creation date
      const sortedBriefs = [...uniqueBriefs].sort((a, b) => {
        // If both have roadmap_rank, sort by that
        if (a.roadmap_rank !== null && b.roadmap_rank !== null) {
          return a.roadmap_rank - b.roadmap_rank;
        }
        
        // If only one has roadmap_rank, prioritize it
        if (a.roadmap_rank !== null && b.roadmap_rank === null) {
          return -1;
        }
        if (a.roadmap_rank === null && b.roadmap_rank !== null) {
          return 1;
        }
        
        // If neither has roadmap_rank, sort by priority and creation date
        const aPriority = a.priority_data?.value || a.priority || 999;
        const bPriority = b.priority_data?.value || b.priority || 999;
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        return new Date(a.created_at) - new Date(b.created_at);
      });
      
      // Assign ranks based on sorted order
      const rankedBriefs = sortedBriefs.map((brief, index) => ({
        ...brief,
        rank: brief.roadmap_rank || (index + 1)
      }));
      
      setRoadmapItems(rankedBriefs);
      
      // Debug logging
      console.log('🗺️ Roadmap Debug:', {
        totalBriefs: briefsForReview.length,
        reviewedBriefs: briefsForReview.filter(b => b.review_status === 'reviewed').length,
        prioritizedBriefs: rankedBriefs.length,
        sampleBriefs: briefsForReview.slice(0, 3).map(b => ({
          id: b.id,
          review_status: b.review_status,
          priority_data: b.priority_data,
          priority: b.priority,
          roadmap_rank: b.roadmap_rank,
          hasPriority: !!(b.priority_data?.value || b.priority)
        }))
      });
    }
  }, [briefsForReview]);

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

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const newItems = arrayMove(roadmapItems, 
        roadmapItems.findIndex((item) => item.id === active.id),
        roadmapItems.findIndex((item) => item.id === over.id)
      );
      
      // Update ranks locally first
      const updatedItems = newItems.map((item, index) => ({
        ...item,
        rank: index + 1
      }));
      
      setRoadmapItems(updatedItems);
      
      // Save rank changes to database
      try {
        const briefRanks = updatedItems.map((item, index) => ({
          briefId: item.id,
          rank: index + 1
        }));
        
        const response = await fetch(`${API_BASE_URL}/api/briefs/orgs/${user.orgId}/briefs/ranks`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ briefRanks })
        });
        
        if (!response.ok) {
          throw new Error('Failed to save rank changes');
        }
        
        showSuccess('Roadmap order updated and saved successfully!');
        
      } catch (error) {
        console.error('❌ Error saving roadmap ranks:', error);
        showError('Failed to save roadmap order. Please try again.');
      }
    }
  };

  const handleModalSave = async (priorityValue, frameworkId) => {
    if (!priorityModal) return;
    
    await onSubmitReview(priorityModal.brief.id, priorityValue, frameworkId);
    setPriorityModal(null);
  };

  const handleShowComments = (brief) => {
    setCommentsModal(brief);
  };

  const handleCommentAdded = () => {
    if (onRefreshBriefs) {
      onRefreshBriefs();
    }
  };

  const handleResubmitSent = () => {
    if (onRefreshBriefs) {
      onRefreshBriefs();
    }
  };

  const handleOpenReview = (brief) => {
    setReviewModal(brief);
  };

  const handleShareBrief = async (brief) => {
    try {
      const result = await dashboardUtils.createQuickShareLink(brief.id);
      if (result?.success) {
        showSuccess('Share link created and copied to clipboard!');
      } else {
        showError(`Failed to create share link: ${result?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating share link:', error);
      showError(`Failed to create share link: ${error.message}`);
    }
  };

  const handleGenerateSolution = async (brief) => {
    setBriefForSolution(brief);
    setShowTemplateSelector(true);
  };

  const handleGenerateWithTemplate = async (templateId) => {
    try {
      const brief = briefForSolution;
      
      // Close the modal immediately
      setShowTemplateSelector(false);
      setBriefForSolution(null);
      
      addGeneratingItem(
        brief.id, 
        brief.title || `Brief #${brief.id}`,
        brief.description || brief.content?.substring(0, 100) + '...'
      );

      // Show enhanced success toast with navigation link
      const toastContent = (
        <div className="flex items-center justify-between w-full">
          <div>
            <p className="font-medium">Generating solution breakdown...</p>
            <p className="text-sm text-gray-600">This may take 15-20 seconds</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/solution-management')}
            className="ml-3 text-xs"
          >
            View Progress
          </Button>
        </div>
      );
      
      showSuccess(toastContent);
      
      const response = await fetch(`${API_BASE_URL}/api/solutioning/orgs/${user.orgId}/solutions/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ 
          briefId: brief.id,
          templateId: templateId 
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to generate solution');
      }

      const solutionData = await response.json();
      
      // Show success toast with link to the newly created solution
      const successToastContent = (
        <div className="flex items-center justify-between w-full">
          <div>
            <p className="font-medium">Solution generated successfully!</p>
            <p className="text-sm text-gray-600">Click to view your new solution</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/solution/${solutionData.solution.slug}`)}
            className="ml-3 text-xs"
          >
            View Solution
          </Button>
        </div>
      );
      
      showSuccess(successToastContent);
      
      // Refresh briefs to update the status
      if (onRefreshBriefs) {
        onRefreshBriefs();
      }
    } catch (error) {
      console.error('Error generating solution:', error);
      showError(`Failed to generate solution: ${error.message}`);
    }
  };

  const handleSelectAll = () => {
    if (selectedBriefs.size === roadmapItems.length) {
      setSelectedBriefs(new Set());
    } else {
      setSelectedBriefs(new Set(roadmapItems.map(b => b.id)));
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

  const handleDownloadBrief = async (brief, format) => {
    const timestamp = new Date().toISOString().slice(0, 10);
    let filename, content, mimeType;
    
    const briefContent = brief.summary_md || 'No content available';
    const briefHeader = `# ${brief.title || 'Untitled Brief'}

**Brief ID:** ${brief.id}
**Campaign:** ${brief.campaign_name || 'N/A'}
**Created:** ${new Date(brief.created_at).toLocaleDateString()}
**Priority Rank:** ${brief.rank || 'N/A'}

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
    <p><strong>Priority Rank:</strong> ${brief.rank || 'N/A'}</p>
  </div>
  <pre>${briefContent}</pre>
</body>
</html>`;
        mimeType = 'text/html';
        break;
        
      case 'pdf':
        try {
          const apiUrl = API_BASE_URL || 'http://localhost:8787';
          const exportUrl = `${apiUrl}/api/briefs/orgs/${user?.orgId}/briefs/${brief.id}/export/pdf`;
          
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
          const exportUrl = `${apiUrl}/api/briefs/orgs/${user?.orgId}/briefs/${brief.id}/export/docx`;
          
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
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner>Loading roadmap...</LoadingSpinner>
      </div>
    );
  }

  return (
    <>
      {/* Solution Generation Queue */}
      <SolutionGenerationQueue 
        generatingItems={generatingItems}
        onViewSolutions={() => navigate('/solution-management')}
        onRemoveItem={removeGeneratingItem}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold">Project Roadmap</CardTitle>
              <CardDescription>
                Drag and drop items to reorder your project priorities
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm px-4 py-2">
                {roadmapItems.length} Prioritized Items
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="overflow-x-auto">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 border-b border-gray-200">
                      <TableHead className="w-12 pl-4">
                        <input
                          type="checkbox"
                          checked={selectedBriefs.size === roadmapItems.length && roadmapItems.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                        />
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 text-sm">
                        Rank
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 text-sm">
                        Brief Title
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 text-sm">
                        Campaign
                      </TableHead>
                      <TableHead className="w-32 font-semibold text-gray-700 text-sm text-center">
                        Priority
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 text-sm text-center">
                        Status
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 text-sm text-center">
                        Framework
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 text-sm">
                        Created
                      </TableHead>
                      <TableHead className="w-32 text-center font-semibold text-gray-700 text-sm">
                        Solution
                      </TableHead>
                      <TableHead className="w-20 text-center font-semibold text-gray-700 text-sm">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SortableContext items={roadmapItems.map(item => item.id)} strategy={verticalListSortingStrategy}>
                      {roadmapItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-12">
                            <div className="flex flex-col items-center">
                              <Target className="w-12 h-12 text-gray-300 mb-4" />
                              <h3 className="text-lg font-medium text-gray-900 mb-2">
                                No prioritized briefs found
                              </h3>
                              <p className="text-gray-500">
                                Review and prioritize briefs in the Briefs & Reviews section to see them here.
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        roadmapItems.map((brief) => (
                          <SortableRow
                            key={brief.id}
                            brief={brief}
                            selected={selectedBriefs.has(brief.id)}
                            onSelect={() => handleSelectBrief(brief.id)}
                            onViewDetails={onViewDetails}
                            onViewDocument={onViewDocument}
                            onDownloadBrief={handleDownloadBrief}
                            onShowComments={handleShowComments}
                            onOpenReview={handleOpenReview}
                            onShareBrief={handleShareBrief}
                            onGenerateSolution={handleGenerateSolution}
                            user={user}
                            enabledFrameworks={enabledFrameworks}
                            defaultFramework={defaultFramework}
                          />
                        ))
                      )}
                    </SortableContext>
                  </TableBody>
                </Table>
              </DndContext>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Priority Modal */}
      {priorityModal && (
        <EnhancedPriorityModal
          isOpen={!!priorityModal}
          onClose={() => setPriorityModal(null)}
          onSave={handleModalSave}
          enabledFrameworks={enabledFrameworks}
          defaultFramework={defaultFramework}
          currentValue={priorityModal.currentValue}
          currentFramework={priorityModal.currentFramework}
          briefTitle={priorityModal.brief.title || 'Untitled Brief'}
        />
      )}

      {/* Comments Modal */}
      {commentsModal && (
        <BriefCommentsModal
          isOpen={!!commentsModal}
          onClose={() => setCommentsModal(null)}
          brief={commentsModal}
          user={user}
          onCommentAdded={handleCommentAdded}
          onResubmitSent={handleResubmitSent}
        />
      )}

      {/* Review Modal */}
      {reviewModal && (
        <ReviewModal
          isOpen={!!reviewModal}
          onClose={() => setReviewModal(null)}
          brief={reviewModal}
          user={user}
          onSubmitReview={onSubmitReview}
          onRefreshBriefs={onRefreshBriefs}
        />
      )}

      {/* Template Selector Modal */}
      {showTemplateSelector && briefForSolution && (
        <PMTemplateSelector
          isOpen={showTemplateSelector}
          onClose={() => {
            setShowTemplateSelector(false);
            setBriefForSolution(null);
          }}
          onConfirm={handleGenerateWithTemplate}
          briefTitle={briefForSolution?.title || 'Project Brief'}
        />
      )}
    </>
  );
}
