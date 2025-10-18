/**
 * Settings tab component
 */
export function SettingsTab({ selectedCampaign }) {
  return (
    <div className="surface card-pad">
      <SettingsHeader />
      <CampaignSettings campaign={selectedCampaign} />
    </div>
  );
}

/**
 * Settings section header
 */
function SettingsHeader() {
  return (
    <h3 className="text-lg font-medium">Campaign Settings</h3>
  );
}

/**
 * Campaign settings form
 */
function CampaignSettings({ campaign }) {
  return (
    <div className="space-y-4 mt-6">
      <SettingField
        label="Name"
        value={campaign.name}
        type="input"
      />
      
      <SettingField
        label="Slug"
        value={campaign.slug}
        type="input"
      />
      
      <SettingField
        label="Purpose"
        value={campaign.purpose}
        type="textarea"
      />
      
      <SettingField
        label="Brief Template"
        value={campaign.template_md}
        type="textarea"
        rows={14}
        monospace
      />
    </div>
  );
}

/**
 * Individual setting field component
 */
function SettingField({ 
  label, 
  value, 
  type = "input", 
  rows = 3, 
  monospace = false 
}) {
  const baseClasses = monospace 
    ? "form-textarea-enhanced"
    : type === "textarea" 
      ? "form-textarea-enhanced" 
      : "form-input-enhanced";
      
  const style = monospace 
    ? { fontFamily: 'ui-monospace, monospace', fontSize: '0.875rem' }
    : {};

  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {type === "textarea" ? (
        <textarea
          className={baseClasses}
          value={value}
          readOnly
          rows={rows}
          style={style}
        />
      ) : (
        <input
          type="text"
          className={baseClasses}
          value={value}
          readOnly
        />
      )}
    </div>
  );
}
