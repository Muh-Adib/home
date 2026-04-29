<?php

namespace App\Http\Controllers\Dev;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\File;

class CodeVisController extends Controller
{
    /** Directories to scan, relative to base_path() */
    private array $scanDirs = [
        'app/Actions',
        'app/Console/Commands',
        'app/Domain',
        'app/Events',
        'app/Exceptions',
        'app/Exports',
        'app/Helpers',
        'app/Http/Controllers',
        'app/Http/Middleware',
        'app/Http/Requests',
        'app/Models',
        'app/Repositories',
        'app/Services',
        'routes',
        'resources/js/pages',
        'resources/js/components',
        'resources/js/hooks',
        'resources/js/layouts',
        'resources/js/lib',
        'resources/js/utils',
        'resources/js/types',
    ];

    public function index(): JsonResponse
    {
        $tree = $this->buildTree();
        $nodes = $this->buildNodes();
        $edges = $this->buildEdges($nodes);

        return response()->json([
            'tree' => $tree,
            'graph' => [
                'nodes' => array_values($nodes),
                'edges' => $edges,
            ],
            'scanned_at' => now()->toISOString(),
        ]);
    }

    private function buildTree(): array
    {
        $result = [];
        foreach ($this->scanDirs as $dir) {
            $fullPath = base_path($dir);
            if (File::isDirectory($fullPath)) {
                $result[] = $this->scanDirectory($fullPath, $dir);
            }
        }

        return $result;
    }

    private function scanDirectory(string $fullPath, string $relativePath): array
    {
        $node = [
            'id' => $relativePath,
            'name' => basename($relativePath),
            'type' => 'directory',
            'path' => $relativePath,
            'children' => [],
        ];

        $items = File::directories($fullPath);
        foreach ($items as $dir) {
            $rel = $relativePath.'/'.basename($dir);
            $node['children'][] = $this->scanDirectory($dir, $rel);
        }

        $files = File::files($fullPath);
        foreach ($files as $file) {
            $ext = $file->getExtension();
            if (! in_array($ext, ['php', 'ts', 'tsx', 'js', 'jsx'])) {
                continue;
            }
            $rel = $relativePath.'/'.$file->getFilename();
            $node['children'][] = [
                'id' => $rel,
                'name' => $file->getFilename(),
                'type' => 'file',
                'ext' => $ext,
                'path' => $rel,
                'size' => $file->getSize(),
                'modified' => filemtime($file->getPathname()),
            ];
        }

        return $node;
    }

    /** @return array<string, array> */
    private function buildNodes(): array
    {
        $nodes = [];
        foreach ($this->scanDirs as $dir) {
            $fullPath = base_path($dir);
            if (! File::isDirectory($fullPath)) {
                continue;
            }
            $files = File::allFiles($fullPath);
            foreach ($files as $file) {
                $ext = $file->getExtension();
                if (! in_array($ext, ['php', 'ts', 'tsx', 'js', 'jsx'])) {
                    continue;
                }
                $rel = str_replace('\\', '/', $file->getRelativePathname());
                $id = $dir.'/'.$rel;
                $nodes[$id] = [
                    'id' => $id,
                    'name' => $file->getFilenameWithoutExtension(),
                    'file' => $file->getFilename(),
                    'path' => $id,
                    'ext' => $ext,
                    'group' => $this->classifyGroup($id),
                    'size' => $file->getSize(),
                ];
            }
        }

        return $nodes;
    }

    /** @param array<string, array> $nodes */
    private function buildEdges(array $nodes): array
    {
        $edges = [];
        $nodeIds = array_keys($nodes);

        foreach ($nodes as $id => $node) {
            $fullPath = base_path($id);
            if (! File::exists($fullPath)) {
                continue;
            }

            $content = File::get($fullPath);
            $deps = $this->extractDependencies($content, $node['ext']);

            foreach ($deps as $dep) {
                $target = $this->resolveTarget($dep, $id, $nodeIds, $node['ext']);
                if ($target && $target !== $id) {
                    $edges[] = [
                        'source' => $id,
                        'target' => $target,
                        'type' => $this->edgeType($id, $target),
                    ];
                }
            }
        }

        // Deduplicate
        $seen = [];
        $unique = [];
        foreach ($edges as $e) {
            $key = $e['source'].'|'.$e['target'];
            if (! isset($seen[$key])) {
                $seen[$key] = true;
                $unique[] = $e;
            }
        }

        return $unique;
    }

