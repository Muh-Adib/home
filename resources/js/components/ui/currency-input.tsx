import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "./input"

interface CurrencyInputProps extends Omit<React.ComponentProps<"input">, "value" | "onChange"> {
    value: number;
    onChange: (val: number) => void;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
    ({ className, value, onChange, ...props }, ref) => {
        const formatNumber = (num: number): string => {
            if (!num && num !== 0) return '';
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        };

        const parseNumber = (str: string): number => {
            const cleaned = str.replace(/[^0-9]/g, '');
            if (cleaned === '') return 0;
            return parseInt(cleaned, 10);
        };

        const [inputValue, setInputValue] = React.useState(formatNumber(value));

        React.useEffect(() => {
            setInputValue(formatNumber(value));
        }, [value]);

        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const val = e.target.value;
            const numericStr = val.replace(/[^0-9]/g, '');
            const parsed = parseNumber(numericStr);
            setInputValue(formatNumber(parsed));
            onChange(parsed);
        };

        return (
            <div className="relative flex items-center w-full" data-slot="currency-input-wrapper">
                <span className="absolute left-3 text-slate-400 font-semibold text-sm select-none pointer-events-none">Rp</span>
                <Input
                    ref={ref}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    className={cn("pl-8 pr-3 font-semibold", className)}
                    {...props}
                />
            </div>
        );
    }
);

CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
