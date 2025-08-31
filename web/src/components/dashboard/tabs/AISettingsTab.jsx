/**
 * AI Settings Tab Component
 * Allows admins to configure AI behavior for survey flows
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../../ui/card.jsx';
import { Button } from '../../ui/button.jsx';
import { useNotifications } from '../../ui/notifications.jsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

export function AISettingsTab({ user }) {
  const [aiTemplates, setAITemplates] = useState([]);
  const [flowConfigs, setFlowConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [aiAnalytics, setAIAnalytics] = useState(null);
  
  const { showSuccess, showError } = useNotifications();

  // Fetch AI configuration data
  useEffect(() => {
    if (user?.orgId) {
      fetchAIData();
    }
  }, [user?.orgId]);

  const fetchAIData = async () => {
    setLoading(true);
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
    } catch (error) {
      console.error('Error fetching AI data:', error);
      showError('Failed to load AI settings');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading AI settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* AI Analytics Overview */}
      <AIAnalyticsCard analytics={aiAnalytics} />
      
      {/* AI Templates Management */}
      <AITemplatesCard 
        templates={aiTemplates}
        onRefresh={fetchAIData}
        orgId={user.orgId}
        showSuccess={showSuccess}
        showError={showError}
      />
      
      {/* Flow AI Configuration */}
      <FlowAIConfigCard 
        configs={flowConfigs}
        templates={aiTemplates}
        onRefresh={fetchAIData}
        orgId={user.orgId}
        showSuccess={showSuccess}
        showError={showError}
      />
      
      {/* AI Cost Management */}
      <AICostManagementCard 
        analytics={aiAnalytics}
        orgId={user.orgId}
      />
    </div>
  );
}

/**
 * AI Analytics Overview Card
 */
function AIAnalyticsCard({ analytics }) {
  if (!analytics || !analytics.analytics.length) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">AI Usage Analytics</h3>
        <p className="text-gray-600">No AI usage data available yet.</p>
      </Card>
    );
  }

  // Calculate summary statistics
  const totalCosts = analytics.analytics.reduce((sum, item) => sum + (item.total_cost_cents || 0), 0);
  const totalActions = analytics.analytics.reduce((sum, item) => sum + (item.action_count || 0), 0);
  const avgConfidence = analytics.analytics.reduce((sum, item) => sum + (item.avg_confidence || 0), 0) / analytics.analytics.length;

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
          const actionData = analytics.analytics.filter(item => item.ai_action === action);
          const actionCount = actionData.reduce((sum, item) => sum + item.action_count, 0);
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
}

/**
 * AI Templates Management Card
 */
function AITemplatesCard({ templates, onRefresh, orgId, showSuccess, showError }) {
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
                  {template.context_type} · {template.model_provider}/{template.model_name}
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
                  onClick={() => toggleTemplateStatus(template.id, !template.is_active)}
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
}

/**
 * Flow AI Configuration Card
 */
function FlowAIConfigCard({ configs, templates, onRefresh, orgId, showSuccess, showError }) {
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
}

/**
 * AI Cost Management Card
 */
function AICostManagementCard({ analytics, orgId }) {
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
}

/**
 * AI Template Modal (placeholder - would need full implementation)
 */
function AITemplateModal({ template, orgId, onClose, onSave, showError }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">
          {template ? 'Edit' : 'Create'} AI Template
        </h3>
        <p className="text-gray-600 mb-4">
          Template configuration form would go here. This includes prompt editing, 
          model selection, and parameter tuning.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(true)}>Save</Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Flow AI Config Modal (placeholder)
 */
function FlowAIConfigModal({ config, templates, onClose, onSave, showError }) {
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
