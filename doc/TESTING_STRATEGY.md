# Testing Strategy Document
## Property Management System

---

## 1. TESTING OVERVIEW

### 1.1 Testing Philosophy
```
Quality Assurance Goals:
- Ensure system reliability and stability
- Prevent regression bugs
- Validate business logic accuracy
- Maintain performance standards
- Guarantee security compliance
```

### 1.2 Testing Pyramid
```
                    /\
                   /  \
                  / E2E \
                 /Tests \
                /________\
               /          \
              /Integration \
             /    Tests     \
            /________________\
           /                  \
          /    Unit Tests      \
         /____________________\
```

### 1.3 Testing Types Coverage
- **Unit Tests**: 80% code coverage target
- **Integration Tests**: API endpoints and database interactions
- **End-to-End Tests**: Critical user journeys
- **Performance Tests**: Load and stress testing
- **Security Tests**: Vulnerability assessments

---

## 2. UNIT TESTING

### 2.1 Laravel Backend Unit Tests

#### 2.1.1 Service Class Testing
```php
<?php
// tests/Unit/Services/BookingServiceTest.php

use Tests\TestCase;
use App\Services\BookingService;
use App\Models\Property;
use App\Models\Booking;
use Illuminate\Foundation\Testing\RefreshDatabase;

class BookingServiceTest extends TestCase
{
    use RefreshDatabase;
    
    private BookingService $bookingService;
    
    protected function setUp(): void
    {
        parent::setUp();
        $this->bookingService = new BookingService();
    }
    
    public function test_calculates_extra_bed_correctly()
    {
        // Arrange
        $property = Property::factory()->create([
            'capacity' => 4,
            'extra_bed_rate' => 150000
        ]);
        
        // Act
        $result = $this->bookingService->calculateExtraBeds(6, $property);
        
        // Assert
        $this->assertEquals(1, $result['extra_beds_needed']);
        $this->assertEquals(150000, $result['total_cost']);
    }
    
    public function test_validates_booking_availability()
    {
        // Arrange
        $property = Property::factory()->create();
        $existingBooking = Booking::factory()->create([
            'property_id' => $property->id,
            'check_in' => '2024-02-15',
            'check_out' => '2024-02-18',
            'booking_status' => 'confirmed'
        ]);
        
        // Act & Assert
        $this->expectException(\App\Exceptions\PropertyNotAvailableException::class);
        
        $this->bookingService->validateAvailability([
            'property_id' => $property->id,
            'check_in' => '2024-02-16',
            'check_out' => '2024-02-19'
        ]);
    }
    
    public function test_calculates_dp_amount_correctly()
    {
        // Arrange
        $totalAmount = 4500000;
        $dpPercentage = 30;
        
        // Act
        $dpAmount = $this->bookingService->calculateDpAmount($totalAmount, $dpPercentage);
        
        // Assert
        $this->assertEquals(1350000, $dpAmount);
    }
}
```

#### 2.1.2 Model Testing
```php
<?php
// tests/Unit/Models/BookingTest.php

use Tests\TestCase;
use App\Models\Booking;
use App\Models\Property;
use Illuminate\Foundation\Testing\RefreshDatabase;

class BookingTest extends TestCase
{
    use RefreshDatabase;
    
    public function test_calculates_nights_correctly()
    {
        // Arrange & Act
        $booking = Booking::factory()->create([
            'check_in' => '2024-02-15',
            'check_out' => '2024-02-18'
        ]);
        
        // Assert
        $this->assertEquals(3, $booking->nights);
    }
    
    public function test_calculates_remaining_amount_correctly()
    {
        // Arrange & Act
        $booking = Booking::factory()->create([
            'total_amount' => 4500000,
            'dp_paid_amount' => 1350000
        ]);
        
        // Assert
        $this->assertEquals(3150000, $booking->remaining_amount);
    }
    
    public function test_belongs_to_property()
    {
        // Arrange
        $property = Property::factory()->create();
        $booking = Booking::factory()->create(['property_id' => $property->id]);
        
        // Act & Assert
        $this->assertInstanceOf(Property::class, $booking->property);
        $this->assertEquals($property->id, $booking->property->id);
    }
}
```

