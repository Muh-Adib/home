<?php

namespace Database\Seeders;

use App\Models\Attendance;
use App\Models\RawAttendance;
use App\Models\StaffPayroll;
use App\Models\StaffShift;
use App\Models\User;
use App\Services\AttendanceService;
use App\Services\PayrollCalculationService;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\IOFactory;

class SyncJulyAttendanceSeeder extends Seeder
{
    public function run(): void
    {
        $filePath = base_path('1_(Juli)Catatan Kehadiran Karyawan.xls');
        if (! file_exists($filePath)) {
            if (isset($this->command)) {
                $this->command->error("File {$filePath} tidak ditemukan!");
            }

            return;
        }

        $reader = IOFactory::createReaderForFile($filePath);
        $spreadsheet = $reader->load($filePath);
        $sheet = $spreadsheet->getSheet(0);
        $highestRow = $sheet->getHighestRow();

        $employeesData = [];

        for ($r = 1; $r <= $highestRow; $r++) {
            $c5 = trim((string) $sheet->getCell([5, $r])->getValue());
            if (str_contains($c5, 'User ID')) {
                $idVal = trim((string) $sheet->getCell([6, $r])->getValue());
                $nameVal = trim((string) $sheet->getCell([12, $r])->getValue());
                $logRow = $r + 2;

                $empLogs = [];
                for ($day = 1; $day <= 31; $day++) {
                    $col = $day + 1;
                    $val = trim((string) $sheet->getCell([$col, $logRow])->getValue());
                    if ($val !== '') {
                        [$checkIn, $checkOut] = $this->parseTimes($val);
                        $empLogs[$day] = [
                            'check_in' => $checkIn,
                            'check_out' => $checkOut,
                            'raw' => $val,
                        ];
                    }
                }

                $employeesData[] = [
                    'fingerprint_id' => (string) $idVal,
                    'name' => $nameVal,
                    'logs' => $empLogs,
                ];
            }
        }

        // 1. Ensure Super Admin User
        $superAdmin = User::where('email', 'admin@homsjogja.com')->first();
        if (! $superAdmin) {
            $superAdmin = User::where('role', 'super_admin')->first();
        }
        if (! $superAdmin) {
            $superAdmin = User::create([
                'name' => 'Super Admin',
                'email' => 'admin@homsjogja.com',
                'password' => Hash::make('password'),
                'role' => 'super_admin',
            ]);
        }

        $validUserIds = [$superAdmin->id];
        $userMap = [];

        // 2. Sync Users from Excel List
        foreach ($employeesData as $emp) {
            $fpId = (string) $emp['fingerprint_id'];
            $name = $emp['name'];

            $user = User::where('fingerprint_id', $fpId)->first();
            if (! $user) {
                $user = User::where('name', $name)->first();
            }

            $slug = Str::slug($name);
            $email = "{$slug}@home.test";

            $role = 'front_desk';
            $upperName = strtoupper($name);
            if (str_contains($upperName, 'FAISAL')) {
                $role = 'property_manager';
            } elseif (str_contains($upperName, 'INDAH')) {
                $role = 'property_owner';
            } elseif (str_contains($upperName, 'ADIB')) {
                $role = 'super_admin';
            }

            if (! $user) {
                if (User::where('email', $email)->exists()) {
                    $email = "{$slug}-{$fpId}@home.test";
                }

                $user = User::create([
                    'name' => $name,
                    'email' => $email,
                    'password' => Hash::make('password'),
                    'role' => $role,
                    'fingerprint_id' => $fpId,
                    'base_salary' => 2000000.0,
                    'shift_start_time' => '08.00',
                    'shift_end_time' => '16.00',
                    'holiday_quota' => 4,
                ]);
            } else {
                $user->update([
                    'name' => $name,
                    'fingerprint_id' => $fpId,
                    'role' => $user->role === 'super_admin' ? 'super_admin' : $role,
                    'base_salary' => $user->base_salary ?: 2000000.0,
                    'shift_start_time' => $user->shift_start_time ?: '08.00',
                    'shift_end_time' => $user->shift_end_time ?: '16.00',
                    'holiday_quota' => $user->holiday_quota ?: 4,
                ]);
            }

            $validUserIds[] = $user->id;
            $userMap[$fpId] = $user;
        }

        // 3. Delete Users NOT in validUserIds ("hapus user selain ini")
        $usersToDelete = User::whereNotIn('id', array_unique($validUserIds))->get();
        foreach ($usersToDelete as $uToDelete) {
            DB::table('bookings')->where('created_by', $uToDelete->id)->update(['created_by' => $superAdmin->id]);
            DB::table('bookings')->where('verified_by', $uToDelete->id)->update(['verified_by' => null]);
            DB::table('bookings')->where('closed_by', $uToDelete->id)->update(['closed_by' => null]);
            DB::table('bookings')->where('followed_up_by', $uToDelete->id)->update(['followed_up_by' => null]);

            Attendance::where('user_id', $uToDelete->id)->delete();
            RawAttendance::where('user_id', $uToDelete->id)->delete();
            StaffPayroll::where('user_id', $uToDelete->id)->delete();
            StaffShift::where('user_id', $uToDelete->id)->delete();
            DB::table('employee_loans')->where('employee_id', $uToDelete->id)->delete();

            $uToDelete->delete();
        }

        // 4. Sync July 2026 Attendance Logs
        Attendance::whereIn('user_id', $validUserIds)
            ->whereBetween('date', ['2026-07-01', '2026-07-31'])
            ->delete();

        $attendanceService = app(AttendanceService::class);

        foreach ($employeesData as $emp) {
            $fpId = (string) $emp['fingerprint_id'];
            $user = $userMap[$fpId] ?? null;
            if (! $user) {
                continue;
            }

            foreach ($emp['logs'] as $day => $log) {
                $dateStr = sprintf('2026-07-%02d', $day);
                $dateCarbon = Carbon::parse($dateStr);

                $checkIn = $log['check_in'];
                $checkOut = $log['check_out'];

                $attendanceService->calculateDailyAttendance($user, $dateCarbon, $checkIn, $checkOut);
            }
        }

        // 5. Calculate & Store July 2026 Payrolls Batch
        $payrollService = app(PayrollCalculationService::class);
        $dynamicData = $payrollService->calculateDynamicPayroll(7, 2026);
        if (! empty($dynamicData)) {
            $payrollService->storePayrollBatch(7, 2026, $dynamicData, null, $superAdmin, true);
        }
    }

