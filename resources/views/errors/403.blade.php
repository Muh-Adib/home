<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Akses Ditolak (403) - Homs Jogja</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
        }
    </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-4">
    <div class="max-w-md w-full bg-slate-900/80 backdrop-blur-md rounded-2xl p-6 md:p-8 shadow-2xl border border-slate-800 flex flex-col items-center text-center">
        <!-- Shield Icon -->
        <div class="h-16 w-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-6 border border-rose-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
        </div>

        <h1 class="text-4xl font-extrabold text-slate-100 tracking-tight">403</h1>
        <h2 class="text-xl font-bold text-rose-500 mt-2">Akses Terbatasi / Ditolak</h2>
        
        <div class="w-full bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 text-left space-y-2 mt-6 mb-8 text-xs md:text-sm">
            <div class="flex justify-between border-b border-slate-800 pb-1.5">
                <span class="text-slate-400">Pesan Error:</span>
                <span class="font-semibold text-rose-400 text-right">{{ isset($exception) ? $exception->getMessage() : 'Akses ditolak oleh sistem keamanan.' }}</span>
            </div>
            <div class="flex justify-between border-b border-slate-800 pb-1.5">
                <span class="text-slate-400">Halaman URL:</span>
                <span class="font-mono text-slate-300 text-right break-all ml-4">{{ request()->path() }}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-slate-400">Akun / Role:</span>
                <span class="font-semibold text-slate-300 capitalize">{{ auth()->check() ? auth()->user()->role : 'Guest' }} ({{ auth()->check() ? auth()->user()->name : '-' }})</span>
            </div>
        </div>

        <div class="grid grid-cols-2 gap-3 w-full">
            <a href="{{ url()->previous() }}" class="flex items-center justify-center px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl border border-slate-700 transition duration-150">
                Kembali
            </a>
            <a href="{{ route('dashboard') }}" class="flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition duration-150">
                Dashboard
            </a>
        </div>
    </div>
</body>
</html>
