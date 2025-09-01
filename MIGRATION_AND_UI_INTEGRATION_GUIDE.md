# 🔄 MIGRATION & UI INTEGRATION GUIDE

## 📦 **DATA MIGRATION PLAN**

### **Step 1: Analyze Current Data**
```bash
cd api
node scripts/migrate-existing-data.js
```

This will:
- ✅ Count existing templates in all old systems
- ✅ Migrate AI Survey Templates → `ai_dynamic` type
- ✅ Migrate Survey Templates → `hybrid`/`static` types  
- ✅ Preserve all settings and configurations
- ✅ Add optimized AI settings to all migrated templates

### **Step 2: Verify Migration**
After migration, check the database:
```sql
-- See all unified templates
SELECT name, template_type, category, is_default 
FROM survey_templates_unified 
ORDER BY org_id, template_type;

-- Count by type
SELECT template_type, COUNT(*) 
FROM survey_templates_unified 
GROUP BY template_type;
```

### **Step 3: Update Campaign References**
The migration will automatically:
- Update `campaigns.unified_template_id` to point to migrated templates
- Update `survey_flows.unified_template_id` for proper template linking
- Preserve existing survey links and functionality

---

## 🎨 **NEW UI/UX INTEGRATION**

### **Frontend Component Ready:**
- **Location**: `web/src/components/dashboard/tabs/UnifiedTemplatesTab.jsx`
- **Features**: 
  - ✅ Single, clear template creation workflow
  - ✅ Template type selection (AI Dynamic, Static, Hybrid)
  - ✅ All optimization settings exposed
  - ✅ Template preview and testing
  - ✅ Clean template management interface

### **How to Replace Old UI:**

#### **Option A: Replace AI Settings Tab**
In your main dashboard component (likely `Dashboard.jsx` or navigation):

```jsx
// BEFORE (confusing multiple tabs)
import { AISettingsTab } from './tabs/AISettingsTab';
import { AISurveyTemplatesTab } from './tabs/AISurveyTemplatesTab';

// AFTER (single unified tab)
import { UnifiedTemplatesTab } from './tabs/UnifiedTemplatesTab';

// In your tab navigation:
case 'templates':
  return <UnifiedTemplatesTab user={user} />;
```

#### **Option B: Add New Tab**
Keep old tabs for transition period:

```jsx
// Add to your tab navigation
const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'templates', label: '🎯 Templates (New)', badge: 'NEW' }, // <- Add this
  { id: 'ai-settings', label: 'AI Settings (Legacy)' },
  // ... other tabs
];
```

### **New UI Features:**

#### **1. Template Type Selection**
```jsx
// Clear visual selection
🤖 AI Dynamic Survey    - Smart, adaptive questions
📋 Static Survey        - Predefined questions  
🎯 Hybrid Survey        - Mix of static + AI
```

#### **2. Optimization Settings**
```jsx
// All new AI optimizations exposed in UI
✅ Semantic Deduplication (prevents redundant questions)
✅ Fatigue Detection (stops when user tired)
✅ Dynamic Thresholds (smart completion)
✅ Question Limits (3-6 questions max)
✅ Coverage Requirements (80% info gathered)
```

#### **3. Template Management**
```jsx
// Clean template cards showing:
- Template name and type
- Category (IT Support, Requirements, etc.)
- Question limits and AI settings
- Edit/Delete/Preview actions
- Default template indicator
```

---

## 🚀 **INTEGRATION STEPS**

### **1. Run Data Migration** ⏱️ *2 minutes*
```bash
cd api
node scripts/migrate-existing-data.js
```

### **2. Update Frontend Navigation** ⏱️ *3 minutes*
```jsx
// In your dashboard navigation file
import { UnifiedTemplatesTab } from './components/dashboard/tabs/UnifiedTemplatesTab';

// Add new tab or replace existing
{ id: 'templates', label: 'Templates', component: UnifiedTemplatesTab }
```

### **3. Test New UI** ⏱️ *5 minutes*
1. Navigate to new Templates tab
2. Click "Create Template"
3. Choose "AI Dynamic" 
4. Fill in survey goal and instructions
5. Save and test

### **4. Create Test Survey** ⏱️ *3 minutes*
1. Create new campaign
2. Assign the unified template
3. Generate survey link
4. Test - should now ask 4-6 focused questions instead of 8+

---

## 🎯 **NEW UI WORKFLOW**

### **Before (Confusing):**
```
1. Go to AI Settings → Create AI Template
2. Go to Organization Settings → Create Survey Template  
3. Go to Campaign Creation → Choose Brief Template
4. Configure AI behavior in 3 different places
5. Hope they don't conflict with each other
```

### **After (Clear):**
```
1. Go to Templates → Create Template
2. Choose template type (AI Dynamic for smart surveys)
3. Configure everything in one place
4. Use template in campaigns
5. Everything just works
```

---

## 📋 **VERIFICATION CHECKLIST**

After integration, verify:

### **Backend:**
- [ ] API endpoints work: `GET /api/orgs/{orgId}/unified-templates`
- [ ] Template creation works via API
- [ ] Survey generation uses unified templates
- [ ] Question limits are respected (3-6 questions max)

### **Frontend:**
- [ ] New Templates tab loads
- [ ] Template creation modal works
- [ ] All optimization settings are configurable
- [ ] Template list shows migrated templates
- [ ] Edit/delete functionality works

### **Survey Generation:**
- [ ] New surveys use unified templates
- [ ] Question count reduced (4-6 instead of 8+)
- [ ] No redundant questions
- [ ] Better completion logic
- [ ] AI brief generation works

---

## 🎉 **SUCCESS METRICS**

You'll know it's working when:
1. **Question count drops** from 8+ to 4-6 average
2. **No redundant questions** in surveys
3. **Single template workflow** - no confusion about where to configure AI
4. **Faster survey completion** - users get through surveys quicker
5. **Better insights** - focused questions generate better data

The unified system is a complete replacement for the old overlapping template systems! 🚀
