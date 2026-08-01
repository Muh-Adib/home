<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Attendance;
use App\Models\AttendanceCorrection;
use App\Models\RawAttendance;
use App\Models\StaffShift;
use App\Models\User;
use Carbon\Carbon;

class AttendanceService
{
    /**
     * Parse and import raw attendance data, then generate calculated attendance records.
     */
    public function importRawAttendance(array $summaryRows, int $month, int $year, ?User $importer = null): array
    {
        $importedCount = 0;
        $matchedUserCount = 0;

        foreach ($summaryRows as $row) {
            $name = trim($row['name'] ?? '');
            $fingerprintId = trim((string) ($row['fingerprint_id'] ?? ''));

            $matchedUser = User::where('fingerprint_id', $fingerprintId)
                ->orWhere('name', 'like', "%{$name}%")
                ->first();

            if ($matchedUser) {
                $matchedUserCount++;
            }

            // Process daily logs if present
            if (! empty($row['days_logs']) && is_array($row['days_logs'])) {
                foreach ($row['days_logs'] as $log) {
                    $dateStr = $log['date'] ?? null;
                    if (! $dateStr) {
                        continue;
                    }

                    $date = Carbon::parse($dateStr);
                    if ($date->month !== $month || $date->year !== $year) {
                        continue;
                    }

                    $checkIn = ($log['check_in'] !== '—' && $log['check_in'] !== '') ? $log['check_in'] : null;
                    $checkOut = ($log['check_out'] !== '—' && $log['check_out'] !== '') ? $log['check_out'] : null;

                    // Store raw attendance
                    RawAttendance::create([
                        'user_id' => $matchedUser?->id,
                        'fingerprint_id' => $fingerprintId,
                        'date' => $date->toDateString(),
                        'check_in' => $checkIn,
                        'check_out' => $checkOut,
                        'raw_payload' => $log,
                        'imported_by' => $importer?->id,
                    ]);

                    // Generate calculated attendance if matched
                    if ($matchedUser) {
                        $this->calculateDailyAttendance($matchedUser, $date, $checkIn, $checkOut);
                        $importedCount++;
                    }
                }
            }
        }

        return [
            'total_imported_records' => $importedCount,
            'matched_users_count' => $matchedUserCount,
        ];
    }

