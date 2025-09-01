/**
 * AI Settings Tab Component
 * Allows admins to configure AI behavior for survey flows
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import { Card } from '../../ui/card.jsx';
import { Button } from '../../ui/button.jsx';
import { useNotifications } from '../../ui/notifications.jsx';
import { API_BASE_URL } from '../../../utils/api.js';

export function AISettingsTab({ user }) {
  const [aiTemplates, setAITemplates] = useState([]);
  const [flowConfigs, setFlowConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [aiAnalytics, setAIAnalytics] = useState(null);
  
  const { showSuccess, showError } = useNotifications();

  // Stable refs for callbacks to prevent child re-renders
  const showSuccessRef = useCallback(showSuccess, [showSuccess]);
  const showErrorRef = useCallback(showError, [showError]);

  // Fetch AI configuration data
  const fetchAIData = useCallback(async () => {
    if (!user?.orgId) return;
    
    setLoading(true);
    setError(null);
    try {
      const [templatesRes, configsRes, analyticsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/orgs/${user.orgId}/ai-templates`, { credentials: 'include' }),
        fetch(`${API_BASE_URL}/api/orgs/${user.orgId}/ai-flow-configs`, { credentials: 'include' }),
        fetch(`${API_BASE_URL}/api/public-survey/ai-analytics/${user.orgId}`, { credentials: 'include' })
      ]);

      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        setAITemplates(templatesData.templates || []);
      }

      if (configsRes.ok) {
        const configsData = await configsRes.json();
        setFlowConfigs(configsData.configs || []);
      }

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAIAnalytics(analyticsData);
      }
    } catch (err) {
      console.error('Error fetching AI data:', err);
      setError(err.message || 'Failed to load AI settings');
      // Don't include showError in the dependency array to prevent re-renders
    } finally {
      setLoading(false);
      setDataLoaded(true);
    }
  }, [user.orgId]);

  // Show error notification when error state changes
  useEffect(() => {
    if (error) {
      showErrorRef('Failed to load AI settings');
    }
  }, [error, showErrorRef]);

  useEffect(() => {
    fetchAIData();
  }, [fetchAIData]);

  if (loading || !dataLoaded) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span>Loading AI settings...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-6 border-red-200 bg-red-50">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading AI Settings</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <Button 
            onClick={() => {
              setError(null);
              setDataLoaded(false);
              fetchAIData();
            }} 
            variant="outline" 
            className="text-red-600 border-red-200"
          >
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Analytics Overview */}
      <AIAnalyticsCard analytics={aiAnalytics} />
      
      {/* AI Templates Management */}
      <AITemplatesCard 
        templates={aiTemplates}
        onRefresh={fetchAIData}
        orgId={user?.orgId}
        showSuccess={showSuccessRef}
        showError={showErrorRef}
      />
      
      {/* Flow AI Configuration */}
      <FlowAIConfigCard 
        configs={flowConfigs}
        templates={aiTemplates}
        onRefresh={fetchAIData}
        showSuccess={showSuccessRef}
        showError={showErrorRef}
      />
      
      {/* AI Cost Management */}
      <AICostManagementCard />
    </div>
  );
}

/**
 * AI Analytics Overview Card
 */
