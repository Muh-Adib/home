<?php

namespace Tests\Unit;

use App\Models\Attendance;
use App\Models\User;
use App\Services\AttendanceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AttendanceImportAndCorrectionTest extends TestCase
{
    use RefreshDatabase;

    public function test_import_overwrites_normal_attendance_but_preserves_manually_corrected_records(): void
    {
        $user = User::factory()->create([
            'name' => 'Budi Santoso',
            'fingerprint_id' => '101',
            'shift_start_time' => '08:00',
            'shift_end_time' => '16:00',
        ]);

        $service = app(AttendanceService::class);

        // 1. Initial import for 2026-07-01 and 2026-07-02
        $initialRows = [
            [
                'name' => 'Budi Santoso',
                'fingerprint_id' => '101',
                'days_logs' => [
                    [
                        'day' => 1,
                        'date' => '2026-07-01',
                        'check_in' => '08:00',
                        'check_out' => '16:00',
                    ],
                    [
                        'day' => 2,
                        'date' => '2026-07-02',
                        'check_in' => '08:15',
                        'check_out' => '16:00',
                    ],
                ],
            ],
        ];

        $service->importRawAttendance($initialRows, 7, 2026);

        $attDay1 = Attendance::where('user_id', $user->id)->where('date', '2026-07-01')->first();
        $attDay2 = Attendance::where('user_id', $user->id)->where('date', '2026-07-02')->first();

        $this->assertNotNull($attDay1);
        $this->assertEquals('08:00', $attDay1->check_in);
        $this->assertFalse($attDay1->is_corrected);

        $this->assertNotNull($attDay2);
        $this->assertEquals(15, $attDay2->late_minutes);

        // 2. HR manually corrects Day 2 (e.g. excused lateness)
        $admin = User::factory()->create(['role' => 'super_admin']);
        $service->correctAttendance($attDay2->id, '08:00', '16:00', 'Disetujui izin terlambat', 'Koreksi HR', $admin);

        $attDay2->refresh();
        $this->assertTrue($attDay2->is_corrected);
        $this->assertEquals('08:00', $attDay2->check_in);

        // 3. Re-upload attendance Excel file with new data (Day 1 check-in changes to 07:55, Day 2 check-in changes to 08:30)
        $reuploadRows = [
            [
                'name' => 'Budi Santoso',
                'fingerprint_id' => '101',
                'days_logs' => [
                    [
                        'day' => 1,
                        'date' => '2026-07-01',
                        'check_in' => '07:55',
                        'check_out' => '16:00',
                    ],
                    [
                        'day' => 2,
                        'date' => '2026-07-02',
                        'check_in' => '08:30',
                        'check_out' => '16:00',
                    ],
                ],
            ],
        ];

        $service->importRawAttendance($reuploadRows, 7, 2026);

        $attDay1->refresh();
        $attDay2->refresh();

        // Day 1 (not corrected) WAS overwritten
        $this->assertEquals('07:55', $attDay1->check_in);

        // Day 2 (corrected by HR) WAS PRESERVED (not overwritten)
        $this->assertEquals('08:00', $attDay2->check_in);
        $this->assertTrue($attDay2->is_corrected);
    }
}
