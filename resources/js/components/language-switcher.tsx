import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@inertiajs/react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Globe, ChevronDown } from 'lucide-react';
import { changeLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface Language {
  code: string;
  name: string;
  flag: string;
}

const languages: Language[] = [
  {
    code: 'id',
    name: 'Bahasa Indonesia',
    flag: '🇮🇩'
  },
  {
    code: 'en', 
    name: 'English',
    flag: '🇺🇸'
  }
];

const LanguageSwitcher = ({className=''} : {className?: string}) => {
  const { i18n } = useTranslation();

  const currentLanguage = languages.find(lang => lang.code === i18n.language.substring(0, 2)) || languages[0];

  const handleLanguageChange = async (languageCode: string) => {
    try {
      console.log('Changing language to:', languageCode);
      
      // Use our custom changeLanguage function
      changeLanguage(languageCode);
      
      // Also update server-side session via route for persistence (optional, non-blocking)
      try {
        await fetch(route('locale.switch', { locale: languageCode }), {
          method: 'GET',
          credentials: 'same-origin'
        });
      } catch (error) {
        console.warn('Failed to update server session, but language changed locally:', error);
      }
      
      console.log('Language changed successfully to:', languageCode);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn("h-9 w-auto px-2 text-sm font-normal hover:bg-brand-primary-20 hover:text-brand-primary text-brand-primary", className)}
        >
          <Globe className="h-4 w-4 mr-2" />
          <span className="mr-1">{currentLanguage.flag}</span>
          <span className="hidden sm:inline">{currentLanguage.name}</span>
          <span className="sm:hidden">{currentLanguage.code.toUpperCase()}</span>
          <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 shadow-lg border-brand-primary-20">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={`cursor-pointer hover:bg-brand-primary-20 ${
              currentLanguage.code === language.code 
                ? 'bg-brand-primary-20 font-semibold text-brand-primary' 
                : 'text-foreground'
            }`}
          >
            <span className="mr-2">{language.flag}</span>
            <span>{language.name}</span>
            {currentLanguage.code === language.code && (
              <span className="ml-auto text-brand-accent font-semibold">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
