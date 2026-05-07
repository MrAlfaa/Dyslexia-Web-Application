import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const currentLanguage = i18n.language || 'en';

  return (
    <div className="flex items-center bg-white/80 backdrop-blur-sm border border-gray-100 rounded-2xl p-1.5 shadow-sm">
      <button
        onClick={() => changeLanguage('en')}
        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
          currentLanguage.startsWith('en')
            ? 'bg-indigo-600 text-white shadow-md'
            : 'text-gray-500 hover:bg-gray-100'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => changeLanguage('si')}
        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
          currentLanguage.startsWith('si')
            ? 'bg-indigo-600 text-white shadow-md'
            : 'text-gray-500 hover:bg-gray-100'
        }`}
      >
        සි
      </button>
    </div>
  );
};

export default LanguageSwitcher;