    /**
     * Calculate and store daily attendance for a single user on a specific date.
     */
    public function calculateDailyAttendance(User $user, Carbon $date, ?string $checkIn, ?string $checkOut): Attendance
    {
        $dateStr = $date->toDateString();

        // 1. Fetch custom shift or user default
        $customShift = StaffShift::where('user_id', $user->id)->where('date', $dateStr)->first();

        $shiftStart = '08:00';
        $shiftEnd = '16:00';
        $isOffDay = false;

        if ($customShift) {
            $isOffDay = (bool) $customShift->is_off_day;
            $shiftStart = $customShift->shift_start_time ?: '08:00';
            $shiftEnd = $customShift->shift_end_time ?: '16:00';
        } else {
            $shiftStart = $user->shift_start_time ?: '08:00';
            $shiftEnd = $user->shift_end_time ?: '16:00';
            $isOffDay = false;
        }

        $lateMinutes = 0;
        $overtimeMinutes = 0;
        $workHours = 0.0;
        $status = 'present';

        if ($checkIn || $checkOut) {
            if ($isOffDay) {
                $status = 'holiday';
            } else {
                $status = 'present';
            }

            // Check In Lateness & Standby
            if ($checkIn) {
                $timeParts = explode(':', $checkIn);
                if (count($timeParts) >= 2) {
                    $hour = (int) $timeParts[0];
                    $minute = (int) $timeParts[1];

                    // Standby check for housekeeping checking in after 17:00
                    if ($user->role === 'housekeeping' && $hour >= 17) {
                        $status = 'standby';
                    } else {
                        $shiftParts = explode(':', $shiftStart);
                        $shiftHour = count($shiftParts) >= 1 ? (int) $shiftParts[0] : 8;
                        $shiftMinute = count($shiftParts) >= 2 ? (int) $shiftParts[1] : 0;

                        $checkInTotal = $hour * 60 + $minute;
                        $shiftTotal = $shiftHour * 60 + $shiftMinute;

                        if ($checkInTotal > $shiftTotal) {
                            $lateMinutes = $checkInTotal - $shiftTotal;
                        }
                    }
                }
            }

            // Check Out Overtime
            if ($checkOut) {
                $timeParts = explode(':', $checkOut);
                if (count($timeParts) >= 2) {
                    $hour = (int) $timeParts[0];
                    $minute = (int) $timeParts[1];

                    $shiftEndParts = explode(':', $shiftEnd);
                    $shiftEndHour = count($shiftEndParts) >= 1 ? (int) $shiftEndParts[0] : 16;
                    $shiftEndMinute = count($shiftEndParts) >= 2 ? (int) $shiftEndParts[1] : 0;

                    $checkOutTotal = $hour * 60 + $minute;
                    $shiftEndTotal = $shiftEndHour * 60 + $shiftEndMinute;

                    // Handle overnight shift if checkout hour < checkin hour
                    if ($checkOutTotal < $shiftEndTotal && $hour < 12) {
                        $checkOutTotal += 24 * 60;
                    }

                    if ($checkOutTotal > $shiftEndTotal) {
                        $overtimeMinutes = $checkOutTotal - $shiftEndTotal;
                    }
                }
            }

            // Calculate work hours
            if ($checkIn && $checkOut) {
                $inParts = explode(':', $checkIn);
                $outParts = explode(':', $checkOut);
                if (count($inParts) >= 2 && count($outParts) >= 2) {
                    $inMins = (int) $inParts[0] * 60 + (int) $inParts[1];
                    $outMins = (int) $outParts[0] * 60 + (int) $outParts[1];
                    if ($outMins < $inMins) {
                        $outMins += 24 * 60;
                    }
                    $workHours = round(max(0, $outMins - $inMins) / 60, 2);
                }
            } else {
                $workHours = 8.0; // Default full day if single punch
            }
        } else {
            if ($isOffDay) {
                $status = 'off';
            } else {
                $status = 'absent';
            }
        }

        $dateStr = $date instanceof Carbon ? $date->format('Y-m-d') : Carbon::parse($date)->format('Y-m-d');

        return Attendance::updateOrCreate(
            [
                'user_id' => $user->id,
                'date' => $dateStr,
            ],
            [
                'shift_start_time' => $shiftStart,
                'shift_end_time' => $shiftEnd,
                'check_in' => $checkIn,
                'check_out' => $checkOut,
                'work_hours' => $workHours,
                'late_minutes' => $lateMinutes,
                'overtime_minutes' => $overtimeMinutes,
                'status' => $status,
                'is_off_day' => $isOffDay,
            ]
        );
    }

    /**
     * Perform HR attendance correction with audit log recording.
     */
    public function correctAttendance(int $attendanceId, ?string $correctedCheckIn, ?string $correctedCheckOut, string $reason, ?string $notes, User $corrector, ?string $status = null): Attendance
    {
        $attendance = Attendance::findOrFail($attendanceId);

        // Record audit log
        AttendanceCorrection::create([
            'attendance_id' => $attendance->id,
            'user_id' => $attendance->user_id,
            'date' => $attendance->date->toDateString(),
            'original_check_in' => $attendance->check_in,
            'original_check_out' => $attendance->check_out,
            'corrected_check_in' => $correctedCheckIn,
            'corrected_check_out' => $correctedCheckOut,
            'reason' => $reason,
            'notes' => $notes,
            'corrected_by' => $corrector->id,
        ]);

        // Update attendance
        $attendance = $this->calculateDailyAttendance($attendance->user, Carbon::parse($attendance->date), $correctedCheckIn, $correctedCheckOut);

        $updateData = [
            'is_corrected' => true,
            'notes' => $notes ? ($attendance->notes ? $attendance->notes." | Koreksi: {$notes}" : "Koreksi: {$notes}") : $attendance->notes,
        ];

        if ($status && in_array($status, ['present', 'sick', 'permission', 'absent', 'holiday', 'off', 'standby'])) {
            $updateData['status'] = $status;
        }

        $attendance->update($updateData);

        return $attendance;
    }

