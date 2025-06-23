import React from 'react';
import { Globe } from 'lucide-react';
import { useTranslation, Language } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface LanguageSwitcherProps {
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const languages = [
  { code: 'id' as Language, name: 'Indonesia', flag: '🇮🇩' },
  { code: 'en' as Language, name: 'English', flag: '🇺🇸' },
];

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'ghost',
  size = 'sm',
  showText = false,
}) => {
  const { currentLanguage, setLanguage } = useTranslation();
  
  const currentLang = languages.find(lang => lang.code === currentLanguage);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant === 'default' ? 'default' : variant}
          size={size}
          className="flex items-center space-x-2"
        >
          <Globe className="h-4 w-4" />
          {showText && (
            <span className="hidden sm:inline">
              {currentLang?.flag} {currentLang?.name}
            </span>
          )}
          {!showText && (
            <span className="text-sm">{currentLang?.flag}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-40">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => setLanguage(language.code)}
            className={`flex items-center space-x-2 cursor-pointer ${
              currentLanguage === language.code
                ? 'bg-blue-50 text-blue-600 font-medium'
                : 'hover:bg-gray-50'
            }`}
          >
            <span className="text-lg">{language.flag}</span>
            <span>{language.name}</span>
            {currentLanguage === language.code && (
              <span className="ml-auto text-blue-600">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher; 