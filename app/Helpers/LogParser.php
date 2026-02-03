<?php

namespace App\Helpers;

use Carbon\Carbon;

class LogParser
{
    /**
     * Parse Laravel log file with pagination and filtering
     * OPTIMIZED: Uses tail for large files to prevent timeout
     * 
     * @param string $logFile Path to log file
     * @param array $filters Filters: level, search, date_from, date_to
     * @param int $page Current page
     * @param int $perPage Items per page
     * @return array
     */
    public static function parse(string $logFile, array $filters = [], int $page = 1, int $perPage = 50): array
    {
        if (!file_exists($logFile)) {
            return [
                'data' => [],
                'total' => 0,
                'current_page' => 1,
                'per_page' => $perPage,
                'last_page' => 1,
            ];
        }

        // Check file size - if too large, use tail command
        $fileSize = filesize($logFile);
        $useTail = $fileSize > 10 * 1024 * 1024; // 10MB threshold

        // Read file efficiently
        $entries = $useTail
            ? self::parseLogEntriesWithTail($logFile, 500) // Only read last 500 entries
            : self::parseLogEntriesFast($logFile, 1000);

        // Apply filters
        if (!empty($filters['level'])) {
            $entries = array_filter($entries, function ($entry) use ($filters) {
                return strtolower($entry['level']) === strtolower($filters['level']);
            });
        }

        if (!empty($filters['search'])) {
            $search = strtolower($filters['search']);
            $entries = array_filter($entries, function ($entry) use ($search) {
                return str_contains(strtolower($entry['message']), $search) ||
                    str_contains(strtolower($entry['context']), $search);
            });
        }

        if (!empty($filters['date_from'])) {
            $dateFrom = Carbon::parse($filters['date_from'])->startOfDay();
            $entries = array_filter($entries, function ($entry) use ($dateFrom) {
                return Carbon::parse($entry['timestamp'])->gte($dateFrom);
            });
        }

        if (!empty($filters['date_to'])) {
            $dateTo = Carbon::parse($filters['date_to'])->endOfDay();
            $entries = array_filter($entries, function ($entry) use ($dateTo) {
                return Carbon::parse($entry['timestamp'])->lte($dateTo);
            });
        }

        // Reset array keys
        $entries = array_values($entries);
        $total = count($entries);

        // Pagination
        $offset = ($page - 1) * $perPage;
        $paginatedEntries = array_slice($entries, $offset, $perPage);

        return [
            'data' => $paginatedEntries,
            'total' => $total,
            'current_page' => $page,
            'per_page' => $perPage,
            'last_page' => (int) ceil($total / $perPage),
        ];
    }

    /**
     * Parse log entries using tail command (FAST for large files)
     * 
     * @param string $logFile
     * @param int $maxEntries
     * @return array
     */
    private static function parseLogEntriesWithTail(string $logFile, int $maxEntries = 500): array
    {
        // Use tail to get last N lines (much faster than reading entire file)
        $linesToRead = $maxEntries * 20; // Estimate 20 lines per entry

        // Check OS
        $isWindows = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';

        if ($isWindows) {
            // Windows: Use PowerShell Get-Content -Tail
            $command = "powershell -Command \"Get-Content -Path '" . addslashes($logFile) . "' -Tail {$linesToRead}\"";
        } else {
            // Linux/Mac: Use tail
            $command = "tail -n {$linesToRead} " . escapeshellarg($logFile);
        }

        $output = [];
        exec($command, $output);

        return self::parseLines($output, $maxEntries);
    }

    /**
     * Parse log entries fast (for smaller files < 10MB)
     * 
     * @param string $logFile
     * @param int $maxEntries
     * @return array
     */
    private static function parseLogEntriesFast(string $logFile, int $maxEntries = 1000): array
    {
        // Read last N KB of file (much faster than entire file)
        $handle = fopen($logFile, 'r');
        if (!$handle) {
            return [];
        }

        // Seek to last 2MB of file
        $fileSize = filesize($logFile);
        $seekPosition = max(0, $fileSize - (2 * 1024 * 1024)); // Last 2MB

        fseek($handle, $seekPosition);
        $content = fread($handle, $fileSize - $seekPosition);
        fclose($handle);

        $lines = explode("\n", $content);

        return self::parseLines($lines, $maxEntries);
    }

