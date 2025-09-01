import React, { useState, useEffect, useCallback } from 'react';
import { X, Target, MessageSquare, Send } from '../../ui/icons';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card, CardContent } from '../../ui/card';
import { PriorityDisplay } from '../../ui/priority-input';
import { EnhancedPriorityModal } from '../../ui/enhanced-priority-modal';
import { useOrganizationSettings } from '../../../hooks/useOrganizationSettings';
import { getFramework } from '../../../utils/prioritizationFrameworks';
import { dashboardApi } from '../../../utils/dashboardApi';
import { API_BASE_URL } from '../../../utils/api';

/**
 * Review Modal Component - Brief content on left, prioritization and comments on right
 */
export function ReviewModal({ 
  brief, 
  user, 
  orgSettings, 
  isOpen, 
  onClose, 
  onSave, 
  onRefreshBriefs 
}) {
  const [priorityData, setPriorityData] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState(null);
  
  // For styled brief preview
  const { settings } = useOrganizationSettings(user);

  // Get the current prioritization framework - prefer selected framework, then orgSettings, then hook settings
  const defaultFrameworkId = orgSettings?.prioritization_framework || settings?.prioritization_framework || 'simple';
  const frameworkId = selectedFramework || defaultFrameworkId;
  const framework = getFramework(frameworkId);
  


  const loadComments = useCallback(async () => {
    if (!brief || !user) return;
    
    setIsLoadingComments(true);
    try {
      const commentsData = await dashboardApi.fetchBriefComments(user.orgId, brief.id);
      setComments(commentsData.comments || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setIsLoadingComments(false);
    }
  }, [brief, user]);

  useEffect(() => {
    if (brief && isOpen) {
      // Set initial priority data
      setPriorityData(brief.priority_data || (brief.priority ? { value: brief.priority } : null));
      
      // Load existing comments
      loadComments();
    }
  }, [brief, isOpen, loadComments]);

  const handleAddComment = async () => {
    if (!newComment.trim() || !brief || !user) return;

    setIsSubmitting(true);
    try {
      await dashboardApi.addBriefComment(user.orgId, brief.id, newComment.trim());
      setNewComment('');
      await loadComments(); // Refresh comments
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePriorityChange = (newPriorityData) => {
    if (framework.type === 'composite' || framework.type === 'matrix') {
      if (newPriorityData?.action === 'open_modal') {
        setShowPriorityModal(true);
        return;
      }
    }
    setPriorityData(newPriorityData);
  };

  const handlePriorityModalSave = (modalPriorityData, newSelectedFramework) => {
    setPriorityData(modalPriorityData);
    // Update the framework based on what was selected in the modal
    if (newSelectedFramework) {
      setSelectedFramework(newSelectedFramework);
    }
    setShowPriorityModal(false);
  };

  const handleSaveReview = async () => {
    if (!brief || !priorityData) return;

    setIsSubmitting(true);
    try {
      await onSave(brief.id, priorityData, frameworkId);
      if (onRefreshBriefs) {
        await onRefreshBriefs();
      }
      onClose();
    } catch (error) {
      console.error('Error saving review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };



  if (!isOpen || !brief) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Review Brief</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-600">Brief #{brief.id}</span>
                <span className="text-sm text-gray-400">•</span>
                <span className="text-sm text-gray-600">{brief.title || 'Untitled Brief'}</span>
                {brief.comment_count > 0 && (
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                    {brief.comment_count} comments
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Side - Brief Content */}
            <div className="flex-1 p-6 overflow-y-auto border-r border-gray-200">
              <div className="max-w-none">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Brief Content</h3>
                <StyledBriefPreview 
                  brief={brief} 
                  user={user}
                  settings={settings}
                />
              </div>
            </div>

            {/* Right Side - Prioritization & Comments */}
            <div className="w-96 p-6 overflow-y-auto bg-gray-50">
              <div className="space-y-6">
                {/* Prioritization Section */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="w-4 h-4 text-blue-600" />
                      <h4 className="font-medium text-gray-900">Prioritization</h4>
                    </div>
                    
                    <div className="space-y-3">
                      {priorityData ? (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <PriorityDisplay 
                            value={priorityData} 
                            frameworkId={frameworkId}
                            className="text-sm"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePriorityChange({ action: 'open_modal' })}
                            className="mt-2 w-full"
                          >
                            Change Priority
                          </Button>
                        </div>
                      ) : (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800 mb-2">No priority set</p>
                          <Button
                            size="sm"
                            onClick={() => handlePriorityChange({ action: 'open_modal' })}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Target className="w-3 h-3 mr-1" />
                            Set Priority
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Comments Section */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare className="w-4 h-4 text-blue-600" />
                      <h4 className="font-medium text-gray-900">Comments</h4>
                      {comments.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {comments.length}
                        </Badge>
                      )}
                    </div>

                    {/* Existing Comments */}
                    <div className="space-y-3 mb-4">
                      {isLoadingComments ? (
                        <div className="text-center py-4">
                          <div className="w-4 h-4 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                          <p className="text-xs text-gray-500 mt-2">Loading comments...</p>
                        </div>
                      ) : comments.length > 0 ? (
                        comments.map((comment) => (
                          <div key={comment.id} className="p-3 bg-white border border-gray-200 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-900">
                                {comment.reviewer_email || 'Reviewer'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(comment.created_at).toLocaleDateString()} at {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{comment.comment_text}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4">No comments yet</p>
                      )}
                    </div>

                    {/* Add New Comment */}
                    <div className="space-y-2">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                      />
                      <Button
                        size="sm"
                        onClick={handleAddComment}
                        disabled={!newComment.trim() || isSubmitting}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Send className="w-3 h-3 mr-1" />
                        {isSubmitting ? 'Adding...' : 'Add Comment'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              {priorityData ? 'Priority set' : 'Set priority to complete review'}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveReview}
                disabled={!priorityData || isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Target className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Saving...' : 'Complete Review'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Priority Modal */}
      {showPriorityModal && (
        <EnhancedPriorityModal
          isOpen={showPriorityModal}
          onClose={() => setShowPriorityModal(false)}
          onSave={handlePriorityModalSave}
          currentValue={priorityData}
          defaultFramework={defaultFrameworkId}
          enabledFrameworks={orgSettings?.enabled_prioritization_frameworks || settings?.enabled_prioritization_frameworks || ['simple', 'ice', 'moscow']}
          briefTitle={brief?.title || 'Untitled Brief'}
        />
      )}
    </>
  );
}

/**
 * Styled Brief Preview Component
 * Displays the fully styled brief content using the backend preview endpoint
 */
function StyledBriefPreview({ brief, user, settings }) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (brief?.summary_md && user?.orgId && settings) {
      // Generate preview URL with organization settings
      const params = new URLSearchParams({
        settings: JSON.stringify(settings),
        content: brief.summary_md
      });

      const url = `${API_BASE_URL}/api/orgs/${user.orgId}/briefs/preview?${params}`;
      setPreviewUrl(url);
      setIsLoading(false);
    } else if (!brief?.summary_md) {
      setError('No brief content available');
      setIsLoading(false);
    }
  }, [brief, user, settings]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 border border-gray-200 rounded-lg bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Loading styled preview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 border border-gray-200 rounded-lg bg-gray-50">
        <div className="text-center">
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <iframe
        src={previewUrl}
        className="w-full h-96 border-0"
        title="Styled Brief Preview"
        sandbox="allow-same-origin"
        onLoad={() => setIsLoading(false)}
        onError={() => setError('Failed to load preview')}
        style={{
          minHeight: 'calc(100vh - 400px)',
          maxHeight: 'calc(100vh - 400px)'
        }}
      />
    </div>
  );
}
