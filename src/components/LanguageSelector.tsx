import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const languages = [
  { 
    code: 'en', 
    name: 'English', 
    nativeName: 'English', 
    flagUrl: 'https://flagcdn.com/w40/us.png'
  },
  { 
    code: 'fr', 
    name: 'French', 
    nativeName: 'Français', 
    flagUrl: '/images/flag-france.jpg'
  },
];

export const LanguageSelector = () => {
  const { i18n } = useTranslation();

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    document.documentElement.lang = languageCode;
  };

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  return (
    <Select value={i18n.language} onValueChange={handleLanguageChange}>
      <SelectTrigger className="w-[50px] border-gray-300 px-2">
        <SelectValue>
          <img 
            src={currentLanguage.flagUrl} 
            alt={currentLanguage.name}
            className="w-6 h-4 object-cover rounded-sm"
          />
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            <div className="flex items-center gap-2">
              <img 
                src={lang.flagUrl} 
                alt={lang.name}
                className="w-6 h-4 object-cover rounded-sm"
              />
              <span>{lang.nativeName}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
