import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation('common');

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const currentLanguage = i18n.language || 'en';

  return (
    <div
      className="flex items-center rounded-lg border border-slate-200 bg-white p-1 shadow-sm"
      role="group"
      aria-label={t('language_selector')}
    >
      <button
        type="button"
        onClick={() => changeLanguage('en')}
        aria-pressed={currentLanguage.startsWith('en')}
        aria-label={t('language_english')}
        className={`min-h-[44px] min-w-[52px] rounded-md px-3 text-sm font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200 ${
          currentLanguage.startsWith('en')
            ? 'bg-emerald-800 text-white shadow-sm'
            : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-900'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => changeLanguage('si')}
        aria-pressed={currentLanguage.startsWith('si')}
        aria-label={t('language_sinhala')}
        className={`min-h-[44px] min-w-[52px] rounded-md px-3 text-sm font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200 ${
          currentLanguage.startsWith('si')
            ? 'bg-emerald-800 text-white shadow-sm'
            : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-900'
        }`}
      >
        සි
      </button>
    </div>
  );
};

export default LanguageSwitcher;
