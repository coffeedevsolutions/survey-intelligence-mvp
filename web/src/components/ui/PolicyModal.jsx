import React, { useState, useEffect } from 'react';
import { Modal } from './modal';
import { FormInput, FormTextarea } from './form-input';
import { Button } from './button';
import { Badge } from './badge';
import { X, Plus } from './icons';

const API = "http://localhost:8787";

export function PolicyModal({ 
  isOpen, 
  onClose, 
  onSave, 
  editingPolicy = null, 
  orgId,
  className = "" 
}) {
  const [formData, setFormData] = useState({
    rule_name: '',
    guidance: '',
    applies_to_tags: [],
    priority: 100
  });
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const isEditing = Boolean(editingPolicy);

  // Reset form when modal opens/closes or editingPolicy changes
  useEffect(() => {
    if (isOpen) {
      if (editingPolicy) {
        setFormData({
          rule_name: editingPolicy.rule_name || '',
          guidance: editingPolicy.guidance || '',
          applies_to_tags: editingPolicy.applies_to_tags || [],
          priority: editingPolicy.priority || 100
        });
      } else {
        setFormData({
          rule_name: '',
          guidance: '',
          applies_to_tags: [],
          priority: 100
        });
      }
      setNewTag('');
      setErrors({});
    }
  }, [isOpen, editingPolicy]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.rule_name.trim()) {
      newErrors.rule_name = 'Policy rule name is required';
    }
    
    if (!formData.guidance.trim()) {
      newErrors.guidance = 'Policy guidance is required';
    }
    
    if (formData.priority < 1 || formData.priority > 100) {
      newErrors.priority = 'Priority must be between 1 and 100';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const url = isEditing 
        ? `${API}/api/orgs/${orgId}/policies/${editingPolicy.id}`
        : `${API}/api/orgs/${orgId}/policies`;
      
      const method = isEditing ? 'PUT' : 'POST';
      
      const payload = {
        rule_name: formData.rule_name.trim(),
        guidance: formData.guidance.trim(),
        applies_to_tags: formData.applies_to_tags,
        priority: parseInt(formData.priority)
      };
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const savedPolicy = await response.json();
        onSave(savedPolicy);
        onClose();
      } else {
        const error = await response.json();
        setErrors({ submit: error.error || 'Failed to save policy' });
      }
    } catch (err) {
      console.error('Error saving policy:', err);
      setErrors({ submit: 'Failed to save policy. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field) => (e) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.applies_to_tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        applies_to_tags: [...prev.applies_to_tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      applies_to_tags: prev.applies_to_tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleKeyPress = (handler) => (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handler();
    }
  };

  const getPriorityColor = (priority) => {
    if (priority <= 20) return 'bg-red-50 text-red-700 border-red-200';
    if (priority <= 40) return 'bg-orange-50 text-orange-700 border-orange-200';
    if (priority <= 60) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    if (priority <= 80) return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getPriorityLabel = (priority) => {
    if (priority <= 20) return 'Critical';
    if (priority <= 40) return 'High';
    if (priority <= 60) return 'Medium';
    if (priority <= 80) return 'Low';
    return 'Informational';
  };

  const footer = (
    <div className="flex gap-3 justify-end">
      <Button 
        variant="outline" 
        onClick={onClose}
        disabled={loading}
      >
        Cancel
      </Button>
      <Button 
        onClick={handleSubmit}
        disabled={loading}
        className="min-w-[100px]"
      >
        {loading ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Policy' : 'Add New Policy'}
      description={isEditing ? 'Update policy rule and guidance' : 'Define a policy to guide AI recommendations'}
      footer={footer}
      className={className}
      closeOnOverlayClick={false}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-6">
          <div>
            <FormInput
              label="Policy Rule Name"
              value={formData.rule_name}
              onChange={handleInputChange('rule_name')}
              placeholder="e.g., Prefer Cloud-Native Solutions, Security First Approach, Open Source Preferred"
              required
            />
            {errors.rule_name && (
              <p className="text-sm text-destructive mt-1">{errors.rule_name}</p>
            )}
          </div>

          <div>
            <FormTextarea
              label="Policy Guidance"
              value={formData.guidance}
              onChange={handleInputChange('guidance')}
              placeholder="Describe the policy in detail. What should the AI consider when making recommendations? What are the preferred approaches or restrictions?"
              rows={4}
              required
            />
            {errors.guidance && (
              <p className="text-sm text-destructive mt-1">{errors.guidance}</p>
            )}
          </div>

          {/* Applies To Tags */}
          <div>
            <label className="form-label-enhanced">Applies To Tags</label>
            <p className="text-sm text-muted-foreground mb-2">
              Specify which domain tags this policy applies to. Leave empty to apply to all recommendations.
            </p>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleKeyPress(addTag)}
                placeholder="Add domain tag (e.g., security, data, integration)..."
                className="form-input-enhanced flex-1"
              />
              <Button type="button" onClick={addTag} variant="outline" size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.applies_to_tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            {formData.applies_to_tags.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                This policy will apply to all recommendations
              </p>
            )}
          </div>

          {/* Priority */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="form-label-enhanced">Priority</label>
              <div className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(formData.priority)}`}>
                {getPriorityLabel(formData.priority)} ({formData.priority})
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Lower numbers = higher priority. Critical policies (1-20) are enforced most strictly.
            </p>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="100"
                value={formData.priority}
                onChange={handleInputChange('priority')}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <FormInput
                type="number"
                value={formData.priority}
                onChange={handleInputChange('priority')}
                min="1"
                max="100"
                className="w-20"
              />
            </div>
            {errors.priority && (
              <p className="text-sm text-destructive mt-1">{errors.priority}</p>
            )}
            
            {/* Priority Guide */}
            <div className="mt-3 text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>1-20: Critical (Must follow)</span>
                <span>21-40: High (Strong preference)</span>
              </div>
              <div className="flex justify-between">
                <span>41-60: Medium (Consider)</span>
                <span>61-80: Low (Nice to have)</span>
              </div>
              <div className="text-center">
                <span>81-100: Informational (For context)</span>
              </div>
            </div>
          </div>
        </div>

        {errors.submit && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{errors.submit}</p>
          </div>
        )}
      </form>
    </Modal>
  );
}
