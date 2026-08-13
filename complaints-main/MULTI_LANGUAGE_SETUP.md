# Multi-Language Support Documentation

This project now supports Amharic (አማርኛ) and English translations.

## Setup Files Created

### Translation Files
- **`src/locales/en.json`** - English translations
- **`src/locales/am.json`** - Amharic translations

### Configuration
- **`src/i18n/config.js`** - i18next configuration and initialization
- **`src/contexts/LanguageContext.jsx`** - Language context provider
- **`src/components/LanguageSwitcher.jsx`** - Language switcher component

## How to Use Translations

### 1. In React Components

Use the `useTranslation` hook from `react-i18next`:

```jsx
import { useTranslation } from 'react-i18next';

export function MyComponent() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('common.welcome')}</h1>
      <p>{t('complaint.title')}</p>
      <button>{t('common.submit')}</button>
    </div>
  );
}
```

### 2. Add Language Switcher to UI

Add the `LanguageSwitcher` component to your layout (e.g., in the header or navigation):

```jsx
import LanguageSwitcher from './components/LanguageSwitcher';

export function Header() {
  return (
    <header>
      <nav>
        {/* Other nav items */}
        <LanguageSwitcher />
      </nav>
    </header>
  );
}
```

### 3. Use Language Context

For programmatic language changes:

```jsx
import { useLanguage } from './contexts/LanguageContext';

export function MyComponent() {
  const { changeLanguage, getCurrentLanguage } = useLanguage();

  return (
    <div>
      <button onClick={() => changeLanguage('en')}>English</button>
      <button onClick={() => changeLanguage('am')}>አማርኛ</button>
      <p>Current language: {getCurrentLanguage()}</p>
    </div>
  );
}
```

## Adding New Translations

### 1. Add to JSON Files

Update `src/locales/en.json` and `src/locales/am.json`:

```json
{
  "section": {
    "key": "English text",
    "anotherKey": "Another English text"
  }
}
```

```json
{
  "section": {
    "key": "አማርኛ ጽሑፍ",
    "anotherKey": "ሌላ አማርኛ ጽሑፍ"
  }
}
```

### 2. Use in Component

```jsx
const { t } = useTranslation();
const text = t('section.key');
```

## Translation Keys Structure

The translations are organized into sections:
- **`common`** - Common terms used throughout the app
- **`navigation`** - Navigation menu items
- **`auth`** - Authentication related strings
- **`complaint`** - Complaint related strings
- **`assessment`** - Assessment related strings
- **`response`** - Response related strings
- **`admin`** - Admin panel strings
- **`messages`** - System messages and notifications

## Language Persistence

The selected language is automatically saved to `localStorage` under the key `language` and will persist across browser sessions.

## RTL Support for Amharic

When Amharic is selected:
- The document direction is automatically set to `rtl` (right-to-left)
- This affects text alignment and layout flow
- CSS should account for RTL layout when needed

## Installation

The required dependencies have been added to `package.json`:
- `i18next`: ^23.7.6
- `react-i18next`: ^14.0.0

Install them by running:
```bash
npm install
```

## Testing Language Switch

1. Run the development server
2. Look for the language switcher component (Globe icon + select dropdown)
3. Switch between English and Amharic
4. Verify that all text updates accordingly
5. Refresh the page - the selected language should persist

## Best Practices

1. Always use translation keys instead of hardcoding strings
2. Keep translation keys organized and nested by feature
3. Maintain parity between en.json and am.json
4. Use descriptive key names that indicate the content
5. For dynamic content, use interpolation:

```jsx
// In JSON:
{
  "greeting": "Hello, {{name}}!"
}

// In component:
const { t } = useTranslation();
const greeting = t('greeting', { name: 'John' });
```

## Troubleshooting

### Translations not showing?
1. Ensure i18n/config.js is imported in main.jsx
2. Check that LanguageProvider wraps your app in App.jsx
3. Verify the translation key exists in both en.json and am.json
4. Check browser console for i18next warnings

### Language not persisting?
1. Check if localStorage is enabled
2. Look in browser DevTools > Application > localStorage for "language" key
3. Clear localStorage and select language again

### RTL layout issues?
1. Review CSS for hardcoded left/right positioning
2. Use logical CSS properties (flex, grid) instead of absolute positioning
3. Use CSS direction utilities from Tailwind if available
