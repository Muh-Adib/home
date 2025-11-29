import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@inertiajs/react";
import { useTranslation } from "react-i18next";

export default function CookieConsent() {
  const [show, setShow] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const accepted = localStorage.getItem("cookie-consent");
    if (!accepted) {
      setTimeout(() => setShow(true), 800); // Delay ringan agar tidak ganggu saat open page
    }
  }, []);

  const accept = () => {
    localStorage.setItem("cookie-consent", "true");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-trasparant shadow-none border-none p-4 md:p-5">
      <div className="bg-card border border-border shadow-lg rounded-xl p-4 md:p-5 flex flex-col md:flex-row gap-4 items-start md:items-center">
        
        {/* TEXT */}
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
          Kami menggunakan cookies untuk meningkatkan pengalaman pengguna dan menganalisis performa situs.
          Dengan melanjutkan, Anda menyetujui penggunaan cookies. 
          Baca lebih lanjut di 
          <Link href="/cookies" className="text-brand-primary font-medium hover:underline mx-1">Cookie Policy</Link>
          dan 
          <Link href="/privacy" className="text-brand-primary font-medium hover:underline ml-1">Privacy Policy</Link>.
        </p>

        {/* BUTTONS */}
        <div className="flex-shrink-0 flex gap-3 w-full md:w-auto justify-center">
          <Button 
            variant="outline" 
            className="w-auto md:w-auto px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition text-sm md:text-base"
            onClick={() => setShow(false)}
          >
            {t("Later") || "Nanti"}
          </Button>

          <Button 
            className="w-auto md:w-auto px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition text-sm md:text-base font-semibold"
            onClick={accept}
          >
            {t("Accept") || "Setuju"}
          </Button>
        </div>

      </div>
    </div>
  );
}
