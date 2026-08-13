# Component Translations Integration Guide

This guide shows how to integrate the Amharic and English translations into all your component files.

## Quick Reference - Translation Keys Available

### Common UI Elements
- `common.filter` - "Filter" / "ማጣሪያ"
- `common.hideFilters` - "Hide Filters" / "ማጣሪያዎች ደብቅ"
- `common.reset` - "Reset" / "እንደገና ያስጀምሩ"
- `common.search` - "Search" / "ፈልግ"
- `common.export` - "Export" / "ላክ"
- `common.actions` - "Actions" / "ድርጊቶች"
- `common.all` - "All" / "ሁሉም"
- `common.loading` - "Loading..." / "ጠብቅ..."

### Component-Specific Keys

#### Assessment Component
- `components.assessment.searchPlaceholder` - "Search assessments..."
- `components.assessment.statusLabel` - "Status"
- `components.assessment.allOption` - "All"
- `components.assessment.assessmentOption` - "Assessment"
- `components.assessment.assessedOption` - "Assessed"
- `assessment.reviewAllAssessment` - "Review all assessment findings and recommendations."

#### Complaint Component
- `components.complaint.searchPlaceholder` - "Search complaints by ID, name, TIN or subject..."
- `components.complaint.statusLabel` - "Status"
- `components.complaint.pendingStatus` - "Pending"
- `components.complaint.assignedStatus` - "Assigned"
- `components.complaint.inProgressStatus` - "In Progress"
- `components.complaint.closedStatus` - "Closed"
- `components.complaint.approvedStatus` - "Approved"
- `complaint.manageAndReview` - "Manage and review taxpayer complaints in this category."
- `complaint.addComplaint` - "Add Complaint"

#### Response Component
- `components.response.searchPlaceholder` - "Search responses..."
- `components.response.roleLabel` - "Role"
- `response.manageAndReview` - "Manage and review all case responses and communications."

#### Notification Bell
- `components.notificationBell.notifications` - "Notifications"
- `components.notificationBell.markAllAsRead` - "Mark all as read"
- `components.notificationBell.clearAll` - "Clear All"

### Table Headers & Labels
- `assessment.caseId`, `assessment.complainant`, `assessment.taxCenter`, `assessment.findings`, `assessment.createdDate`
- `complaint.tin`, `complaint.complainant`, `complaint.email`, `complaint.phone`, `complaint.address`, `complaint.caseId`, `complaint.mrcCode`, `complaint.refNo`, `complaint.category`, `complaint.subject`, `complaint.description`, `complaint.status`, `complaint.appliedDate`, `complaint.dueDate`
- `response.sender`, `response.role`, `response.message`, `response.sentDate`

### Status Values
- `statuses.pending` - "Pending" / "ጥሪት"
- `statuses.assigned` - "Assigned" / "ሞክርተዋል"
- `statuses.inProgress` - "In Progress" / "በሂደት ላይ"
- `statuses.closed` - "Closed" / "የተዘጉ"
- `statuses.approved` - "Approved" / "የተተገበሩ"

## How to Use in Components

### Step 1: Import useTranslation Hook
```jsx
import { useTranslation } from 'react-i18next';

export function AssessmentList({ title }) {
  const { t } = useTranslation();
  // ... rest of component
}
```

### Step 2: Replace Hardcoded Strings with Translation Keys

**Before:**
```jsx
<input 
  type="text" 
  placeholder="Search assessments..." 
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
/>
```

**After:**
```jsx
<input 
  type="text" 
  placeholder={t('components.assessment.searchPlaceholder')}
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
/>
```

### Step 3: Update Button Labels
**Before:**
```jsx
<button onClick={() => setShowFilters((prev) => !prev)}>
  <Filter size={16} /> {showFilters ? 'Hide Filters' : 'Filter'}
</button>
```

**After:**
```jsx
<button onClick={() => setShowFilters((prev) => !prev)}>
  <Filter size={16} /> {showFilters ? t('common.hideFilters') : t('common.filter')}
</button>
```

### Step 4: Update Table Headers
**Before:**
```jsx
<th className="px-6 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest">Case ID</th>
<th className="px-6 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest">Complainant</th>
```

**After:**
```jsx
<th className="px-6 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest">{t('assessment.caseId')}</th>
<th className="px-6 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest">{t('assessment.complainant')}</th>
```

### Step 5: Update Select Options
**Before:**
```jsx
<select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
  <option value="all">All</option>
  <option value="ASSESSMENT">Assessment</option>
  <option value="ASSESSED">Assessed</option>
</select>
```

**After:**
```jsx
<select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
  <option value="all">{t('components.assessment.allOption')}</option>
  <option value="ASSESSMENT">{t('components.assessment.assessmentOption')}</option>
  <option value="ASSESSED">{t('components.assessment.assessedOption')}</option>
</select>
```

### Step 6: Update Descriptive Text
**Before:**
```jsx
<p className="text-sky-500 mt-2">Review all assessment findings and recommendations.</p>
```

**After:**
```jsx
<p className="text-sky-500 mt-2">{t('assessment.reviewAllAssessment')}</p>
```

### Step 7: Update Empty States
**Before:**
```jsx
<p className="text-sky-400 font-medium">No assessments found.</p>
```