### 2.2 React Frontend Unit Tests

#### 2.2.1 Component Testing
```jsx
// src/components/__tests__/BookingForm.test.jsx

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import BookingForm from '../BookingForm';

describe('BookingForm', () => {
    const mockProperty = {
        id: 1,
        name: 'Villa Paradise',
        capacity: 8,
        capacity_max: 12,
        extra_bed_rate: 150000
    };
    
    const mockOnSubmit = vi.fn();
    
    beforeEach(() => {
        mockOnSubmit.mockClear();
    });
    
    test('renders all form fields', () => {
        render(<BookingForm property={mockProperty} onSubmit={mockOnSubmit} />);
        
        expect(screen.getByLabelText(/guest name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/guest email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/guest count/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/check-in date/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/check-out date/i)).toBeInTheDocument();
    });
    
    test('validates guest count against property capacity', async () => {
        render(<BookingForm property={mockProperty} onSubmit={mockOnSubmit} />);
        
        const guestCountInput = screen.getByLabelText(/guest count/i);
        fireEvent.change(guestCountInput, { target: { value: '15' } });
        
        await waitFor(() => {
            expect(screen.getByText(/exceeds maximum capacity/i)).toBeInTheDocument();
        });
    });
    
    test('calculates extra beds automatically', async () => {
        render(<BookingForm property={mockProperty} onSubmit={mockOnSubmit} />);
        
        const guestCountInput = screen.getByLabelText(/guest count/i);
        fireEvent.change(guestCountInput, { target: { value: '10' } });
        
        await waitFor(() => {
            expect(screen.getByText(/1 extra bed needed/i)).toBeInTheDocument();
            expect(screen.getByText(/rp 150,000/i)).toBeInTheDocument();
        });
    });
    
    test('submits form with correct data', async () => {
        render(<BookingForm property={mockProperty} onSubmit={mockOnSubmit} />);
        
        // Fill form
        fireEvent.change(screen.getByLabelText(/guest name/i), {
            target: { value: 'John Doe' }
        });
        fireEvent.change(screen.getByLabelText(/guest email/i), {
            target: { value: 'john@example.com' }
        });
        fireEvent.change(screen.getByLabelText(/guest count/i), {
            target: { value: '4' }
        });
        
        // Submit form
        fireEvent.click(screen.getByText(/create booking/i));
        
        await waitFor(() => {
            expect(mockOnSubmit).toHaveBeenCalledWith({
                guest_name: 'John Doe',
                guest_email: 'john@example.com',
                guest_count: 4,
                property_id: 1
            });
        });
    });
});
```

#### 2.2.2 Hook Testing
```jsx
// src/hooks/__tests__/usePropertySearch.test.js

import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import usePropertySearch from '../usePropertySearch';

// Mock API
vi.mock('@/services/api', () => ({
    searchProperties: vi.fn()
}));

describe('usePropertySearch', () => {
    test('searches properties with filters', async () => {
        const mockSearchProperties = vi.fn().mockResolvedValue([
            { id: 1, name: 'Villa 1' },
            { id: 2, name: 'Villa 2' }
        ]);
        
        vi.mocked(searchProperties).mockImplementation(mockSearchProperties);
        
        const { result } = renderHook(() => usePropertySearch());
        
        const filters = {
            location: 'Bali',
            capacity: 4,
            priceRange: [1000000, 5000000]
        };
        
        await act(async () => {
            await result.current.searchProperties(filters);
        });
        
        expect(mockSearchProperties).toHaveBeenCalledWith(filters);
        expect(result.current.properties).toHaveLength(2);
        expect(result.current.isLoading).toBe(false);
    });
    
    test('handles search errors', async () => {
        const mockError = new Error('Search failed');
        vi.mocked(searchProperties).mockRejectedValue(mockError);
        
        const { result } = renderHook(() => usePropertySearch());
        
        await act(async () => {
            await result.current.searchProperties({});
        });
        
        expect(result.current.error).toBe(mockError);
        expect(result.current.isLoading).toBe(false);
    });
});
```

