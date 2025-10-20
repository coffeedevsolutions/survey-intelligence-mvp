/**
 * Unified Templates Tab - Single, clear template management
 * Replaces the confusing AI Settings, Survey Templates, and Brief Templates
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/card.jsx';
import { Button } from '../../components/ui/button.jsx';
import { FormInput, FormTextarea } from '../../components/ui/form-input.jsx';
import { Select } from '../../components/ui/select.jsx';
import { useNotifications } from '../../components/ui/notifications.jsx';
import { API_BASE_URL } from '../../utils/api.js';

const TEMPLATE_TYPES = [
  { 
    value: 'ai_dynamic', 
    label: '🤖 AI Dynamic Survey', 
    description: 'AI generates smart, adaptive questions based on responses' 
  },
  { 
    value: 'static', 
    label: '📋 Static Survey', 
    description: 'Predefined questions in a fixed order' 
  },
  { 
    value: 'hybrid', 
    label: '🎯 Hybrid Survey', 
    description: 'Mix of predefined questions and AI-generated follow-ups' 
  }
];

const CATEGORIES = [
  { value: 'general', label: 'General' },
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

export function UnifiedTemplatesTab({ user }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  
  const { showSuccess, showError } = useNotifications();

  const fetchTemplates = useCallback(async () => {
    if (!user?.orgId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/orgs/${user.orgId}/unified-templates`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      } else {
        throw new Error('Failed to fetch templates');
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.orgId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setShowCreateModal(true);
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setShowCreateModal(true);
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/orgs/${user.orgId}/unified-templates/${templateId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        showSuccess('Template deleted successfully');
        fetchTemplates();
      } else {
        throw new Error('Failed to delete template');
      }
    } catch (err) {
      showError('Failed to delete template: ' + err.message);
    }
  };

  const handleModalClose = () => {
    setShowCreateModal(false);
    setEditingTemplate(null);
  };

  const handleModalSave = () => {
    fetchTemplates();
    handleModalClose();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span>Loading templates...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-6 border-red-200 bg-red-50">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Templates</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchTemplates} variant="outline" className="text-red-600 border-red-200">
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Survey Templates</h2>
          <p className="text-gray-600 mt-1">
            Create unified survey templates that replace the old confusing AI → Survey → Campaign workflow.
          </p>
          <p className="text-sm text-blue-600 mt-1 font-medium">
            New Simple Workflow: Template → Campaign → Survey ✨
          </p>
        </div>
        <Button onClick={handleCreateTemplate} className="bg-blue-600 hover:bg-blue-700 text-white">
          Create Template
        </Button>
      </div>

      {/* Workflow Explanation */}
      <Card className="p-6 bg-green-50 border-green-200 mb-4">
        <h3 className="text-lg font-semibold text-green-900 mb-3">📋 How The New Workflow Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-green-200">
            <div className="flex items-center mb-2">
              <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2">1</span>
              <h4 className="font-medium text-green-900">Create Template</h4>
            </div>
            <p className="text-sm text-green-700">Define everything here: AI behavior, questions, output format, and appearance. One template handles it all.</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-green-200">
            <div className="flex items-center mb-2">
              <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2">2</span>
              <h4 className="font-medium text-green-900">Create Campaign</h4>
            </div>
            <p className="text-sm text-green-700">Select your template, add campaign details (name, purpose), and you're ready to launch.</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-green-200">
            <div className="flex items-center mb-2">
              <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2">3</span>
              <h4 className="font-medium text-green-900">Survey Runs</h4>
            </div>
            <p className="text-sm text-green-700">Template's logic executes directly—no more confusion between AI, survey, and campaign templates!</p>
          </div>
        </div>
      </Card>

      {/* Template Type Explanation */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Template Types Explained</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TEMPLATE_TYPES.map(type => (
            <div key={type.value} className="bg-white p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">{type.label}</h4>
              <p className="text-sm text-blue-700">{type.description}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Templates List */}
      <div className="grid grid-cols-1 gap-4">
        {templates.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
            <p className="text-gray-600 mb-4">Create your first survey template to get started.</p>
            <Button onClick={handleCreateTemplate} className="bg-blue-600 hover:bg-blue-700 text-white">
              Create Your First Template
            </Button>
          </Card>
        ) : (
          templates.map(template => (
            <TemplateCard 
              key={template.id} 
              template={template} 
              onEdit={handleEditTemplate}
              onDelete={handleDeleteTemplate}
            />
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <TemplateModal
          template={editingTemplate}
          orgId={user.orgId}
          onClose={handleModalClose}
          onSave={handleModalSave}
          showSuccess={showSuccess}
          showError={showError}
        />
      )}
    </div>
  );
}

function TemplateCard({ template, onEdit, onDelete }) {
  const getTypeIcon = (type) => {
    switch (type) {
      case 'ai_dynamic': return '🤖';
      case 'static': return '📋';
      case 'hybrid': return '🎯';
      default: return '📄';
    }
  };

  const getTypeLabel = (type) => {
    const typeObj = TEMPLATE_TYPES.find(t => t.value === type);
    return typeObj ? typeObj.label : type;
  };

  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">{getTypeIcon(template.template_type)}</span>
            <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
            {template.is_default && (
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                Default
              </span>
            )}
          </div>
          
          <p className="text-gray-600 mb-3">{template.description}</p>
          
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>{getTypeLabel(template.template_type)}</span>
            <span>•</span>
            <span className="capitalize">{template.category}</span>
            {template.ai_config?.question_limits && (
              <>
                <span>•</span>
                <span>{template.ai_config.question_limits.min_questions}-{template.ai_config.question_limits.max_questions} questions</span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            onClick={() => onEdit(template)} 
            variant="outline" 
            size="sm"
          >
            Edit
          </Button>
          <Button 
            onClick={() => onDelete(template.id)} 
            variant="outline" 
            size="sm" 
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}

function TemplateModal({ template, orgId, onClose, onSave, showSuccess, showError }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'general',
    template_type: 'ai_dynamic',
    is_default: false,
    
    // AI Configuration
    survey_goal: '',
    target_outcome: '',
    ai_instructions: '',
    model_name: 'gpt-4o-mini',
    temperature: 0.3,
    max_questions: 6,
    min_questions: 3,
    
    // Optimization Configuration
    enable_semantic_deduplication: true,
    enable_fatigue_detection: true,
    enable_dynamic_thresholds: true,
    fatigue_threshold: 0.7,
    similarity_threshold: 0.85,
    coverage_requirement: 0.8,
    
    // Output Configuration
    brief_template: '',
    
    // Appearance Configuration
    primary_color: '#2563eb',
    secondary_color: '#64748b',
    show_logo: true
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (template) {
      const aiConfig = template.ai_config || {};
      const outputConfig = template.output_config || {};
      const appearanceConfig = template.appearance_config || {};
      const optimizationConfig = aiConfig.optimization_config || {};
      
      setFormData({
        name: template.name || '',
        description: template.description || '',
        category: template.category || 'general',
        template_type: template.template_type || 'ai_dynamic',
        is_default: template.is_default || false,
        
        survey_goal: aiConfig.survey_goal || '',
        target_outcome: aiConfig.target_outcome || '',
        ai_instructions: aiConfig.ai_instructions || '',
        model_name: aiConfig.model_settings?.model_name || 'gpt-4o-mini',
        temperature: aiConfig.model_settings?.temperature || 0.3,
        max_questions: aiConfig.question_limits?.max_questions || 6,
        min_questions: aiConfig.question_limits?.min_questions || 3,
        
        enable_semantic_deduplication: optimizationConfig.enable_semantic_deduplication !== false,
        enable_fatigue_detection: optimizationConfig.enable_fatigue_detection !== false,
        enable_dynamic_thresholds: optimizationConfig.enable_dynamic_thresholds !== false,
        fatigue_threshold: optimizationConfig.fatigue_threshold || 0.7,
        similarity_threshold: optimizationConfig.similarity_threshold || 0.85,
        coverage_requirement: optimizationConfig.coverage_requirement || 0.8,
        
        brief_template: outputConfig.brief_template || '',
        
        primary_color: appearanceConfig.colors?.primary || '#2563eb',
        secondary_color: appearanceConfig.colors?.secondary || '#64748b',
        show_logo: appearanceConfig.branding?.show_logo !== false
      });
    }
  }, [template]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const templateData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        templateType: formData.template_type,
        isDefault: formData.is_default,
        
        aiConfig: ['ai_dynamic', 'hybrid'].includes(formData.template_type) ? {
          survey_goal: formData.survey_goal,
          target_outcome: formData.target_outcome,
          ai_instructions: formData.ai_instructions,
          model_settings: {
            model_name: formData.model_name,
            temperature: parseFloat(formData.temperature)
          },
          question_limits: {
            max_questions: parseInt(formData.max_questions),
            min_questions: parseInt(formData.min_questions)
          },
          optimization_config: {
            enable_semantic_deduplication: formData.enable_semantic_deduplication,
            enable_fatigue_detection: formData.enable_fatigue_detection,
            enable_dynamic_thresholds: formData.enable_dynamic_thresholds,
            fatigue_threshold: parseFloat(formData.fatigue_threshold),
            similarity_threshold: parseFloat(formData.similarity_threshold),
            coverage_requirement: parseFloat(formData.coverage_requirement)
          }
        } : {},
        
        outputConfig: {
          brief_template: formData.brief_template || 'Default brief template based on survey responses.'
        },
        
        appearanceConfig: {
          colors: {
            primary: formData.primary_color,
            secondary: formData.secondary_color
          },
          branding: {
            show_logo: formData.show_logo
          }
        }
      };

      const url = template 
        ? `${API_BASE_URL}/api/orgs/${orgId}/unified-templates/${template.id}`
        : `${API_BASE_URL}/api/orgs/${orgId}/unified-templates`;
      
      const method = template ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(templateData)
      });

      if (response.ok) {
        showSuccess(`Template ${template ? 'updated' : 'created'} successfully`);
        onSave();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save template');
      }
    } catch (err) {
      showError(`Failed to save template: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const isAITemplate = ['ai_dynamic', 'hybrid'].includes(formData.template_type);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <h2 className="text-xl font-semibold">
              {template ? 'Edit Template' : 'Create New Template'}
            </h2>
            <Button type="button" onClick={onClose} variant="outline" size="sm">
              Cancel
            </Button>
          </div>

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            <FormInput
              label="Template Name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              placeholder="e.g., IT Support Request Template"
            />
            
            <FormTextarea
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of what this template is for..."
              rows={3}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Template Type"
                value={formData.template_type}
                onChange={(e) => setFormData(prev => ({ ...prev, template_type: e.target.value }))}
                options={TEMPLATE_TYPES}
                required
              />
              
              <Select
                label="Category"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                options={CATEGORIES}
                required
              />
            </div>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.is_default}
                onChange={(e) => setFormData(prev => ({ ...prev, is_default: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Set as default template for organization</span>
            </label>
          </div>

          {/* AI Configuration (only for AI templates) */}
          {isAITemplate && (
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-medium">AI Configuration</h3>
              
              <FormInput
                label="Survey Goal"
                value={formData.survey_goal}
                onChange={(e) => setFormData(prev => ({ ...prev, survey_goal: e.target.value }))}
                placeholder="e.g., Help users resolve technical issues quickly"
                required={isAITemplate}
              />
              
              <FormInput
                label="Target Outcome"
                value={formData.target_outcome}
                onChange={(e) => setFormData(prev => ({ ...prev, target_outcome: e.target.value }))}
                placeholder="e.g., Generate actionable IT support ticket with clear next steps"
                required={isAITemplate}
              />
              
              <FormTextarea
                label="AI Instructions"
                value={formData.ai_instructions}
                onChange={(e) => setFormData(prev => ({ ...prev, ai_instructions: e.target.value }))}
                placeholder="Instructions for how the AI should behave during the survey..."
                rows={4}
                required={isAITemplate}
              />
              
              <div className="grid grid-cols-3 gap-4">
                <Select
                  label="AI Model"
                  value={formData.model_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, model_name: e.target.value }))}
                  options={MODEL_OPTIONS}
                />
                
                <FormInput
                  label="Temperature"
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={formData.temperature}
                  onChange={(e) => setFormData(prev => ({ ...prev, temperature: e.target.value }))}
                />
                
                <div className="grid grid-cols-2 gap-2">
                  <FormInput
                    label="Min Questions"
                    type="number"
                    min="1"
                    max="20"
                    value={formData.min_questions}
                    onChange={(e) => setFormData(prev => ({ ...prev, min_questions: e.target.value }))}
                  />
                  <FormInput
                    label="Max Questions"
                    type="number"
                    min="1"
                    max="20"
                    value={formData.max_questions}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_questions: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Output Configuration */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="text-lg font-medium">Output Configuration</h3>
            
            <FormTextarea
              label="Brief Template"
              value={formData.brief_template}
              onChange={(e) => setFormData(prev => ({ ...prev, brief_template: e.target.value }))}
              placeholder="Template for the final output document. Use {variable_name} for dynamic content."
              rows={6}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 border-t pt-6">
            <Button type="button" onClick={onClose} variant="outline">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? 'Saving...' : (template ? 'Update Template' : 'Create Template')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UnifiedTemplatesTab;