    /**
     * Get monthly attendance summary for a user.
     */
    public function getMonthlyAttendanceSummary(int $userId, int $month, int $year): array
    {
        $user = User::find($userId);
        $startDate = Carbon::create($year, $month, 1)->startOfMonth();
        $endDate = Carbon::create($year, $month, 1)->endOfMonth();
        $daysInMonth = $endDate->day;

        $userJoinDate = $user?->join_date ? Carbon::parse($user->join_date) : null;
        $userResignDate = $user?->resign_date ? Carbon::parse($user->resign_date) : null;

        $records = Attendance::where('user_id', $userId)
            ->whereBetween('date', [$startDate->toDateString(), $endDate->toDateString()])
            ->get()
            ->keyBy(fn ($item) => Carbon::parse($item->date)->format('Y-m-d'));

        $presentDays = 0;
        $absentDays = 0;
        $sickDays = 0;
        $permissionDays = 0;
        $holidayDays = 0;
        $standbyNights = 0;
        $totalLateMinutes = 0;
        $totalOvertimeMinutes = 0;

        $candidateOffDates = [];
        $explicitOffDates = [];
        $explicitWorkDates = [];

        // Load custom shifts for the month
        $customShifts = StaffShift::where('user_id', $userId)
            ->whereBetween('date', [$startDate->toDateString(), $endDate->toDateString()])
            ->get()
            ->keyBy('date');

        for ($d = 1; $d <= $daysInMonth; $d++) {
            $dateCarbon = Carbon::create($year, $month, $d);
            $dateStr = $dateCarbon->toDateString();

            if ($userJoinDate && $userJoinDate->between($startDate, $endDate) && $dateCarbon->lt($userJoinDate->startOfDay())) {
                continue;
            }
            if ($userResignDate && $userResignDate->between($startDate, $endDate) && $dateCarbon->gt($userResignDate->endOfDay())) {
                continue;
            }

            $rec = $records->get($dateStr);
            $customShift = $customShifts->get($dateStr);

            if ($rec) {
                if (in_array($rec->status, ['present', 'standby'])) {
                    $presentDays++;
                    if ($rec->status === 'standby') {
                        $standbyNights++;
                    }
                } elseif ($rec->status === 'sick') {
                    $sickDays++;
                } elseif ($rec->status === 'permission') {
                    $permissionDays++;
                } elseif (in_array($rec->status, ['holiday', 'off'])) {
                    $holidayDays++;
                }

                $totalLateMinutes += $rec->late_minutes;
                $totalOvertimeMinutes += $rec->overtime_minutes;
            } else {
                if ($customShift) {
                    if ($customShift->is_off_day) {
                        $explicitOffDates[] = $dateStr;
                    } else {
                        $explicitWorkDates[] = $dateStr;
                    }
                } else {
                    $candidateOffDates[] = $dateStr;
                }
            }
        }

        $quota = $user?->holiday_quota ?? 4;
        $holidayDays += count($explicitOffDates);

        foreach ($candidateOffDates as $dateStr) {
            if ($holidayDays < $quota) {
                $holidayDays++;
            } else {
                $absentDays++;
            }
        }

        $absentDays += count($explicitWorkDates);

        $lateHours = round($totalLateMinutes / 60, 2);
        $overtimeHours = round($totalOvertimeMinutes / 60, 2);
        $lateDays = (int) ceil($lateHours / 8);

        return [
            'present_days' => $presentDays,
            'absent_days' => $absentDays,
            'sick_days' => $sickDays,
            'permission_days' => $permissionDays,
            'holiday_days' => $holidayDays,
            'standby_nights' => $standbyNights,
            'late_days' => $lateDays,
            'late_hours' => $lateHours,
            'overtime_hours' => $overtimeHours,
            'records' => $records->values(),
        ];
    }
}
