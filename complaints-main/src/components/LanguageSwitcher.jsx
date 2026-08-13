import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { Globe } from 'lucide-react';

export const LanguageSwitcher = () => {
  const { t } = useTranslation();
  const { changeLanguage, getCurrentLanguage } = useLanguage();
  const currentLanguage = getCurrentLanguage();

  return (
    <div className="flex items-center gap-2">
      <Globe size={20} className="text-gray-600" />
      <select
        value={currentLanguage}
        onChange={(e) => changeLanguage(e.target.value)}
        className="px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        aria-label={t('common.language')}
      >
        <option value="en">{t('common.english')}</option>
        <option value="am">{t('common.amharic')}</option>
      </select>
    </div>
  );
};

export default LanguageSwitcher;
