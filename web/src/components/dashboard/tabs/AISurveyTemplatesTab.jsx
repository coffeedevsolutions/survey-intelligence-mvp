/**
 * AI Survey Templates Tab
 * Manage goal-based AI survey templates
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../../ui/card.jsx';
import { Button } from '../../ui/button.jsx';
import { useNotifications } from '../../ui/notifications.jsx';
import { Plus, Settings, Eye, Copy, Trash2 } from '../../ui/icons.jsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

const TEMPLATE_CATEGORIES = [
  { value: 'general', label: 'General Purpose' },
  { value: 'it_support', label: 'IT Support' },
  { value: 'requirements', label: 'Requirements Gathering' },
  { value: 'feedback', label: 'Feedback Collection' },
  { value: 'assessment', label: 'Assessment' },
  { value: 'troubleshooting', label: 'Troubleshooting' }
];

const MODEL_OPTIONS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & Cost-effective)', cost: '$0.15/$0.60 per 1K tokens' },
  { value: 'gpt-4o', label: 'GPT-4o (Premium Quality)', cost: '$5/$15 per 1K tokens' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Basic)', cost: '$0.50/$1.50 per 1K tokens' }
];

export function AISurveyTemplatesTab({ user }) {
  const [templates, setTemplates] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  
  const { showSuccess, showError } = useNotifications();

  useEffect(() => {
    if (user?.orgId) {
      fetchTemplates();
    }
  }, [user?.orgId, selectedCategory]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const categoryParam = selectedCategory !== 'all' ? `?category=${selectedCategory}` : '';
      const response = await fetch(
        `${API_BASE_URL}/api/orgs/${user.orgId}/ai-templates${categoryParam}`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      } else {
        showError('Failed to load AI survey templates');
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      showError('Failed to load AI survey templates');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setShowCreateModal(true);
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setShowCreateModal(true);
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('Are you sure you want to delete this AI template?')) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/orgs/${user.orgId}/ai-templates/${templateId}`,
        {
          method: 'DELETE',
          credentials: 'include'
        }
      );

      if (response.ok) {
        showSuccess('AI template deleted successfully');
        fetchTemplates();
      } else {
        showError('Failed to delete AI template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      showError('Failed to delete AI template');
    }
  };

  if (loading) {
    return <div className="p-6">Loading AI survey templates...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Survey Templates</h2>
          <p className="text-gray-600 mt-1">
            Create intelligent survey templates that adapt questions based on goals and context
          </p>
        </div>
        <Button 
          onClick={handleCreateTemplate}
          className="bg-blue-600 text-white flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create AI Template
        </Button>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedCategory === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Templates
        </button>
        {TEMPLATE_CATEGORIES.map(category => (
          <button
            key={category.value}
            onClick={() => setSelectedCategory(category.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === category.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-gray-500 mb-4">
            <Settings className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No AI Templates Yet</h3>
            <p>Create your first AI survey template to get started with intelligent surveys.</p>
          </div>
          <Button onClick={handleCreateTemplate} className="bg-blue-600 text-white">
            Create Your First AI Template
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(template => (
            <AITemplateCard
              key={template.id}
              template={template}
              onEdit={() => handleEditTemplate(template)}
              onDelete={() => handleDeleteTemplate(template.id)}
              onView={() => {/* Implement view details */}}
              onCopy={() => {/* Implement copy template */}}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <AITemplateModal
          template={editingTemplate}
          orgId={user.orgId}
          onClose={() => setShowCreateModal(false)}
          onSave={() => {
            setShowCreateModal(false);
            showSuccess(editingTemplate ? 'Template updated successfully' : 'Template created successfully');
            fetchTemplates();
          }}
          showError={showError}
        />
      )}
    </div>
  );
}

/**
 * AI Template Card Component
 */
