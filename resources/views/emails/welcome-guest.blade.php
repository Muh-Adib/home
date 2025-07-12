<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Homsjogja</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background: #f8fafc;
            padding: 30px;
            border-radius: 0 0 8px 8px;
        }
        .credentials-box {
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .button {
            display: inline-block;
            background: #3b82f6;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 10px 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }
        .warning {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
                        <h1>Welcome to Homsjogja!</h1>
        <p>Your account has been created successfully</p>
    </div>

    <div class="content">
        <h2>Hello {{ $user->name }},</h2>
        
        <p>Thank you for booking with us! We've created an account for you to manage your bookings and access our services.</p>

        <div class="credentials-box">
            <h3>Your Login Credentials:</h3>
            <p><strong>Email:</strong> {{ $user->email }}</p>
            <p><strong>Password:</strong> <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">{{ $password }}</code></p>
        </div>

        <div class="warning">
            <strong>⚠️ Important Security Notice:</strong>
            <p>Please change your password after your first login for security purposes. You can do this from your dashboard settings.</p>
        </div>

        <p>You can now:</p>
        <ul>
            <li>View and manage your bookings</li>
            <li>Track payment status</li>
            <li>Access secure payment links</li>
            <li>Update your profile information</li>
        </ul>

        <div style="text-align: center; margin: 30px 0;">
            <a href="{{ $loginUrl }}" class="button">Login to Your Account</a>
        </div>

        <h3>Next Steps:</h3>
        <ol>
            <li><strong>Verify your email address</strong> - Check your email for a verification link</li>
            <li><strong>Login to your account</strong> using the credentials above</li>
            <li><strong>Wait for booking verification</strong> - Our team will review your booking</li>
            <li><strong>Complete payment</strong> - You'll receive a secure payment link after verification</li>
        </ol>

        <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>

        <p>Best regards,<br>
                        <strong>Homsjogja Team</strong></p>
    </div>

    <div class="footer">
        <p>This email was sent to {{ $user->email }} because an account was created for you.</p>
        <p>If you didn't request this account, please contact our support team immediately.</p>
        <p>&copy; {{ date('Y') }} Homsjogja. All rights reserved.</p>
    </div>
</body>
</html>
