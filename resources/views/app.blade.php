                              <!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'system') == 'dark'])>

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <meta name="csrf-token" content="{{ csrf_token() }}">

    {{-- Inline script to detect system dark mode preference and apply it immediately --}}
    <script>
        (function () {
            const appearance = '{{ $appearance ?? "system" }}';

            if (appearance === 'system') {
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                if (prefersDark) {
                    document.documentElement.classList.add('dark');
                }
            }
        })();
    </script>

    <script defer src="https://umami.homsjogja.cloud/script.js"
        data-website-id="20a0dc87-67d7-44f4-95b7-d1efa140d1ed"></script>

    {{-- Google Analytics GA4 — Hanya untuk halaman publik (bukan admin/staff/dashboard) --}}
    @php
        $isAdminRoute = request()->is('admin/*', 'staff/*', 'dashboard*', 'settings/*', 'my-bookings*', 'my-payments*');
    @endphp
    @if(!$isAdminRoute)
    <!-- Google tag (gtag.js) G-314DHT11HB -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-314DHT11HB"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-314DHT11HB', {
            'anonymize_ip': true,
            'cookie_flags': 'SameSite=None;Secure',
            'send_page_view': true
        });
    </script>
    @endif

    {{-- Inline style to set the HTML background color based on our theme in app.css --}}
    <style>
        html {
            background-color: oklch(1 0 0);
        }

        html.dark {
            background-color: oklch(0.145 0 0);
        }
    </style>

    <title data-inertia>{{ data_get($page, 'props.seo.title', config('app.name', 'Laravel')) }}</title>

    @php
        // Prioritaskan favicon dari settings, jika tidak ada gunakan logo brand
        $faviconPath = config('app.favicon_path');
        $faviconUrl = $faviconPath ? asset('storage/' . $faviconPath) : asset('logo.svg');
    @endphp

    {{-- Favicon menggunakan logo brand atau favicon dari settings --}}
    <link rel="icon" href="{{ $faviconUrl }}" type="image/svg+xml">
    <link rel="icon" href="{{ $faviconUrl }}" sizes="any">
    <link rel="apple-touch-icon" href="{{ $faviconUrl }}">

    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />

    @routes
    @viteReactRefresh
    @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
    @inertiaHead
</head>

<body class="font-sans antialiased">
    @inertia
</body>

</html>