---

## 3. INTEGRATION TESTING

### 3.1 API Integration Tests

#### 3.1.1 Property Management Tests
```php
<?php
// tests/Feature/PropertyManagementTest.php

use Tests\TestCase;
use App\Models\User;
use App\Models\Property;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class PropertyManagementTest extends TestCase
{
    use RefreshDatabase;
    
    private User $user;
    
    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create(['role' => 'property_owner']);
    }
    
    public function test_can_create_property()
    {
        $propertyData = [
            'name' => 'Villa Test',
            'description' => 'Beautiful test villa',
            'address' => 'Bali, Indonesia',
            'capacity' => 6,
            'capacity_max' => 8,
            'bedroom_count' => 3,
            'bathroom_count' => 2,
            'base_rate' => 1500000,
            'amenities' => [1, 2, 3]
        ];
        
        $response = $this->actingAs($this->user)
            ->postJson('/api/properties', $propertyData);
        
        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'id',
                    'name',
                    'slug',
                    'owner_id'
                ]
            ]);
        
        $this->assertDatabaseHas('properties', [
            'name' => 'Villa Test',
            'owner_id' => $this->user->id
        ]);
    }
    
    public function test_can_upload_property_media()
    {
        Storage::fake('local');
        
        $property = Property::factory()->create(['owner_id' => $this->user->id]);
        $file = UploadedFile::fake()->image('villa.jpg', 1920, 1080);
        
        $response = $this->actingAs($this->user)
            ->postJson("/api/properties/{$property->id}/media", [
                'media_type' => 'image',
                'category' => 'exterior',
                'title' => 'Villa Exterior',
                'files' => [$file]
            ]);
        
        $response->assertStatus(201);
        
        $this->assertDatabaseHas('property_media', [
            'property_id' => $property->id,
            'media_type' => 'image',
            'category' => 'exterior'
        ]);
        
        Storage::disk('local')->assertExists("properties/{$property->id}/" . $file->hashName());
    }
    
    public function test_property_access_control()
    {
        $otherUser = User::factory()->create(['role' => 'property_owner']);
        $property = Property::factory()->create(['owner_id' => $otherUser->id]);
        
        $response = $this->actingAs($this->user)
            ->putJson("/api/properties/{$property->id}", [
                'name' => 'Updated Name'
            ]);
        
        $response->assertStatus(403);
    }
}
```

#### 3.1.2 Booking Flow Tests
```php
<?php
// tests/Feature/BookingFlowTest.php

use Tests\TestCase;
use App\Models\Property;
use App\Models\Booking;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class BookingFlowTest extends TestCase
{
    use RefreshDatabase;
    
    public function test_complete_booking_flow()
    {
        // Arrange
        $property = Property::factory()->create([
            'capacity' => 4,
            'base_rate' => 1500000
        ]);
        
        // Step 1: Create booking
        $bookingData = [
            'property_id' => $property->id,
            'guest_name' => 'John Doe',
            'guest_email' => 'john@example.com',
            'guest_phone' => '+62812345678',
            'guest_count' => 4,
            'check_in' => '2024-02-15',
            'check_out' => '2024-02-18',
            'services' => [
                [
                    'service_type' => 'breakfast',
                    'quantity' => 4
                ]
            ]
        ];
        
        $response = $this->postJson('/api/bookings', $bookingData);
        $response->assertStatus(201);
        
        $booking = Booking::where('guest_email', 'john@example.com')->first();
        $this->assertNotNull($booking);
        $this->assertEquals('pending_verification', $booking->booking_status);
        
        // Step 2: Staff verification
        $staff = User::factory()->create(['role' => 'front_desk']);
        
        $response = $this->actingAs($staff)
            ->patchJson("/api/bookings/{$booking->id}/status", [
                'booking_status' => 'confirmed',
                'verification_notes' => 'All details verified'
            ]);
        
        $response->assertStatus(200);
        $booking->refresh();
        $this->assertEquals('confirmed', $booking->booking_status);
        
        // Step 3: Payment processing
        $response = $this->actingAs($staff)
            ->postJson('/api/payments', [
                'booking_id' => $booking->id,
                'amount' => $booking->dp_amount,
                'payment_type' => 'dp',
                'payment_method' => 'bank_transfer',
                'reference_number' => 'TXN123456'
            ]);
        
        $response->assertStatus(201);
        
        // Step 4: Payment verification
        $payment = $booking->payments()->latest()->first();
        
        $response = $this->actingAs($staff)
            ->postJson("/api/payments/{$payment->id}/verify", [
                'verification_notes' => 'Payment verified'
            ]);
        
        $response->assertStatus(200);
        $booking->refresh();
        $this->assertEquals('dp_received', $booking->payment_status);
    }
}
```