function AITemplateCard({ template, onEdit, onDelete, onView, onCopy }) {
  const getCategoryColor = (category) => {
    const colors = {
      'it_support': 'bg-red-100 text-red-800',
      'requirements': 'bg-blue-100 text-blue-800',
      'feedback': 'bg-green-100 text-green-800',
      'assessment': 'bg-purple-100 text-purple-800',
      'troubleshooting': 'bg-orange-100 text-orange-800',
      'general': 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors.general;
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{template.name}</h3>
          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(template.category)}`}>
            {TEMPLATE_CATEGORIES.find(c => c.value === template.category)?.label || template.category}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onView}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-green-600 transition-colors"
            title="Edit Template"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={onCopy}
            className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
            title="Copy Template"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
            title="Delete Template"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{template.description}</p>

      <div className="space-y-3">
        <div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Survey Goal</div>
          <div className="text-sm text-gray-900 line-clamp-2">{template.survey_goal}</div>
        </div>

        <div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Target Outcome</div>
          <div className="text-sm text-gray-900 line-clamp-2">{template.target_outcome}</div>
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            {template.min_questions}-{template.max_questions} questions
          </div>
          <div className="text-xs text-gray-500">
            {template.model_name}
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * AI Template Creation/Edit Modal
 */
function AITemplateModal({ template, orgId, onClose, onSave, showError }) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    description: template?.description || '',
    category: template?.category || 'general',
    survey_goal: template?.survey_goal || '',
    target_outcome: template?.target_outcome || '',
    context_description: template?.context_description || '',
    ai_instructions: template?.ai_instructions || '',
    first_question_prompt: template?.first_question_prompt || '',
    follow_up_strategy: template?.follow_up_strategy || '',
    max_questions: template?.max_questions || 8,
    min_questions: template?.min_questions || 3,
    brief_template: template?.brief_template || '',
    model_name: template?.model_name || 'gpt-4o-mini',
    temperature: template?.temperature || 0.3
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = template 
        ? `${API_BASE_URL}/api/orgs/${orgId}/ai-templates/${template.id}`
        : `${API_BASE_URL}/api/orgs/${orgId}/ai-templates`;
      
      const method = template ? 'PUT' : 'POST';

      // Prepare form data with proper JSON fields
      const submitData = {
        ...formData,
        brief_sections: {
          sections: ["overview", "details", "recommendations", "next_steps"],
          required_facts: formData.survey_goal.toLowerCase().includes('support') 
            ? ["problem_description", "impact", "urgency"]
            : ["goal", "requirements", "success_criteria"]
        },
        success_criteria: {
          completion_criteria: ["goal_understood", "sufficient_details", "actionable_outcome"],
          success_indicators: ["clear_problem_definition", "measurable_success_criteria"]
        }
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(submitData)
      });

      if (response.ok) {
        onSave();
      } else {
        const error = await response.json();
        showError(error.message || 'Failed to save AI template');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      showError('Failed to save AI template');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">
              {template ? 'Edit' : 'Create'} AI Survey Template
            </h3>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full p-3 border rounded-lg"
                placeholder="IT Support Helper"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full p-3 border rounded-lg"
              >
                {TEMPLATE_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full p-3 border rounded-lg"
              rows="2"
              placeholder="Brief description of what this template does..."
            />
          </div>

          {/* Survey Goals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Survey Goal
              </label>
              <textarea
                value={formData.survey_goal}
                onChange={(e) => setFormData(prev => ({ ...prev, survey_goal: e.target.value }))}
                className="w-full p-3 border rounded-lg"
                rows="3"
                placeholder="Help users with email issues"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Outcome
              </label>
              <textarea
                value={formData.target_outcome}
                onChange={(e) => setFormData(prev => ({ ...prev, target_outcome: e.target.value }))}
                className="w-full p-3 border rounded-lg"
                rows="3"
                placeholder="Clear problem definition with actionable next steps"
                required
              />
            </div>
          </div>

          {/* AI Behavior */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              AI Instructions
            </label>
            <textarea
              value={formData.ai_instructions}
              onChange={(e) => setFormData(prev => ({ ...prev, ai_instructions: e.target.value }))}
              className="w-full p-3 border rounded-lg"
              rows="4"
              placeholder="You are an expert IT support analyst. Your goal is to quickly understand..."
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Question Strategy
              </label>
              <textarea
                value={formData.first_question_prompt}
                onChange={(e) => setFormData(prev => ({ ...prev, first_question_prompt: e.target.value }))}
                className="w-full p-3 border rounded-lg"
                rows="3"
                placeholder="Ask about the specific problem they're experiencing..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Follow-up Strategy
              </label>
              <textarea
                value={formData.follow_up_strategy}
                onChange={(e) => setFormData(prev => ({ ...prev, follow_up_strategy: e.target.value }))}
                className="w-full p-3 border rounded-lg"
                rows="3"
                placeholder="Follow up based on the problem type..."
              />
            </div>
          </div>

          {/* Configuration */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Questions
              </label>
              <input
                type="number"
                value={formData.min_questions}
                onChange={(e) => setFormData(prev => ({ ...prev, min_questions: parseInt(e.target.value) }))}
                className="w-full p-3 border rounded-lg"
                min="1"
                max="10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Questions
              </label>
              <input
                type="number"
                value={formData.max_questions}
                onChange={(e) => setFormData(prev => ({ ...prev, max_questions: parseInt(e.target.value) }))}
                className="w-full p-3 border rounded-lg"
                min="3"
                max="20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AI Model
              </label>
              <select
                value={formData.model_name}
                onChange={(e) => setFormData(prev => ({ ...prev, model_name: e.target.value }))}
                className="w-full p-3 border rounded-lg"
              >
                {MODEL_OPTIONS.map(model => (
                  <option key={model.value} value={model.value}>{model.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Temperature
              </label>
              <input
                type="number"
                value={formData.temperature}
                onChange={(e) => setFormData(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                className="w-full p-3 border rounded-lg"
                min="0"
                max="1"
                step="0.1"
              />
            </div>
          </div>

          {/* Brief Template */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Brief Template
            </label>
            <textarea
              value={formData.brief_template}
              onChange={(e) => setFormData(prev => ({ ...prev, brief_template: e.target.value }))}
              className="w-full p-3 border rounded-lg font-mono text-sm"
              rows="8"
              placeholder="# Survey Brief&#10;&#10;## Overview&#10;{{problem_description}}&#10;&#10;## Next Steps&#10;{{recommended_actions}}"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 text-white">
              {loading ? 'Saving...' : (template ? 'Update Template' : 'Create Template')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AISurveyTemplatesTab;
