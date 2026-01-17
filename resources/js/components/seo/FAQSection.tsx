import React from 'react';
import { usePage } from '@inertiajs/react';
import type { PageProps } from '@/types';

export interface FAQItem {
    question: string;
    answer: string;
}

interface FAQSectionProps {
    items?: FAQItem[];
    className?: string;
}

export function FAQSection({ items, className = '' }: FAQSectionProps) {
    // Get FAQs from props or page data
    const { faqs } = usePage<PageProps>().props;
    const faqItems = items || faqs || [];

    if (faqItems.length === 0) {
        return null;
    }

    return (
        <div className={`faq-section ${className}`}>
            <h2 className="text-3xl font-bold text-foreground mb-8">
                Pertanyaan yang Sering Diajukan
            </h2>

            <div className="space-y-4">
                {faqItems.map((faq, index) => (
                    <details
                        key={index}
                        className="group bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                        <summary className="cursor-pointer font-semibold text-lg text-foreground list-none flex items-center justify-between">
                            <span>{faq.question}</span>
                            <svg
                                className="w-5 h-5 text-muted-foreground transition-transform group-open:rotate-180"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                />
                            </svg>
                        </summary>
                        <div className="mt-4 text-muted-foreground leading-relaxed">
                            {faq.answer}
                        </div>
                    </details>
                ))}
            </div>
        </div>
    );
}