### 3.2 Database Integration Tests

```php
<?php
// tests/Feature/DatabaseIntegrationTest.php

use Tests\TestCase;
use App\Models\Property;
use App\Models\Booking;
use Illuminate\Foundation\Testing\RefreshDatabase;

class DatabaseIntegrationTest extends TestCase
{
    use RefreshDatabase;
    
    public function test_booking_constraints_prevent_overbooking()
    {
        $property = Property::factory()->create(['capacity' => 4]);
        
        // Create first booking
        $booking1 = Booking::factory()->create([
            'property_id' => $property->id,
            'check_in' => '2024-02-15',
            'check_out' => '2024-02-18',
            'booking_status' => 'confirmed'
        ]);
        
        // Try to create overlapping booking
        $this->expectException(\Illuminate\Database\QueryException::class);
        
        $booking2 = Booking::factory()->create([
            'property_id' => $property->id,
            'check_in' => '2024-02-16',
            'check_out' => '2024-02-19',
            'booking_status' => 'confirmed'
        ]);
    }
    
    public function test_cascade_deletes_work_correctly()
    {
        $property = Property::factory()->create();
        
        // Create related data
        $property->media()->create([
            'media_type' => 'image',
            'file_path' => '/test/image.jpg',
            'file_name' => 'image.jpg',
            'file_size' => 1024,
            'mime_type' => 'image/jpeg'
        ]);
        
        $booking = Booking::factory()->create(['property_id' => $property->id]);
        
        // Delete property
        $property->delete();
        
        // Check cascades
        $this->assertDatabaseMissing('property_media', ['property_id' => $property->id]);
        $this->assertDatabaseHas('bookings', ['id' => $booking->id]); // Should not cascade
    }
}
```

---

## 4. END-TO-END TESTING

### 4.1 E2E Test Setup

```javascript
// tests/e2e/setup.js

import { test as base, expect } from '@playwright/test';

export const test = base.extend({
    // Custom fixtures
    authenticatedUser: async ({ page }, use) => {
        // Login before each test
        await page.goto('/login');
        await page.fill('[data-testid="email"]', 'admin@example.com');
        await page.fill('[data-testid="password"]', 'password123');
        await page.click('[data-testid="login-button"]');
        
        // Wait for navigation to dashboard
        await page.waitForURL('/dashboard');
        
        await use(page);
    }
});

export { expect };
```

### 4.2 Critical User Journey Tests

