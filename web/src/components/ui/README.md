# UI Component Library

This directory contains reusable UI components for the AI Survey MVP application. All components are built with React and styled using Tailwind CSS.

## Core Components

### Form Components

#### Label (`label.jsx`)
Provides consistent labeling for form inputs.
```jsx
import { Label, LabelDescription, LabelError } from '../ui/label';

<Label htmlFor="email" required>Email Address</Label>
<LabelDescription>We'll never share your email</LabelDescription>
<LabelError>{errorMessage}</LabelError>
```

#### Input (`input.jsx`)
Enhanced input components with various styles and features.
```jsx
import { Input, Textarea, InputWithIcon, NumberInput } from '../ui/input';

<Input type="email" placeholder="Enter email" />
<Textarea rows={4} placeholder="Enter description" />
<InputWithIcon icon={<SearchIcon />} placeholder="Search..." />
<NumberInput value={count} onChange={setCount} min={0} max={100} />
```

#### Switch (`switch.jsx`)
Toggle switch for boolean values.
```jsx
import { Switch, SwitchWithLabel, SwitchCard } from '../ui/switch';

<Switch checked={enabled} onCheckedChange={setEnabled} />
<SwitchWithLabel 
  checked={enabled} 
  onCheckedChange={setEnabled}
  label="Enable notifications"
  description="Receive email updates"
/>
```

#### Checkbox (`checkbox.jsx`)
Checkbox components for single and multiple selections.
```jsx
import { Checkbox, CheckboxWithLabel, CheckboxGroup, CheckboxCard } from '../ui/checkbox';

<Checkbox checked={agreed} onChange={setAgreed} />
<CheckboxGroup
  options={[
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' }
  ]}
  value={selectedOptions}
  onChange={setSelectedOptions}
/>
```

#### Radio (`radio.jsx`)
Radio button components for single selection.
```jsx
import { Radio, RadioWithLabel, RadioGroup, RadioCard, RadioCardGroup } from '../ui/radio';

<RadioGroup
  options={['Option 1', 'Option 2', 'Option 3']}
  value={selectedOption}
  onChange={setSelectedOption}
/>
<RadioCardGroup
  options={[
    { value: 'basic', title: 'Basic Plan', description: '$10/month' },
    { value: 'pro', title: 'Pro Plan', description: '$20/month' }
  ]}
  value={selectedPlan}
  onChange={setSelectedPlan}
/>
```

#### Slider (`slider.jsx`)
Range slider components for numeric input.
```jsx
import { Slider, RangeSlider, SliderWithMarks } from '../ui/slider';

<Slider value={volume} onChange={setVolume} min={0} max={100} />
<RangeSlider value={priceRange} onChange={setPriceRange} min={0} max={1000} />
<SliderWithMarks
  value={rating}
  onChange={setRating}
  min={0}
  max={10}
  marks={[
    { value: 0, label: 'Poor' },
    { value: 5, label: 'Good' },
    { value: 10, label: 'Excellent' }
  ]}
/>
```

## Design System

### Colors
- Primary: Blue (`blue-600`, `blue-700`)
- Secondary: Gray (`gray-200`, `gray-300`, `gray-600`)
- Success: Green
- Error: Red (`red-300`, `red-500`, `red-600`)
- Warning: Yellow

### Sizing
- Small (`sm`): Compact form elements
- Default: Standard sizing
- Large (`lg`): Prominent elements

### States
- Default: Normal state
- Hover: Interactive feedback
- Focus: Keyboard navigation support
- Disabled: Non-interactive state
- Error: Validation feedback

## Accessibility

All components follow accessibility best practices:

- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Proper ARIA labels and descriptions
- **Focus Management**: Visible focus indicators
- **Color Contrast**: WCAG compliant color combinations
- **Semantic HTML**: Proper use of semantic elements

## Usage Patterns

### Form Validation
```jsx
const [email, setEmail] = useState('');
const [emailError, setEmailError] = useState('');

<div>
  <Label htmlFor="email" required>Email</Label>
  <Input
    id="email"
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    error={!!emailError}
  />
  <LabelError>{emailError}</LabelError>
</div>
```

### Settings Panels
```jsx
<div className="space-y-6">
  <SwitchWithLabel
    checked={notifications}
    onCheckedChange={setNotifications}
    label="Email Notifications"
    description="Receive updates via email"
  />
  
  <div>
    <Label>Theme Preference</Label>
    <RadioGroup
      options={['Light', 'Dark', 'System']}
      value={theme}
      onChange={setTheme}
      orientation="horizontal"
    />
  </div>
  
  <div>
    <Label>Volume</Label>
    <Slider
      value={volume}
      onChange={setVolume}
      min={0}
      max={100}
      showValue
    />
  </div>
</div>
```

## Contributing

When adding new components:

1. Follow the existing naming conventions
2. Include proper TypeScript/PropTypes
3. Add accessibility features
4. Include comprehensive examples
5. Update this README
6. Add to the index.js export file

## Testing

Components should be tested for:
- Rendering correctly
- Handling user interactions
- Accessibility compliance
- Responsive behavior
- Error states