const AIAnalyticsCard = memo(function AIAnalyticsCard({ analytics }) {
  // Safe check for analytics data
  if (!analytics || !analytics.analytics || !Array.isArray(analytics.analytics) || analytics.analytics.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">AI Usage Analytics</h3>
        <p className="text-gray-600">No AI usage data available yet.</p>
      </Card>
    );
  }

  // Calculate summary statistics safely
  const totalCosts = analytics.analytics.reduce((sum, item) => sum + (item.total_cost_cents || 0), 0);
  const totalActions = analytics.analytics.reduce((sum, item) => sum + (item.action_count || 0), 0);
  const avgConfidence = analytics.analytics.length > 0 
    ? analytics.analytics.reduce((sum, item) => sum + (item.avg_confidence || 0), 0) / analytics.analytics.length
    : 0;

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">AI Usage Analytics (Last 30 Days)</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{totalActions}</div>
          <div className="text-sm text-gray-600">Total AI Actions</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">${(totalCosts / 100).toFixed(2)}</div>
          <div className="text-sm text-gray-600">Total Cost</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{(avgConfidence * 100).toFixed(1)}%</div>
          <div className="text-sm text-gray-600">Avg Confidence</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">${(totalCosts / totalActions / 100).toFixed(4)}</div>
          <div className="text-sm text-gray-600">Cost per Action</div>
        </div>
      </div>
      
      {/* Action breakdown */}
      <div className="space-y-2">
        <h4 className="font-medium">Actions by Type:</h4>
        {['question_generation', 'fact_extraction', 'brief_generation'].map(action => {
          const actionData = (analytics.analytics || []).filter(item => item.ai_action === action);
          const actionCount = actionData.reduce((sum, item) => sum + (item.action_count || 0), 0);
          const actionCost = actionData.reduce((sum, item) => sum + (item.total_cost_cents || 0), 0);
          
          return (
            <div key={action} className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="capitalize">{action.replace('_', ' ')}</span>
              <div className="text-sm text-gray-600">
                {actionCount} calls · ${(actionCost / 100).toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
});

/**
 * AI Templates Management Card
 */
const AITemplatesCard = memo(function AITemplatesCard({ templates, onRefresh, orgId, showSuccess, showError }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setShowCreateModal(true);
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setShowCreateModal(true);
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">AI Prompt Templates</h3>
        <Button onClick={handleCreateTemplate} className="bg-blue-600 text-white">
          Create Template
        </Button>
      </div>
      
      {templates.length === 0 ? (
        <p className="text-gray-600">No AI templates configured. Create your first template to get started.</p>
      ) : (
        <div className="space-y-3">
          {templates.map(template => (
            <div key={template.id} className="flex justify-between items-center p-3 border rounded">
              <div>
                <div className="font-medium">{template.name}</div>
                <div className="text-sm text-gray-600">
                  {template.context_type} · OpenAI/{template.model_name}
                </div>
                <div className="text-xs text-gray-500">{template.description}</div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleEditTemplate(template)}
                >
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className={template.is_active ? 'text-red-600' : 'text-green-600'}
                                      onClick={() => {/* TODO: Implement toggle template status */}}
                >
                  {template.is_active ? 'Disable' : 'Enable'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {showCreateModal && (
        <AITemplateModal
          template={editingTemplate}
          orgId={orgId}
          onClose={() => setShowCreateModal(false)}
          onSave={(saved) => {
            setShowCreateModal(false);
            showSuccess(saved ? 'Template saved successfully' : 'Template updated successfully');
            onRefresh();
          }}
          showError={showError}
        />
      )}
    </Card>
  );
});

/**
 * Flow AI Configuration Card
 */
const FlowAIConfigCard = memo(function FlowAIConfigCard({ configs, templates, onRefresh, showSuccess, showError }) {
  const [selectedFlow, setSelectedFlow] = useState(null);
  
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Survey Flow AI Configuration</h3>
      
      {configs.length === 0 ? (
        <p className="text-gray-600">No survey flows with AI configuration found.</p>
      ) : (
        <div className="space-y-3">
          {configs.map(config => (
            <div key={config.id} className="p-3 border rounded">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{config.flow_title || `Flow #${config.flow_id}`}</div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Adaptive Questions: {config.enable_adaptive_questions ? '✓' : '✗'}</div>
                    <div>Smart Extraction: {config.enable_smart_fact_extraction ? '✓' : '✗'}</div>
                    <div>Max AI Questions: {config.max_ai_questions_per_session}</div>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedFlow(config)}
                >
                  Configure
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {selectedFlow && (
        <FlowAIConfigModal
          config={selectedFlow}
          templates={templates}
          onClose={() => setSelectedFlow(null)}
          onSave={() => {
            setSelectedFlow(null);
            showSuccess('AI configuration updated successfully');
            onRefresh();
          }}
          showError={showError}
        />
      )}
    </Card>
  );
});

/**
 * AI Cost Management Card
 */
const AICostManagementCard = memo(function AICostManagementCard() {
  const [costLimits, setCostLimits] = useState({
    daily_limit: 10.00,
    monthly_limit: 100.00,
    per_session_limit: 1.00
  });

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">AI Cost Management</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Daily Limit ($)</label>
          <input
            type="number"
            step="0.01"
            value={costLimits.daily_limit}
            onChange={(e) => setCostLimits(prev => ({ ...prev, daily_limit: parseFloat(e.target.value) }))}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Monthly Limit ($)</label>
          <input
            type="number"
            step="0.01"
            value={costLimits.monthly_limit}
            onChange={(e) => setCostLimits(prev => ({ ...prev, monthly_limit: parseFloat(e.target.value) }))}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Per Session Limit ($)</label>
          <input
            type="number"
            step="0.01"
            value={costLimits.per_session_limit}
            onChange={(e) => setCostLimits(prev => ({ ...prev, per_session_limit: parseFloat(e.target.value) }))}
            className="w-full p-2 border rounded"
          />
        </div>
      </div>
      
      <div className="mt-4">
        <Button className="bg-green-600 text-white">
          Update Cost Limits
        </Button>
      </div>
    </Card>
  );
});

// Model options for AI templates
const MODEL_OPTIONS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & Cost-effective)', cost: '$0.15/$0.60 per 1K tokens' },
  { value: 'gpt-4o', label: 'GPT-4o (Premium Quality)', cost: '$5/$15 per 1K tokens' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Basic)', cost: '$0.50/$1.50 per 1K tokens' }
];

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
    temperature: template?.temperature || 0.3,
    // New optimization features
    enable_semantic_deduplication: template?.enable_semantic_deduplication ?? true,
    enable_fatigue_detection: template?.enable_fatigue_detection ?? true,
    enable_dynamic_thresholds: template?.enable_dynamic_thresholds ?? true,
    fatigue_threshold: template?.fatigue_threshold || 0.6,
    similarity_threshold: template?.similarity_threshold || 0.85,
    max_turns: template?.max_turns || 10,
    coverage_requirement: template?.coverage_requirement || 0.75
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
        },
        // Include new optimization settings
        optimization_config: {
          enable_semantic_deduplication: formData.enable_semantic_deduplication,
          enable_fatigue_detection: formData.enable_fatigue_detection,
          enable_dynamic_thresholds: formData.enable_dynamic_thresholds,
          fatigue_threshold: formData.fatigue_threshold,
          similarity_threshold: formData.similarity_threshold,
          max_turns: formData.max_turns,
          coverage_requirement: formData.coverage_requirement
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
                <option value="general">General</option>
                <option value="customer_support">Customer Support</option>
                <option value="product_feedback">Product Feedback</option>
                <option value="employee_engagement">Employee Engagement</option>
                <option value="market_research">Market Research</option>
                <option value="it_support">IT Support</option>
                <option value="business_analysis">Business Analysis</option>
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
              placeholder="Describe what this template is designed for..."
            />
          </div>

          {/* Survey Configuration */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900">Survey Configuration</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Survey Goal
              </label>
              <textarea
                value={formData.survey_goal}
                onChange={(e) => setFormData(prev => ({ ...prev, survey_goal: e.target.value }))}
                className="w-full p-3 border rounded-lg"
                rows="2"
                placeholder="What should this survey accomplish?"
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
                rows="2"
                placeholder="What should the final brief contain or achieve?"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Context Description
              </label>
              <textarea
                value={formData.context_description}
                onChange={(e) => setFormData(prev => ({ ...prev, context_description: e.target.value }))}
                className="w-full p-3 border rounded-lg"
                rows="2"
                placeholder="Provide context about the typical scenarios this template handles..."
              />
            </div>
          </div>

          {/* AI Instructions */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900">AI Instructions</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AI Instructions
              </label>
              <textarea
                value={formData.ai_instructions}
                onChange={(e) => setFormData(prev => ({ ...prev, ai_instructions: e.target.value }))}
                className="w-full p-3 border rounded-lg"
                rows="4"
                placeholder="Instructions for how the AI should behave during the survey..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Question Prompt
              </label>
              <textarea
                value={formData.first_question_prompt}
                onChange={(e) => setFormData(prev => ({ ...prev, first_question_prompt: e.target.value }))}
                className="w-full p-3 border rounded-lg"
                rows="2"
                placeholder="The opening question to start the survey..."
                required
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
                placeholder="How should the AI decide on follow-up questions?"
                required
              />
            </div>
          </div>

          {/* Question Limits and Model Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Questions
              </label>
              <input
                type="number"
                value={formData.max_questions}
                onChange={(e) => setFormData(prev => ({ ...prev, max_questions: parseInt(e.target.value) }))}
                className="w-full p-3 border rounded-lg"
                min="1"
                max="20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Questions
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

          {/* New AI Optimization Settings */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900">AI Optimization Settings</h4>
            
            {/* Feature Toggles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="semantic_dedup"
                  checked={formData.enable_semantic_deduplication}
                  onChange={(e) => setFormData(prev => ({ ...prev, enable_semantic_deduplication: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <label htmlFor="semantic_dedup" className="text-sm font-medium text-gray-700">
                  Semantic Deduplication
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="fatigue_detection"
                  checked={formData.enable_fatigue_detection}
                  onChange={(e) => setFormData(prev => ({ ...prev, enable_fatigue_detection: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <label htmlFor="fatigue_detection" className="text-sm font-medium text-gray-700">
                  Fatigue Detection
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="dynamic_thresholds"
                  checked={formData.enable_dynamic_thresholds}
                  onChange={(e) => setFormData(prev => ({ ...prev, enable_dynamic_thresholds: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <label htmlFor="dynamic_thresholds" className="text-sm font-medium text-gray-700">
                  Dynamic Thresholds
                </label>
              </div>
            </div>

            {/* Advanced Tuning Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Survey Turns
                </label>
                <input
                  type="number"
                  value={formData.max_turns}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_turns: parseInt(e.target.value) }))}
                  className="w-full p-3 border rounded-lg"
                  min="5"
                  max="20"
                />
                <p className="text-xs text-gray-500 mt-1">Hard limit to prevent overly long surveys</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Coverage Requirement
                </label>
                <input
                  type="number"
                  value={formData.coverage_requirement}
                  onChange={(e) => setFormData(prev => ({ ...prev, coverage_requirement: parseFloat(e.target.value) }))}
                  className="w-full p-3 border rounded-lg"
                  min="0.5"
                  max="1.0"
                  step="0.05"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum slot coverage to complete survey (0.5-1.0)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fatigue Threshold
                </label>
                <input
                  type="number"
                  value={formData.fatigue_threshold}
                  onChange={(e) => setFormData(prev => ({ ...prev, fatigue_threshold: parseFloat(e.target.value) }))}
                  className="w-full p-3 border rounded-lg"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                />
                <p className="text-xs text-gray-500 mt-1">Stop survey when fatigue exceeds this (0.1-1.0)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Similarity Threshold
                </label>
                <input
                  type="number"
                  value={formData.similarity_threshold}
                  onChange={(e) => setFormData(prev => ({ ...prev, similarity_threshold: parseFloat(e.target.value) }))}
                  className="w-full p-3 border rounded-lg"
                  min="0.5"
                  max="1.0"
                  step="0.05"
                />
                <p className="text-xs text-gray-500 mt-1">Reject questions above this similarity (0.5-1.0)</p>
              </div>
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
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
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

/**
 * Flow AI Config Modal (placeholder)
 */
function FlowAIConfigModal({ onClose, onSave }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <h3 className="text-lg font-semibold mb-4">Configure AI for Survey Flow</h3>
        <p className="text-gray-600 mb-4">
          Flow-specific AI configuration would go here, including template assignments
          and behavior settings.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onSave}>Save</Button>
        </div>
      </div>
    </div>
  );
}