#### 4.2.1 Property Management Journey
```javascript
// tests/e2e/property-management.spec.js

import { test, expect } from './setup';

test.describe('Property Management', () => {
    test('can create property with media upload', async ({ authenticatedUser: page }) => {
        // Navigate to properties
        await page.click('[data-testid="nav-properties"]');
        await expect(page).toHaveURL('/properties');
        
        // Start creating new property
        await page.click('[data-testid="add-property-button"]');
        await expect(page).toHaveURL('/properties/create');
        
        // Fill property form
        await page.fill('[data-testid="property-name"]', 'Test Villa E2E');
        await page.fill('[data-testid="property-description"]', 'Beautiful test villa');
        await page.fill('[data-testid="property-address"]', 'Bali, Indonesia');
        await page.fill('[data-testid="property-capacity"]', '6');
        await page.fill('[data-testid="property-capacity-max"]', '8');
        await page.fill('[data-testid="property-bedrooms"]', '3');
        await page.fill('[data-testid="property-bathrooms"]', '2');
        await page.fill('[data-testid="property-base-rate"]', '1500000');
        
        // Upload media
        const fileChooser = await page.waitForEvent('filechooser');
        await page.click('[data-testid="upload-media-button"]');
        await fileChooser.setFiles('tests/fixtures/villa-image.jpg');
        
        // Wait for upload to complete
        await expect(page.locator('[data-testid="uploaded-image"]')).toBeVisible();
        
        // Save property
        await page.click('[data-testid="save-property-button"]');
        
        // Verify success
        await expect(page).toHaveURL(/\/properties\/\d+/);
        await expect(page.locator('[data-testid="success-message"]')).toContainText('Property created successfully');
        
        // Verify property appears in list
        await page.goto('/properties');
        await expect(page.locator('[data-testid="property-card"]')).toContainText('Test Villa E2E');
    });
});
```

#### 4.2.2 Booking Flow Journey
```javascript
// tests/e2e/booking-flow.spec.js

import { test, expect } from './setup';

test.describe('Booking Flow', () => {
    test('complete guest booking journey', async ({ page }) => {
        // Start on homepage
        await page.goto('/');
        
        // Search for properties
        await page.fill('[data-testid="search-check-in"]', '2024-03-15');
        await page.fill('[data-testid="search-check-out"]', '2024-03-18');
        await page.fill('[data-testid="search-guests"]', '4');
        await page.click('[data-testid="search-button"]');
        
        // Select property
        await page.click('[data-testid="property-card"]:first-child [data-testid="view-details"]');
        
        // Verify property details page
        await expect(page.locator('[data-testid="property-title"]')).toBeVisible();
        await expect(page.locator('[data-testid="property-images"]')).toBeVisible();
        
        // Start booking
        await page.click('[data-testid="book-now-button"]');
        
        // Fill guest information
        await page.fill('[data-testid="guest-name"]', 'John Doe');
        await page.fill('[data-testid="guest-email"]', 'john.doe@example.com');
        await page.fill('[data-testid="guest-phone"]', '+62812345678');
        
        // Set guest breakdown
        await page.fill('[data-testid="guest-male"]', '2');
        await page.fill('[data-testid="guest-female"]', '2');
        await page.selectOption('[data-testid="relationship-type"]', 'keluarga');
        
        // Add services
        await page.check('[data-testid="service-breakfast"]');
        await page.fill('[data-testid="breakfast-quantity"]', '4');
        
        // Verify pricing calculation
        await expect(page.locator('[data-testid="total-amount"]')).toContainText('Rp 4,800,000');
        
        // Submit booking
        await page.fill('[data-testid="special-requests"]', 'Late check-in please');
        await page.click('[data-testid="submit-booking-button"]');
        
        // Verify booking confirmation
        await expect(page.locator('[data-testid="booking-confirmation"]')).toBeVisible();
        await expect(page.locator('[data-testid="booking-number"]')).toContainText(/BK\d+/);
        
        // Verify email notification (if available)
        // This would require email testing setup
    });
});
```

### 4.3 Cross-browser Testing
```javascript
// playwright.config.js

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure'
    },
    
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
        },
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
        },
        {
            name: 'Mobile Chrome',
            use: { ...devices['Pixel 5'] },
        },
        {
            name: 'Mobile Safari',
            use: { ...devices['iPhone 12'] },
        },
    ],
    
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
    },
});
```

---

## 5. PERFORMANCE TESTING