    private function extractDependencies(string $content, string $ext): array
    {
        $deps = [];

        if ($ext === 'php') {
            // 1. use App\... (with optional alias)
            preg_match_all('/^use\s+(App\\\\[^\s;,{]+)/m', $content, $m);
            foreach ($m[1] as $fqn) {
                $deps[] = rtrim($fqn, ';');
            }

            // 2. Inline FQCN: \App\... anywhere in code (new X, ::class, type-hints)
            preg_match_all('/\\\\?(App\\\\[A-Za-z\\\\]+)/', $content, $m);
            foreach ($m[1] as $fqn) {
                $deps[] = $fqn;
            }

            // 3. Short class names in constructor/method params and property declarations
            //    Matches: visibility/comma/paren + "TypeName $var"
            //    Safe pattern — no nested quantifiers, no backtracking risk
            $namespace = $this->extractNamespace($content);
            preg_match_all('/(?:private|protected|public|readonly|,|\()[ \t]+(?:readonly[ \t]+)?([A-Z][A-Za-z0-9]+)[ \t]+\$/', $content, $m);
            $skip = ['string', 'int', 'bool', 'float', 'array', 'object', 'self', 'static', 'null', 'mixed', 'void', 'never', 'iterable', 'callable'];
            foreach ($m[1] as $shortClass) {
                if (in_array($shortClass, $skip)) {
                    continue;
                }
                $deps[] = $namespace.'\\'.$shortClass;
            }
        } else {
            // TS/JS: import ... from '...' — only relative/aliased paths
            preg_match_all('/from\s+[\'"]([^\'"\s]+)[\'"]/m', $content, $m);
            foreach ($m[1] as $imp) {
                if ($imp[0] === '.' || str_starts_with($imp, '@/') || str_starts_with($imp, '~/')) {
                    $deps[] = $imp;
                }
            }
        }

        return array_unique($deps);
    }

    private function extractNamespace(string $content): string
    {
        if (preg_match('/^namespace\s+(App\\\\[^;]+);/m', $content, $m)) {
            return $m[1];
        }

        return 'App';
    }

    /** @param string[] $nodeIds */
    private function resolveTarget(string $dep, string $sourceId, array $nodeIds, string $ext): ?string
    {
        if ($ext === 'php') {
            $path = str_replace('\\', '/', $dep);
            $path = lcfirst($path).'.php';

            // Exact suffix match
            foreach ($nodeIds as $nid) {
                if (str_ends_with($nid, $path)) {
                    return $nid;
                }
            }

            // Fallback: basename match for short class names resolved to wrong namespace
            $basename = basename($path);
            $candidates = array_values(array_filter($nodeIds, fn ($nid) => str_ends_with($nid, '/'.$basename)));
            if (count($candidates) === 1) {
                return $candidates[0];
            }
        } else {
            // Resolve relative TS/JS import
            $sourceDir = dirname($sourceId);
            $dep = preg_replace('/\.(tsx?|jsx?)$/', '', $dep);

            if (str_starts_with($dep, '@/') || str_starts_with($dep, '~/')) {
                $dep = 'resources/js/'.substr($dep, 2);
            } elseif (str_starts_with($dep, '.')) {
                $dep = $this->resolvePath($sourceDir.'/'.$dep);
            } else {
                return null;
            }

            foreach (['', '.ts', '.tsx', '.js', '.jsx'] as $suffix) {
                $candidate = $dep.$suffix;
                if (in_array($candidate, $nodeIds)) {
                    return $candidate;
                }
                $idx = $dep.'/index'.$suffix;
                if (in_array($idx, $nodeIds)) {
                    return $idx;
                }
            }
        }

        return null;
    }

    private function resolvePath(string $path): string
    {
        $parts = explode('/', $path);
        $resolved = [];
        foreach ($parts as $p) {
            if ($p === '..') {
                array_pop($resolved);
            } elseif ($p !== '.') {
                $resolved[] = $p;
            }
        }

        return implode('/', $resolved);
    }

    private function classifyGroup(string $path): string
    {
        return match (true) {
            str_contains($path, '/Controllers/Admin') => 'controller-admin',
            str_contains($path, '/Controllers/Auth') => 'controller-auth',
            str_contains($path, '/Controllers/Staff') => 'controller-staff',
            str_contains($path, '/Controllers/Settings') => 'controller-settings',
            str_contains($path, '/Controllers') => 'controller',
            str_contains($path, '/Models') => 'model',
            str_contains($path, '/Services') => 'service',
            str_contains($path, '/Actions') => 'action',
            str_contains($path, '/Events') => 'event',
            str_contains($path, '/Requests') => 'request',
            str_contains($path, '/Middleware') => 'middleware',
            str_contains($path, '/Repositories') => 'repository',
            str_contains($path, 'routes/') => 'route',
            str_contains($path, '/pages/Admin') => 'page-admin',
            str_contains($path, '/pages/') => 'page',
            str_contains($path, '/components/ui') => 'ui',
            str_contains($path, '/components') => 'component',
            str_contains($path, '/hooks') => 'hook',
            str_contains($path, '/layouts') => 'layout',
            str_contains($path, '/lib') => 'lib',
            str_contains($path, '/utils') => 'util',
            str_contains($path, '/types') => 'type',
            default => 'other',
        };
    }

    private function edgeType(string $source, string $target): string
    {
        $sg = $this->classifyGroup($source);
        $tg = $this->classifyGroup($target);

        if (str_contains($sg, 'controller') && $tg === 'service') {
            return 'uses-service';
        }
        if (str_contains($sg, 'controller') && $tg === 'model') {
            return 'uses-model';
        }
        if ($tg === 'model') {
            return 'uses-model';
        }
        if ($tg === 'service') {
            return 'uses-service';
        }
        if (str_contains($tg, 'page') && str_contains($sg, 'component')) {
            return 'component-of';
        }

        return 'imports';
    }
}