    private function parseTimes(string $str): array
    {
        $str = str_replace(["\r\n", "\n", "\r", "\t"], ' ', $str);
        preg_match_all('/\d{1,2}:\d{2}/', $str, $matches);
        $times = $matches[0] ?? [];

        if (empty($times)) {
            return [null, null];
        }

        if (count($times) === 1) {
            $t = $times[0];
            $h = (int) explode(':', $t)[0];
            $m = explode(':', $t)[1];
            $formatted = sprintf('%02d:%02d', $h, $m);

            if ($h >= 14) {
                return [null, $formatted];
            }

            return [$formatted, null];
        }

        $first = $times[0];
        $last = end($times);

        $fParts = explode(':', $first);
        $lParts = explode(':', $last);
        $fMin = (int) $fParts[0] * 60 + (int) $fParts[1];
        $lMin = (int) $lParts[0] * 60 + (int) $lParts[1];

        if (($lMin - $fMin) < 30) {
            $formatted = sprintf('%02d:%02d', (int) $fParts[0], $fParts[1]);
            if ((int) $fParts[0] >= 14) {
                return [null, $formatted];
            }

            return [$formatted, null];
        }

        return [
            sprintf('%02d:%02d', (int) $fParts[0], $fParts[1]),
            sprintf('%02d:%02d', (int) $lParts[0], $lParts[1]),
        ];
    }
}