### 5.1 Load Testing
```javascript
// tests/performance/load-test.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

export let errorRate = new Rate('errors');

export let options = {
    stages: [
        { duration: '2m', target: 10 }, // Ramp up
        { duration: '5m', target: 50 }, // Stay at 50 users
        { duration: '2m', target: 100 }, // Ramp up to 100
        { duration: '5m', target: 100 }, // Stay at 100
        { duration: '2m', target: 0 }, // Ramp down
    ],
    thresholds: {
        http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
        http_req_failed: ['rate<0.02'], // Error rate under 2%
    },
};

export default function() {
    // Test property search
    let searchResponse = http.get('http://localhost/api/properties?search=villa');
    check(searchResponse, {
        'search status is 200': (r) => r.status === 200,
        'search response time < 1000ms': (r) => r.timings.duration < 1000,
    }) || errorRate.add(1);
    
    // Test property detail
    let propertyResponse = http.get('http://localhost/api/properties/1');
    check(propertyResponse, {
        'property status is 200': (r) => r.status === 200,
        'property response time < 500ms': (r) => r.timings.duration < 500,
    }) || errorRate.add(1);
    
    sleep(1);
}
```

### 5.2 Database Performance Testing
```php
<?php
// tests/Performance/DatabasePerformanceTest.php

use Tests\TestCase;
use App\Models\Property;
use App\Models\Booking;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

class DatabasePerformanceTest extends TestCase
{
    public function test_property_search_performance()
    {
        // Create test data
        Property::factory()->count(1000)->create();
        
        $startTime = microtime(true);
        
        // Execute search query
        $properties = Property::where('status', 'active')
            ->where('capacity', '>=', 4)
            ->with(['media', 'amenities'])
            ->paginate(15);
        
        $executionTime = microtime(true) - $startTime;
        
        // Assert performance requirements
        $this->assertLessThan(0.1, $executionTime); // Under 100ms
        $this->assertEquals(15, $properties->count());
    }
    
    public function test_booking_availability_check_performance()
    {
        // Create test data
        $property = Property::factory()->create();
        Booking::factory()->count(500)->create(['property_id' => $property->id]);
        
        $startTime = microtime(true);
        
        // Check availability
        $isAvailable = Booking::where('property_id', $property->id)
            ->where('booking_status', 'confirmed')
            ->where(function($query) {
                $query->whereBetween('check_in', ['2024-03-15', '2024-03-18'])
                      ->orWhereBetween('check_out', ['2024-03-15', '2024-03-18']);
            })
            ->doesntExist();
        
        $executionTime = microtime(true) - $startTime;
        
        $this->assertLessThan(0.05, $executionTime); // Under 50ms
    }
}
```

---

## 6. SECURITY TESTING

### 6.1 Authentication & Authorization Tests
```php
<?php
// tests/Security/AuthenticationTest.php

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;
    
    public function test_prevents_unauthorized_access()
    {
        $response = $this->getJson('/api/properties');
        $response->assertStatus(401);
    }
    
    public function test_prevents_cross_user_data_access()
    {
        $user1 = User::factory()->create(['role' => 'property_owner']);
        $user2 = User::factory()->create(['role' => 'property_owner']);
        
        $property = Property::factory()->create(['owner_id' => $user1->id]);
        
        $response = $this->actingAs($user2)
            ->getJson("/api/properties/{$property->id}");
        
        $response->assertStatus(403);
    }
    
    public function test_prevents_sql_injection()
    {
        $user = User::factory()->create();
        
        $maliciousInput = "'; DROP TABLE properties; --";
        
        $response = $this->actingAs($user)
            ->getJson("/api/properties?search=" . urlencode($maliciousInput));
        
        $response->assertStatus(200);
        
        // Verify table still exists
        $this->assertDatabaseTableExists('properties');
    }
    
    public function test_rate_limiting()
    {
        $user = User::factory()->create();
        
        // Make requests up to limit
        for ($i = 0; $i < 100; $i++) {
            $response = $this->actingAs($user)->getJson('/api/properties');
            if ($response->status() === 429) {
                break;
            }
        }
        
        $this->assertEquals(429, $response->status());
    }
}
```