**After:**
```jsx
<p className="text-sky-400 font-medium">{t('messages.noAssessmentsFound')}</p>
```

## Components to Update

### Priority Files
1. **AssessmentList.jsx** - Multiple strings for search, filter, status options, table headers, export labels
2. **ComplaintList.jsx** - Many strings for search, filter, status options, table headers, stats labels, export
3. **ResponseList.jsx** - Search, filter, status options, table headers, export labels
4. **Sidebar.jsx** - All navigation menu items (already using string titles - replace with t() calls)
5. **InternalLayout.jsx** - "Head Office Appeals" button label, Loading text
6. **NotificationBell.jsx** - "Notifications", "Mark all as read", "Clear All" labels
7. **modals/AssessmentModal.tsx** - Any visible strings in this modal
8. **modals/ResponseModal.tsx** - Any visible strings in this modal

## Migration Checklist

- [ ] Update AssessmentList.jsx
  - [ ] Search placeholder
  - [ ] Filter button label
  - [ ] Hide Filters label
  - [ ] Status label and options
  - [ ] Reset button
  - [ ] Export button
  - [ ] Table headers
  - [ ] Empty state message
  - [ ] Descriptive text

- [ ] Update ComplaintList.jsx
  - [ ] Search placeholder
  - [ ] Filter button, Hide Filters label
  - [ ] Status filter and options
  - [ ] Add Complaint button
  - [ ] Export button
  - [ ] Table headers (all 16+ columns)
  - [ ] Stats panel labels (Total, Pending, Active, Closed, Categories)
  - [ ] Empty state message

- [ ] Update ResponseList.jsx
  - [ ] Search placeholder
  - [ ] Filter button labels
  - [ ] Role filter and options
  - [ ] Export button
  - [ ] Table headers
  - [ ] Empty state message

- [ ] Update Sidebar.jsx
  - [ ] All navigation menu items

- [ ] Update InternalLayout.jsx
  - [ ] "Head Office Appeals" link text

- [ ] Update NotificationBell.jsx
  - [ ] Notification title
  - [ ] Mark all as read button
  - [ ] Clear All button

- [ ] Update modals (if they have visible text)

## Example: Translating AssessmentList

Here's a complete example of how to update the AssessmentList component:

```jsx
import { useTranslation } from 'react-i18next';

export function AssessmentList({ title, status, userId, complaintId, trackingCode }) {
  const { t } = useTranslation();
  // ... existing state

  return (
    <div className="bg-white rounded-[2.5rem] border border-sky-100 shadow-sm p-8 md:p-12 min-h-full">
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-sky-900 tracking-tight italic serif">{title}</h1>
            <p className="text-sky-500 mt-2">{t('assessment.reviewAllAssessment')}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowFilters((prev) => !prev)}>
              <Filter size={16} /> {showFilters ? t('common.hideFilters') : t('common.filter')}
            </button>
            <button onClick={handleExport}>
              <Download size={16} /> {t('common.export')}
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="rounded-[2rem] border border-sky-100 bg-sky-50 p-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-sky-700">{t('components.assessment.statusLabel')}</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">{t('components.assessment.allOption')}</option>
                  <option value="ASSESSMENT">{t('components.assessment.assessmentOption')}</option>
                  <option value="ASSESSED">{t('components.assessment.assessedOption')}</option>
                </select>
              </div>
              <button onClick={() => setStatusFilter('all')}>
                {t('common.reset')}
              </button>
            </div>
          </div>
        )}

        <div className="bg-sky-50 rounded-3xl border border-sky-100 overflow-hidden">
          <div className="p-6 border-b border-sky-200 bg-sky-100/50">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-400" size={18} />
              <input 
                type="text" 
                placeholder={t('components.assessment.searchPlaceholder')}
                className="w-full pl-10 pr-4 py-2 bg-white border border-sky-200 rounded-xl text-sm focus:ring-1 focus:ring-sky-500 transition-all outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-sky-100/50 border-b border-sky-200">
                <th className="px-6 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest">
                  {t('assessment.caseId')}
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest">
                  {t('assessment.complainant')}
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest">
                  {t('assessment.assessor')}
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest">
                  {t('assessment.taxCenter')}
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest">
                  {t('assessment.findings')}
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest">
                  {t('assessment.createdDate')}
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest text-right">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-200">
              {isLoading ? (
                [1, 2, 3].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="px-6 py-8">
                      <div className="h-4 bg-sky-200 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredAssessments.length > 0 ? (
                filteredAssessments.map((a, i) => (
                  // ... render rows
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <p className="text-sky-400 font-medium">{t('messages.noAssessmentsFound')}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

## Adding New Translation Keys

When you find text that needs translation:

1. Add the key-value pair to both `/src/locales/en.json` and `/src/locales/am.json`
2. Organize by feature/component
3. Use descriptive key names
4. Use the key in your component with `t('section.key')`

Example:
```json
{
  "myNewFeature": {
    "buttonLabel": "Click Me"
  }
}
```

Usage:
```jsx
<button>{t('myNewFeature.buttonLabel')}</button>
```

## Tips

- Keep keys organized by feature to avoid duplicates
- Use nested objects for related strings
- Prefix component-specific strings with `components.componentName`
- Test with both languages to ensure text fits in UI
- Check for RTL layout issues with Amharic text
