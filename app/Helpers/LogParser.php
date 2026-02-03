<?php

namespace App\Helpers;

use Carbon\Carbon;

class LogParser
{
    /**
     * Parse Laravel log file with pagination and filtering
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

        // Read file in reverse for better performance (newest first)
        $entries = self::parseLogEntries($logFile);

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
     * Parse log file into structured entries
     * 
     * @param string $logFile
     * @param int $maxEntries Maximum entries to parse (for performance)
     * @return array
     */
    private static function parseLogEntries(string $logFile, int $maxEntries = 1000): array
    {
        $entries = [];
        $currentEntry = null;

        // Read file line by line (memory efficient)
        $handle = fopen($logFile, 'r');
        if (!$handle) {
            return [];
        }

        // Use SplFileObject for reverse reading (newest first)
        $file = new \SplFileObject($logFile);
        $file->seek(PHP_INT_MAX);
        $totalLines = $file->key();

        // Read from bottom to top for newest entries first
        $lines = [];
        $maxLinesToRead = min($totalLines, $maxEntries * 10); // Estimate 10 lines per entry

        for ($i = $totalLines; $i >= max(0, $totalLines - $maxLinesToRead); $i--) {
            $file->seek($i);
            $line = $file->current();
            if ($line !== false) {
                array_unshift($lines, $line);
            }
        }

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
                    if (str_starts_with($trimmedLine, '#') || str_starts_with($trimmedLine, 'Stack trace:')) {
                        $currentEntry['stack_trace'] .= $trimmedLine . "\n";
                    } else {
                        $currentEntry['context'] .= $trimmedLine . "\n";
                    }
                }
            }
        }

        // Add last entry
        if ($currentEntry !== null) {
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
     * Get log statistics
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

        $entries = self::parseLogEntries($logFile, 5000); // Parse more for accurate stats

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