    /**
     * Parse lines into structured log entries
     * 
     * @param array $lines
     * @param int $maxEntries
     * @return array
     */
    private static function parseLines(array $lines, int $maxEntries = 500): array
    {
        $entries = [];
        $currentEntry = null;

        foreach ($lines as $line) {
            // Match Laravel log pattern: [YYYY-MM-DD HH:MM:SS] environment.LEVEL: message
            if (preg_match('/^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\].*?\.(\w+):\s(.*)$/', $line, $matches)) {
                // Save previous entry
                if ($currentEntry !== null) {
                    $entries[] = $currentEntry;
                    if (count($entries) >= $maxEntries) {
                        break;
                    }
                }

                // Start new entry
                $currentEntry = [
                    'timestamp' => $matches[1],
                    'level' => strtoupper($matches[2]),
                    'message' => trim($matches[3]),
                    'context' => '',
                    'stack_trace' => '',
                ];
            } elseif ($currentEntry !== null) {
                // Continuation of previous entry (stack trace or context)
                $trimmedLine = trim($line);
                if (!empty($trimmedLine)) {
                    // Limit context/stack trace length to prevent memory issues
                    if (strlen($currentEntry['context']) + strlen($currentEntry['stack_trace']) < 5000) {
                        if (str_starts_with($trimmedLine, '#') || str_starts_with($trimmedLine, 'Stack trace:')) {
                            $currentEntry['stack_trace'] .= $trimmedLine . "\n";
                        } else {
                            $currentEntry['context'] .= $trimmedLine . "\n";
                        }
                    }
                }
            }
        }

        // Add last entry
        if ($currentEntry !== null && count($entries) < $maxEntries) {
            $entries[] = $currentEntry;
        }

        // Reverse to get newest first
        return array_reverse($entries);
    }

    /**
     * Get log file size
     * 
     * @param string $logFile
     * @return string
     */
    public static function getFileSize(string $logFile): string
    {
        if (!file_exists($logFile)) {
            return '0 B';
        }

        $bytes = filesize($logFile);
        $units = ['B', 'KB', 'MB', 'GB'];

        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }

        return round($bytes, 2) . ' ' . $units[$i];
    }

    /**
     * Get log statistics (FAST: only reads last 500 entries)
     * 
     * @param string $logFile
     * @return array
     */
    public static function getStatistics(string $logFile): array
    {
        if (!file_exists($logFile)) {
            return [
                'total_entries' => 0,
                'by_level' => [],
                'file_size' => '0 B',
                'last_modified' => null,
            ];
        }

        // Only parse last 500 entries for statistics (fast)
        $fileSize = filesize($logFile);
        $entries = $fileSize > 10 * 1024 * 1024
            ? self::parseLogEntriesWithTail($logFile, 500)
            : self::parseLogEntriesFast($logFile, 500);

        $byLevel = [];
        foreach ($entries as $entry) {
            $level = strtolower($entry['level']);
            $byLevel[$level] = ($byLevel[$level] ?? 0) + 1;
        }

        return [
            'total_entries' => count($entries),
            'by_level' => $byLevel,
            'file_size' => self::getFileSize($logFile),
            'last_modified' => Carbon::createFromTimestamp(filemtime($logFile))->toIso8601String(),
        ];
    }

    /**
     * Get available log files
     * 
     * @return array
     */
    public static function getAvailableLogFiles(): array
    {
        $logPath = storage_path('logs');
        $files = glob($logPath . '/*.log');

        $logFiles = [];
        foreach ($files as $file) {
            $logFiles[] = [
                'name' => basename($file),
                'path' => $file,
                'size' => self::getFileSize($file),
                'modified' => Carbon::createFromTimestamp(filemtime($file))->toIso8601String(),
            ];
        }

        // Sort by modified date (newest first)
        usort($logFiles, function ($a, $b) {
            return strtotime($b['modified']) - strtotime($a['modified']);
        });

        return $logFiles;
    }
}
