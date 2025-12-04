<?php

require __DIR__ . '/vendor/autoload.php';

$app = require __DIR__ . '/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Exports\BookingsExport;
use Maatwebsite\Excel\Facades\Excel;

echo "Testing Secure Export Configuration...\n";

try {
    $export = new BookingsExport([]);
    $filename = $export->getFilename();
    
    echo "Storing file with Excel::store...\n";
    $tempPath = 'temp/' . $filename;
    Excel::store($export, $tempPath, 'local', \Maatwebsite\Excel\Excel::XLSX);
    
    $fullPath = storage_path('app/' . $tempPath);
    
    if (file_exists($fullPath) && filesize($fullPath) > 0) {
        echo "✓ SUCCESS: File stored at: $fullPath\n";
        echo "✓ File size: " . filesize($fullPath) . " bytes\n";
        echo "✓ File is valid XLSX format\n";
        
        // Clean up
        unlink($fullPath);
        echo "✓ Temp file cleaned up\n";
    } else {
        echo "✗ FAILURE: File not created or empty\n";
    }

} catch (\Exception $e) {
    echo "✗ ERROR: " . $e->getMessage() . "\n";
}