### 6.2 Input Validation Tests
```php
<?php
// tests/Security/InputValidationTest.php

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class InputValidationTest extends TestCase
{
    use RefreshDatabase;
    
    public function test_validates_booking_input()
    {
        $user = User::factory()->create();
        
        $invalidData = [
            'property_id' => 'invalid',
            'guest_name' => '', // Required field
            'guest_email' => 'invalid-email',
            'guest_count' => -1, // Invalid count
            'check_in' => '2023-01-01', // Past date
            'check_out' => '2023-01-01', // Same as check-in
        ];
        
        $response = $this->actingAs($user)
            ->postJson('/api/bookings', $invalidData);
        
        $response->assertStatus(422)
            ->assertJsonValidationErrors([
                'property_id',
                'guest_name',
                'guest_email',
                'guest_count',
                'check_in',
                'check_out'
            ]);
    }
    
    public function test_sanitizes_xss_input()
    {
        $user = User::factory()->create();
        
        $xssPayload = '<script>alert("XSS")</script>';
        
        $response = $this->actingAs($user)
            ->postJson('/api/properties', [
                'name' => $xssPayload,
                'description' => $xssPayload,
                // ... other required fields
            ]);
        
        if ($response->status() === 201) {
            $property = Property::latest()->first();
            $this->assertNotContains('<script>', $property->name);
            $this->assertNotContains('<script>', $property->description);
        }
    }
}
```

---

## 7. TEST DATA MANAGEMENT

### 7.1 Factory Definitions
```php
<?php
// database/factories/PropertyFactory.php

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Property;
use App\Models\User;

class PropertyFactory extends Factory
{
    protected $model = Property::class;
    
    public function definition(): array
    {
        return [
            'owner_id' => User::factory(),
            'name' => $this->faker->words(3, true) . ' Villa',
            'slug' => $this->faker->slug(),
            'description' => $this->faker->paragraphs(3, true),
            'address' => $this->faker->address(),
            'lat' => $this->faker->latitude(-8.7, -8.6), // Bali area
            'lng' => $this->faker->longitude(115.1, 115.3),
            'capacity' => $this->faker->numberBetween(2, 8),
            'capacity_max' => fn(array $attributes) => $attributes['capacity'] + 2,
            'bedroom_count' => $this->faker->numberBetween(1, 4),
            'bathroom_count' => $this->faker->numberBetween(1, 3),
            'base_rate' => $this->faker->numberBetween(500000, 3000000),
            'weekend_premium_percent' => 20,
            'cleaning_fee' => $this->faker->numberBetween(100000, 300000),
            'extra_bed_rate' => $this->faker->numberBetween(100000, 200000),
            'status' => 'active',
            'check_in_time' => '14:00:00',
            'check_out_time' => '11:00:00',
            'min_stay_weekday' => 1,
            'min_stay_weekend' => 2,
            'is_featured' => $this->faker->boolean(20), // 20% chance
        ];
    }
    
    public function featured(): self
    {
        return $this->state(fn() => ['is_featured' => true]);
    }
    
    public function inactive(): self
    {
        return $this->state(fn() => ['status' => 'inactive']);
    }
}
```

### 7.2 Test Seeders
```php
<?php
// database/seeders/TestSeeder.php

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Property;
use App\Models\Amenity;
use App\Models\Booking;

class TestSeeder extends Seeder
{
    public function run(): void
    {
        // Create test users
        $admin = User::factory()->create([
            'name' => 'Test Admin',
            'email' => 'admin@test.com',
            'role' => 'super_admin'
        ]);
        
        $owner = User::factory()->create([
            'name' => 'Test Owner',
            'email' => 'owner@test.com',
            'role' => 'property_owner'
        ]);
        
        // Create amenities
        $amenities = [
            ['name' => 'WiFi', 'icon' => 'wifi', 'category' => 'basic'],
            ['name' => 'AC', 'icon' => 'ac', 'category' => 'basic'],
            ['name' => 'Pool', 'icon' => 'pool', 'category' => 'outdoor'],
            ['name' => 'Kitchen', 'icon' => 'kitchen', 'category' => 'kitchen'],
        ];
        
        foreach ($amenities as $amenity) {
            Amenity::factory()->create($amenity);
        }
        
        // Create test properties
        $properties = Property::factory()
            ->count(10)
            ->for($owner, 'owner')
            ->create();
        
        // Create test bookings
        foreach ($properties as $property) {
            Booking::factory()
                ->count(rand(0, 3))
                ->for($property)
                ->create();
        }
    }
}
```

