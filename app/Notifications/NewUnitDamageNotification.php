<?php

namespace App\Notifications;

use App\Models\UnitDamage;
use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class NewUnitDamageNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $unitDamage;

    protected $reporter;

    /**
     * Create a new notification instance.
     */
    public function __construct(UnitDamage $unitDamage, User $reporter)
    {
        $this->unitDamage = $unitDamage;
        $this->reporter = $reporter;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $propertyName = $this->unitDamage->property ? $this->unitDamage->property->name : 'Homestay';

        return [
            'type' => 'new_unit_damage',
            'title' => 'Laporan Kerusakan Baru',
            'unit_damage_id' => $this->unitDamage->id,
            'unit_damage_uuid' => $this->unitDamage->uuid,
            'property_name' => $propertyName,
            'damage_title' => $this->unitDamage->title,
            'difficulty' => $this->unitDamage->difficulty ?? 'easy',
            'created_by' => [
                'id' => $this->reporter->id,
                'name' => $this->reporter->name,
            ],
            'message' => "Laporan kerusakan baru di {$propertyName}: {$this->unitDamage->title}",
            'action_url' => '/staff/cleaning',
            'icon' => 'wrench',
            'color' => 'red',
        ];
    }

    /**
     * Get the broadcastable representation of the notification.
     */
    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        $propertyName = $this->unitDamage->property ? $this->unitDamage->property->name : 'Homestay';

        return new BroadcastMessage([
            'id' => $this->id,
            'type' => 'new_unit_damage',
            'title' => 'Laporan Kerusakan Baru',
            'message' => "Laporan kerusakan baru di {$propertyName}: {$this->unitDamage->title}",
            'data' => [
                'unit_damage_id' => $this->unitDamage->id,
                'unit_damage_uuid' => $this->unitDamage->uuid,
                'property_name' => $propertyName,
                'damage_title' => $this->unitDamage->title,
                'difficulty' => $this->unitDamage->difficulty ?? 'easy',
                'created_by' => [
                    'id' => $this->reporter->id,
                    'name' => $this->reporter->name,
                ],
            ],
            'action_url' => '/staff/cleaning',
            'icon' => 'wrench',
            'color' => 'red',
            'read_at' => null,
            'created_at' => now()->toISOString(),
        ]);
    }

    /**
     * Get the notification's broadcast channels.
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('admin-notifications'),
            new Channel('staff-notifications'),
        ];
    }

    /**
     * Get the type of the notification being broadcast.
     */
    public function broadcastType(): string
    {
        return 'notification.created';
    }
}
