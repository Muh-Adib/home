import re

path = 'app/Http/Controllers/Dev/CodeVisController.php'
content = open(path, encoding='utf-8').read()

start = content.find('    private function extractDependencies')
end = content.find('\n    private function extractNamespace')

new_method = r"""    private function extractDependencies(string $content, string $ext): array
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
                $deps[] = $namespace . '\\' . $shortClass;
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
    }"""

content = content[:start] + new_method + content[end:]
open(path, 'w', encoding='utf-8').write(content)
print('done, length:', len(content))