---

## 8. CI/CD TESTING PIPELINE

### 8.1 GitHub Actions Workflow
```yaml
# .github/workflows/tests.yml

name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  laravel-tests:
    runs-on: ubuntu-latest
    
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ALLOW_EMPTY_PASSWORD: yes
          MYSQL_DATABASE: pms_test
        ports:
          - 3306:3306
        options: --health-cmd="mysqladmin ping" --health-interval=10s --health-timeout=5s --health-retries=3
      
      redis:
        image: redis:7
        ports:
          - 6379:6379
        options: --health-cmd="redis-cli ping" --health-interval=10s --health-timeout=5s --health-retries=3
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup PHP
      uses: shivammathur/setup-php@v2
      with:
        php-version: '8.2'
        extensions: mbstring, dom, fileinfo, mysql, redis
        coverage: xdebug
    
    - name: Copy .env
      run: php -r "file_exists('.env') || copy('.env.testing', '.env');"
    
    - name: Install Dependencies
      run: composer install -q --no-ansi --no-interaction --no-scripts --no-progress --prefer-dist
    
    - name: Generate key
      run: php artisan key:generate
    
    - name: Directory Permissions
      run: chmod -R 777 storage bootstrap/cache
    
    - name: Create Database
      run: |
        mkdir -p database
        touch database/database.sqlite
    
    - name: Execute tests (Unit and Feature tests) via PHPUnit
      env:
        DB_CONNECTION: mysql
        DB_HOST: 127.0.0.1
        DB_PORT: 3306
        DB_DATABASE: pms_test
        DB_USERNAME: root
        DB_PASSWORD: 
        REDIS_HOST: 127.0.0.1
        REDIS_PORT: 6379
      run: vendor/bin/phpunit --coverage-clover coverage.xml
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage.xml

  frontend-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm run test:coverage
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info

  e2e-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Install Playwright Browsers
      run: npx playwright install --with-deps
    
    - name: Start application
      run: |
        npm run build
        npm start &
        sleep 30
    
    - name: Run Playwright tests
      run: npx playwright test
    
    - uses: actions/upload-artifact@v3
      if: always()
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 30
```

---

## 9. TEST MAINTENANCE

### 9.1 Test Coverage Goals
```
Target Coverage:
- Unit Tests: 80%+
- Integration Tests: 70%+
- E2E Critical Paths: 100%
- Security Tests: Key vulnerabilities covered
```

### 9.2 Test Review Process
1. **Code Review**: All test code must be reviewed
2. **Test Quality**: Tests must be maintainable and readable
3. **Performance**: Tests should run efficiently
4. **Documentation**: Complex test scenarios must be documented

### 9.3 Test Data Cleanup
```php
<?php
// tests/Concerns/CleansUpTestData.php

trait CleansUpTestData
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->cleanupTestFiles();
    }
    
    protected function tearDown(): void
    {
        $this->cleanupTestFiles();
        parent::tearDown();
    }
    
    private function cleanupTestFiles(): void
    {
        // Clean up uploaded test files
        Storage::disk('local')->deleteDirectory('test-uploads');
        
        // Clear test caches
        Cache::tags(['test'])->flush();
    }
}
```

---

**Testing Strategy Version**: 1.0  
**Coverage Target**: 80%+  
**Framework**: Laravel + React + Playwright  
**Last Updated**: 2025 