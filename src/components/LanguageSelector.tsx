import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const languages = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
];

/** Language switch: English and French. No flag images, no network request. */
export const LanguageSelector = () => {
  const { i18n, t } = useTranslation();
  const current = (i18n.resolvedLanguage || i18n.language || "en").slice(0, 2);

  const change = (code: string) => {
    void i18n.changeLanguage(code);
    document.documentElement.lang = code;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 gap-1.5 px-2.5 text-muted-foreground hover:text-forest" aria-label={t("shell.language", "Language")}>
          <Languages className="!size-[1.125rem]" />
          <span className="text-xs font-semibold uppercase">{current}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        <DropdownMenuRadioGroup value={current} onValueChange={change}>
          {languages.map((language) => (
            <DropdownMenuRadioItem key={language.code} value={language.code}>
              {language.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
