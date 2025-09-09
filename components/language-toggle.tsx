'use client';

import { useLanguage } from '@/lib/contexts/language-context';
import { Button } from './ui/button';
import { Languages } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export const LanguageToggle = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 px-2 py-1 h-auto text-muted-foreground hover:text-foreground"
        >
          <Languages className="w-4 h-4" />
          <span className="text-sm">
            {language === 'en' ? '🇺🇸 EN' : '🇪🇸 ES'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        <DropdownMenuItem
          onClick={() => setLanguage('en')}
          className={`cursor-pointer ${
            language === 'en' ? 'bg-accent text-accent-foreground' : ''
          }`}
        >
          🇺🇸 English
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLanguage('es')}
          className={`cursor-pointer ${
            language === 'es' ? 'bg-accent text-accent-foreground' : ''
          }`}
        >
          🇪🇸 Español
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
