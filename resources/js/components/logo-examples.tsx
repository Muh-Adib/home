import React from 'react';
import AppLogoIcon from './app-logo-icon';

export default function LogoExamples() {
    return (
        <div className="p-8 space-y-8">
            <h2 className="text-2xl font-bold">Logo Theme Examples</h2>
            
            {/* Default Theme */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Default Theme (Primary)</h3>
                <div className="flex items-center space-x-4">
                    <AppLogoIcon className="w-8 h-8" variant="default" />
                    <span>Default variant - follows primary color</span>
                </div>
            </div>

            {/* Primary Theme */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Primary Theme</h3>
                <div className="flex items-center space-x-4">
                    <AppLogoIcon className="w-8 h-8" variant="primary" />
                    <span>Primary variant - always primary color</span>
                </div>
            </div>

            {/* Monochrome Theme */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Monochrome Theme</h3>
                <div className="flex items-center space-x-4">
                    <AppLogoIcon className="w-8 h-8" variant="monochrome" />
                    <span>Monochrome variant - follows text color</span>
                </div>
            </div>

            {/* Custom Colors */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Custom Colors</h3>
                <div className="flex items-center space-x-4">
                    <AppLogoIcon className="w-8 h-8 text-blue-600" />
                    <span>Custom blue color</span>
                </div>
                <div className="flex items-center space-x-4">
                    <AppLogoIcon className="w-8 h-8 text-green-600" />
                    <span>Custom green color</span>
                </div>
                <div className="flex items-center space-x-4">
                    <AppLogoIcon className="w-8 h-8 text-red-600" />
                    <span>Custom red color</span>
                </div>
            </div>

            {/* Dark Mode Examples */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Dark Mode Examples</h3>
                <div className="p-4 bg-gray-900 rounded-lg">
                    <div className="flex items-center space-x-4">
                        <AppLogoIcon className="w-8 h-8 text-white" />
                        <span className="text-white">White logo on dark background</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
