import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { FormInput, FormTextarea } from '../../../components/ui/form-input';

/**
 * Compliance Tab Component for Enterprise Organization Settings
 */
export function ComplianceTab({ formData, onInputChange }) {
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
                max="2555"
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

