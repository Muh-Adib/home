<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class GuestWelcomeNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected string $password;

    /**
     * Create a new notification instance.
     */
    public function __construct(string $password)
    {
        $this->password = $password;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Welcome to ' . config('app.name') . ' - Your Account Details')
            ->greeting('Welcome, ' . $notifiable->name . '!')
            ->line('Your booking account has been created successfully.')
            ->line('You can use these credentials to login and manage your bookings:')
            ->line('')
            ->line('**Email:** ' . $notifiable->email)
            ->line('**Password:** ' . $this->password)
            ->line('')
            ->line('For security reasons, please change your password after your first login.')
            ->action('Login to Your Account', route('login'))
            ->line('Thank you for choosing our property management services!')
            ->line('')
            ->line('If you have any questions, please don\'t hesitate to contact us.')
            ->salutation('Best regards,');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'guest_welcome',
            'user_id' => $notifiable->id,
            'message' => 'Welcome account created with temporary password',
        ];
    }
}