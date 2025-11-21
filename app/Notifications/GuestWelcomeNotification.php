<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\URL;

class GuestWelcomeNotification extends Notification
{
    use Queueable;

    protected $expires;

    /**
     * Create a new notification instance.
     */
    public function __construct()
    {
        // expired 2 jam
        $this->expires = now()->addHours(2);
    }

    /**
     * Get the notification's delivery channels.
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Build the mail notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        // Generate signed URL aman
        $setPasswordUrl = URL::temporarySignedRoute(
            'password.set',
            $this->expires,
            ['user' => $notifiable->id]
        );

        return (new MailMessage)
            ->subject('Welcome to ' . config('app.name'))
            ->greeting('Hello, ' . e($notifiable->name) . '!')
            ->line('Your booking account has been created successfully.')
            ->line('To access your booking and manage your stay, please set your password using the link below.')
            ->action('Set Your Password', $setPasswordUrl)
            ->line("⚠ This link is secure and will expire in 2 hours for your protection.")
            ->line('If you did not request this, please ignore this email.')
            ->salutation('Best regards, ' . config('app.name'));
    }

    /**
     * Optional: Array representation for database
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'guest_welcome',
            'user_id' => $notifiable->id,
            'message' => 'Welcome email with set-password link sent.',
        ];
    }
}
