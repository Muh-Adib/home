import { useTranslation } from 'react-i18next';
import { Link } from '@inertiajs/react';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const current = i18n.language.substring(0, 2);

  return (
    <div className="flex gap-2 text-sm">
      {['id', 'en'].map((lng) => (
        <Link
          key={lng}
          href={route('locale.switch', { locale: lng })}
          className={
            current === lng ? 'font-bold underline' : 'text-gray-500 hover:text-black dark:hover:text-white'
          }
        >
          {lng.toUpperCase()}
        </Link>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
