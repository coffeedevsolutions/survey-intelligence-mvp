import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { ScrollArea } from '../../../components/ui/scroll-area.jsx';
import { X, MessageSquare, Send, Mail, AlertCircle, Clock, CheckCircle } from '../../../components/ui/icons.jsx';
import { useNotifications } from '../../../components/ui/notifications.jsx';
import { dashboardApi } from '../../../utils/dashboardApi.js';

/**
 * Brief Comments Modal Component
 * Displays comments and allows adding new comments/resubmit requests
 */
export function BriefCommentsModal({ 
  isOpen, 
  onClose, 
  brief, 
  user, 
  onCommentAdded,
  onResubmitSent 
}) {
  const [comments, setComments] = useState([]);
  const [resubmitRequests, setResubmitRequests] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [resubmitComment, setResubmitComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('comments');
  const { showSuccess, showError } = useNotifications();

  // Load comments and resubmit requests when modal opens
  useEffect(() => {
    if (isOpen && brief) {
      fetchCommentsAndRequests();
    }
  }, [isOpen, brief]);

  const fetchCommentsAndRequests = async () => {
    if (!brief || !user?.orgId) return;
    
    setLoading(true);
    try {
      const [commentsData, resubmitData] = await Promise.all([
        dashboardApi.fetchBriefComments(user.orgId, brief.id),
        dashboardApi.fetchResubmitRequests(user.orgId, brief.id)
      ]);
      
      setComments(commentsData.comments || []);
      setResubmitRequests(resubmitData.requests || []);
    } catch (error) {
      console.error('Error fetching comments and requests:', error);
      showError('Failed to load comments and requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !brief || !user?.orgId) return;
    
    setSubmitting(true);
    try {
      const result = await dashboardApi.addBriefComment(user.orgId, brief.id, newComment.trim());
      
      setComments(prev => [result.comment, ...prev]);
      setNewComment('');
      showSuccess('Comment added successfully');
      
      if (onCommentAdded) {
        onCommentAdded(brief.id);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      showError('Failed to add comment: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendResubmitRequest = async () => {
    if (!resubmitComment.trim() || !brief || !user?.orgId) return;
    
    setSubmitting(true);
    try {
      const result = await dashboardApi.createResubmitRequest(user.orgId, brief.id, resubmitComment.trim());
      
      setResubmitRequests(prev => [result.resubmitRequest, ...prev]);
      setResubmitComment('');
      
      if (result.emailSent) {
        showSuccess('Resubmit request sent successfully');
      } else {
        showError('Resubmit request created but email failed to send: ' + (result.emailError || 'Unknown error'));
      }
      
      if (onResubmitSent) {
        onResubmitSent(brief.id);
      }
      
      // Switch to resubmit tab to show the new request
      setActiveTab('resubmit');
    } catch (error) {
      console.error('Error sending resubmit request:', error);
      showError('Failed to send resubmit request: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Brief Comments & Actions
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {brief?.title || 'Untitled Brief'} (#{brief?.id})
            </p>
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

        {/* Tabs */}
        <div className="flex border-b px-6">
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'comments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('comments')}
          >
            <MessageSquare className="w-4 h-4 inline mr-2" />
            Comments ({comments.length})
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'resubmit'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('resubmit')}
          >
            <Mail className="w-4 h-4 inline mr-2" />
            Resubmit Requests ({resubmitRequests.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Comments Tab */}
              {activeTab === 'comments' && (
                <div className="h-full flex flex-col">
                  {/* Add Comment Form */}
                  <Card className="mb-4">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Add Comment</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add your comment about this brief..."
                        className="w-full border border-gray-300 rounded-md px-3 py-2 h-24 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <div className="flex justify-end mt-3">
                        <Button
                          onClick={handleAddComment}
                          disabled={!newComment.trim() || submitting}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          {submitting ? 'Adding...' : 'Add Comment'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Comments List */}
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      All Comments ({comments.length})
                    </h3>
                    {comments.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No comments yet</p>
                        <p className="text-sm">Be the first to add a comment about this brief.</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-80">
                        <div className="space-y-3">
                          {comments.map((comment) => (
                            <Card key={comment.id} className="border-l-4 border-l-blue-500">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="text-sm font-medium text-gray-900">
                                    {comment.reviewer_email}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {formatDate(comment.created_at)}
                                  </div>
                                </div>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                  {comment.comment_text}
                                </p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </div>
              )}

              {/* Resubmit Tab */}
              {activeTab === 'resubmit' && (
                <div className="h-full flex flex-col">
                  {/* Resubmit Status */}
                  <Card className="mb-4">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        {brief?.can_resubmit ? (
                          <>
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                Resubmit Available
                              </p>
                              <p className="text-xs text-gray-600">
                                User email: {brief.user_email}
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-5 h-5 text-yellow-500" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                Resubmit Not Available
                              </p>
                              <p className="text-xs text-gray-600">
                                No email address captured for this submission
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Send Resubmit Request Form */}
                  {brief?.can_resubmit && (
                    <Card className="mb-4">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Send Resubmit Request</CardTitle>
                        <CardDescription className="text-xs">
                          This will send an email to {brief.user_email} requesting additional information
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <textarea
                          value={resubmitComment}
                          onChange={(e) => setResubmitComment(e.target.value)}
                          placeholder="Explain what additional information you need..."
                          className="w-full border border-gray-300 rounded-md px-3 py-2 h-24 resize-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                        <div className="flex justify-end mt-3">
                          <Button
                            onClick={handleSendResubmitRequest}
                            disabled={!resubmitComment.trim() || submitting}
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            <Mail className="w-4 h-4 mr-2" />
                            {submitting ? 'Sending...' : 'Send Resubmit Request'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Resubmit Requests List */}
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      Resubmit History ({resubmitRequests.length})
                    </h3>
                    {resubmitRequests.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Mail className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No resubmit requests sent</p>
                        <p className="text-sm">
                          {brief?.can_resubmit 
                            ? 'Send the first resubmit request to ask for more information.'
                            : 'Resubmit requests are not available for this brief.'}
                        </p>
                      </div>
                    ) : (
                      <ScrollArea className="h-80">
                        <div className="space-y-3">
                          {resubmitRequests.map((request) => (
                            <Card key={request.id} className="border-l-4 border-l-orange-500">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="text-sm font-medium text-gray-900">
                                      {request.reviewer_email}
                                    </div>
                                    <Badge 
                                      variant={request.request_status === 'sent' ? 'secondary' : 'outline'}
                                      className="text-xs"
                                    >
                                      <Clock className="w-3 h-3 mr-1" />
                                      {request.request_status}
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {formatDate(request.created_at)}
                                  </div>
                                </div>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap mb-2">
                                  {request.comment_text}
                                </p>
                                <div className="text-xs text-gray-500">
                                  Sent to: {request.user_email}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            className="px-6"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
