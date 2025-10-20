import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { FormInput, FormTextarea } from '../../components/ui/form-input';

/**
 * Survey Experience Settings Section
 */
export function SurveyExperienceSettings({ formData, onInputChange }) {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Survey Layout & Flow</CardTitle>
          <CardDescription>
            Control how surveys are presented to users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Layout Style</label>
              <select
                value={formData.survey_layout || 'single-column'}
                onChange={(e) => onInputChange('survey_layout', e.target.value)}
                className="w-full p-2 border border-input rounded focus:ring-2 focus:ring-primary"
              >
                <option value="single-column">Single Column</option>
                <option value="two-column">Two Column</option>
                <option value="wizard">Step-by-Step Wizard</option>
                <option value="conversational">Conversational</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Card Style</label>
              <select
                value={formData.survey_card_style || 'floating'}
                onChange={(e) => onInputChange('survey_card_style', e.target.value)}
                className="w-full p-2 border border-input rounded focus:ring-2 focus:ring-primary"
              >
                <option value="floating">Floating Cards</option>
                <option value="fullscreen">Full Screen</option>
                <option value="minimal">Minimal</option>
                <option value="boxed">Boxed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Progress Display</label>
              <select
                value={formData.progress_style || 'bar'}
                onChange={(e) => onInputChange('progress_style', e.target.value)}
                className="w-full p-2 border border-input rounded focus:ring-2 focus:ring-primary"
              >
                <option value="bar">Progress Bar</option>
                <option value="steps">Step Indicators</option>
                <option value="percentage">Percentage</option>
                <option value="fraction">Fraction (2/10)</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Question Flow Type</label>
              <select
                value={formData.question_flow_type || 'adaptive'}
                onChange={(e) => onInputChange('question_flow_type', e.target.value)}
                className="w-full p-2 border border-input rounded focus:ring-2 focus:ring-primary"
              >
                <option value="adaptive">Adaptive (AI-driven)</option>
                <option value="fixed">Fixed sequence</option>
                <option value="branching">Conditional branching</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Completion & Results</CardTitle>
          <CardDescription>
            Configure what happens when surveys are completed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Show Brief to User</h4>
              <p className="text-sm text-muted-foreground">
                Allow survey participants to see the generated project brief
              </p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.show_brief_to_user !== false}
                onChange={(e) => onInputChange('show_brief_to_user', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Enable</span>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Auto-save Progress</h4>
              <p className="text-sm text-muted-foreground">
                Automatically save user responses as they progress
              </p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.auto_save_progress !== false}
                onChange={(e) => onInputChange('auto_save_progress', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Enable</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Max Questions</label>
              <input
                type="number"
                value={formData.max_questions || ''}
                onChange={(e) => onInputChange('max_questions', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Unlimited"
                className="w-full p-2 border border-input rounded focus:ring-2 focus:ring-primary"
                min="1"
                max="50"
              />
              <p className="text-xs text-muted-foreground mt-1">Leave empty for unlimited</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Time Per Question (seconds)</label>
              <input
                type="number"
                value={formData.time_per_question || ''}
                onChange={(e) => onInputChange('time_per_question', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="No limit"
                className="w-full p-2 border border-input rounded focus:ring-2 focus:ring-primary"
                min="30"
                max="600"
              />
              <p className="text-xs text-muted-foreground mt-1">Leave empty for no time limit</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Compliance Settings Section
 */
export function ComplianceSettings({ formData, onInputChange }) {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Data Protection & Privacy</CardTitle>
          <CardDescription>
            Configure data handling and privacy compliance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">GDPR Compliance</h4>
              <p className="text-sm text-muted-foreground">
                Enable GDPR-compliant data handling and consent management
              </p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.gdpr_compliance === true}
                onChange={(e) => onInputChange('gdpr_compliance', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Enable</span>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Require Consent Banner</h4>
              <p className="text-sm text-muted-foreground">
                Show data collection consent before survey starts
              </p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.require_consent_banner === true}
                onChange={(e) => onInputChange('require_consent_banner', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Enable</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Data Retention (days)</label>
              <input
                type="number"
                value={formData.data_retention_days || 365}
                onChange={(e) => onInputChange('data_retention_days', parseInt(e.target.value))}
                className="w-full p-2 border border-input rounded focus:ring-2 focus:ring-primary"
                min="30"
                max="2555" // 7 years
              />
              <p className="text-xs text-muted-foreground mt-1">How long to keep survey data</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Anonymize After (days)</label>
              <input
                type="number"
                value={formData.anonymize_after_days || 90}
                onChange={(e) => onInputChange('anonymize_after_days', parseInt(e.target.value))}
                className="w-full p-2 border border-input rounded focus:ring-2 focus:ring-primary"
                min="1"
                max="365"
              />
              <p className="text-xs text-muted-foreground mt-1">Remove personally identifiable information</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Access Control & Security</CardTitle>
          <CardDescription>
            Configure access restrictions and security policies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Require Authentication</h4>
              <p className="text-sm text-muted-foreground">
                Force users to authenticate before taking surveys
              </p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.require_authentication === true}
                onChange={(e) => onInputChange('require_authentication', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Enable</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Device Restrictions</label>
            <select
              value={formData.device_restrictions || 'none'}
              onChange={(e) => onInputChange('device_restrictions', e.target.value)}
              className="w-full p-2 border border-input rounded focus:ring-2 focus:ring-primary"
            >
              <option value="none">No restrictions</option>
              <option value="desktop_only">Desktop only</option>
              <option value="mobile_only">Mobile only</option>
              <option value="tablet_desktop">Tablet & Desktop</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">IP Address Whitelist</label>
            <textarea
              value={formData.ip_whitelist || ''}
              onChange={(e) => onInputChange('ip_whitelist', e.target.value)}
              placeholder="192.168.1.0/24&#10;10.0.0.0/8&#10;172.16.0.0/12"
              className="w-full p-2 border border-input rounded focus:ring-2 focus:ring-primary"
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">One IP range per line (CIDR notation)</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Enterprise Features</CardTitle>
          <CardDescription>
            Advanced features for enterprise deployments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">White Label Mode</h4>
              <p className="text-sm text-muted-foreground">
                Remove all platform branding and use only your company branding
              </p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.white_label_enabled === true}
                onChange={(e) => onInputChange('white_label_enabled', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Enable</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Custom Domain</label>
            <input
              type="text"
              value={formData.custom_domain || ''}
              onChange={(e) => onInputChange('custom_domain', e.target.value)}
              placeholder="surveys.yourcompany.com"
              className="w-full p-2 border border-input rounded focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">Your custom domain for survey links</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Custom Favicon URL</label>
            <input
              type="url"
              value={formData.custom_favicon_url || ''}
              onChange={(e) => onInputChange('custom_favicon_url', e.target.value)}
              placeholder="https://yourcompany.com/favicon.ico"
              className="w-full p-2 border border-input rounded focus:ring-2 focus:ring-primary"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
