import React, { useState, useEffect } from 'react';
import { Modal } from './modal';
import { FormInput, FormTextarea } from './form-input';
import { Button } from './button';
import { Badge } from './badge';
import { X, Plus } from './icons';

const API = "http://localhost:8787";

export function CapabilityModal({ 
  isOpen, 
  onClose, 
  onSave, 
  editingCapability = null, 
  selectedSystem = null,
  systems = [],
  orgId,
  className = "" 
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    domain_tags: [],
    inputs: [],
    outputs: [],
    how_to: '',
    constraints: '',
    system_id: selectedSystem?.id || ''
  });
  const [newTag, setNewTag] = useState('');
  const [newInput, setNewInput] = useState('');
  const [newOutput, setNewOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const isEditing = Boolean(editingCapability);

  // Reset form when modal opens/closes or editingCapability changes
  useEffect(() => {
    if (isOpen) {
      if (editingCapability) {
        setFormData({
          name: editingCapability.name || '',
          description: editingCapability.description || '',
          domain_tags: editingCapability.domain_tags || [],
          inputs: editingCapability.inputs || [],
          outputs: editingCapability.outputs || [],
          how_to: editingCapability.how_to || '',
          constraints: editingCapability.constraints || '',
          system_id: editingCapability.system_id || selectedSystem?.id || ''
        });
      } else {
        setFormData({
          name: '',
          description: '',
          domain_tags: [],
          inputs: [],
          outputs: [],
          how_to: '',
          constraints: '',
          system_id: selectedSystem?.id || ''
        });
      }
      setNewTag('');
      setNewInput('');
      setNewOutput('');
      setErrors({});
    }
  }, [isOpen, editingCapability, selectedSystem]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Capability name is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (!formData.system_id) {
      newErrors.system_id = 'System selection is required';
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
        ? `${API}/api/orgs/${orgId}/capabilities/${editingCapability.id}`
        : `${API}/api/orgs/${orgId}/systems/${formData.system_id}/capabilities`;
      
      const method = isEditing ? 'PUT' : 'POST';
      
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        domain_tags: formData.domain_tags,
        inputs: formData.inputs,
        outputs: formData.outputs,
        how_to: formData.how_to.trim() || null,
        constraints: formData.constraints.trim() || null
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
        const savedCapability = await response.json();
        onSave(savedCapability);
        onClose();
      } else {
        const error = await response.json();
        setErrors({ submit: error.error || 'Failed to save capability' });
      }
    } catch (err) {
      console.error('Error saving capability:', err);
      setErrors({ submit: 'Failed to save capability. Please try again.' });
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
    if (newTag.trim() && !formData.domain_tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        domain_tags: [...prev.domain_tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      domain_tags: prev.domain_tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addInput = () => {
    if (newInput.trim() && !formData.inputs.includes(newInput.trim())) {
      setFormData(prev => ({
        ...prev,
        inputs: [...prev.inputs, newInput.trim()]
      }));
      setNewInput('');
    }
  };

  const removeInput = (inputToRemove) => {
    setFormData(prev => ({
      ...prev,
      inputs: prev.inputs.filter(input => input !== inputToRemove)
    }));
  };

  const addOutput = () => {
    if (newOutput.trim() && !formData.outputs.includes(newOutput.trim())) {
      setFormData(prev => ({
        ...prev,
        outputs: [...prev.outputs, newOutput.trim()]
      }));
      setNewOutput('');
    }
  };

  const removeOutput = (outputToRemove) => {
    setFormData(prev => ({
      ...prev,
      outputs: prev.outputs.filter(output => output !== outputToRemove)
    }));
  };

  const handleKeyPress = (handler) => (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handler();
    }
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
      title={isEditing ? 'Edit Capability' : 'Add New Capability'}
      description={isEditing ? 'Update capability details' : 'Define what this system can do'}
      footer={footer}
      className={className}
      closeOnOverlayClick={false}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <FormInput
              label="Capability Name"
              value={formData.name}
              onChange={handleInputChange('name')}
              placeholder="e.g., User Authentication, Data Export, API Integration"
              required
            />
            {errors.name && (
              <p className="text-sm text-destructive mt-1">{errors.name}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="form-label-enhanced">
              System <span className="text-destructive ml-1">*</span>
            </label>
            <select
              value={formData.system_id}
              onChange={handleInputChange('system_id')}
              className="form-input-enhanced w-full"
              disabled={isEditing} // Can't change system when editing
            >
              <option value="">Select a system...</option>
              {systems.map(system => (
                <option key={system.id} value={system.id}>
                  {system.name} {system.vendor && `(${system.vendor})`}
                </option>
              ))}
            </select>
            {errors.system_id && (
              <p className="text-sm text-destructive mt-1">{errors.system_id}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <FormTextarea
              label="Description"
              value={formData.description}
              onChange={handleInputChange('description')}
              placeholder="Describe what this capability does and how it can be used..."
              rows={3}
              required
            />
            {errors.description && (
              <p className="text-sm text-destructive mt-1">{errors.description}</p>
            )}
          </div>

          {/* Domain Tags */}
          <div className="md:col-span-2">
            <label className="form-label-enhanced">Domain Tags</label>
            <p className="text-sm text-muted-foreground mb-2">
              Tags help categorize this capability (e.g., security, data, integration)
            </p>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleKeyPress(addTag)}
                placeholder="Add domain tag..."
                className="form-input-enhanced flex-1"
              />
              <Button type="button" onClick={addTag} variant="outline" size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.domain_tags.map((tag, index) => (
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
          </div>

          {/* Inputs */}
          <div>
            <label className="form-label-enhanced">Inputs</label>
            <p className="text-sm text-muted-foreground mb-2">
              What data or parameters does this capability require?
            </p>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newInput}
                onChange={(e) => setNewInput(e.target.value)}
                onKeyPress={handleKeyPress(addInput)}
                placeholder="Add input..."
                className="form-input-enhanced flex-1"
              />
              <Button type="button" onClick={addInput} variant="outline" size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-1">
              {formData.inputs.map((input, index) => (
                <div key={index} className="flex items-center justify-between bg-muted/50 p-2 rounded">
                  <span className="text-sm">{input}</span>
                  <button
                    type="button"
                    onClick={() => removeInput(input)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Outputs */}
          <div>
            <label className="form-label-enhanced">Outputs</label>
            <p className="text-sm text-muted-foreground mb-2">
              What does this capability produce or return?
            </p>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newOutput}
                onChange={(e) => setNewOutput(e.target.value)}
                onKeyPress={handleKeyPress(addOutput)}
                placeholder="Add output..."
                className="form-input-enhanced flex-1"
              />
              <Button type="button" onClick={addOutput} variant="outline" size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-1">
              {formData.outputs.map((output, index) => (
                <div key={index} className="flex items-center justify-between bg-muted/50 p-2 rounded">
                  <span className="text-sm">{output}</span>
                  <button
                    type="button"
                    onClick={() => removeOutput(output)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <FormTextarea
              label="How To Use"
              value={formData.how_to}
              onChange={handleInputChange('how_to')}
              placeholder="Describe how to use this capability, including any special steps or configurations..."
              rows={3}
            />
          </div>

          <div className="md:col-span-2">
            <FormTextarea
              label="Constraints & Limitations"
              value={formData.constraints}
              onChange={handleInputChange('constraints')}
              placeholder="Any limitations, rate limits, permissions required, or other constraints..."
              rows={3}
            />
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
