import AppLogoIcon from './app-logo-icon';
import { cn } from '@/lib/utils';

interface AppLogoProps {
    transparent?: boolean;
}

export default function AppLogo({ transparent = false }: AppLogoProps) {
    return (
        <>
            <div className={cn(
                "bg-yellow-200 text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-md",
                transparent && "bg-blue-600/20 backdrop-blur-sm"
            )}>
                <AppLogoIcon className={cn(
                    "size-5 fill-current text-black dark:text-white",
                    transparent && "text-white dark:text-black"
                )} />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className={cn(
                    "mb-0.5 truncate leading-none font-semibold text-black dark:text-white",
                    transparent && "text-white dark:text-black"
                )}>Homsjogja</span>
            </div>
        </>
    );
}
