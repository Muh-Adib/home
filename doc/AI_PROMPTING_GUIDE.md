# AI Prompting Guide
## Property Management System Development

---

## 📋 OVERVIEW

Dokumen ini menyediakan prompts AI yang terstruktur untuk mengembangkan Property Management System dari awal hingga akhir. Setiap prompt dirancang dengan tag dokumentasi yang tepat untuk memastikan konsistensi dan kualitas development.

---

## 🚀 PHASE 1: PROJECT INITIALIZATION

### 1.1 Environment Setup Prompt
```
**CONTEXT**: Saya akan memulai pengembangan Property Management System menggunakan Laravel 12.x dan React 18+ dengan Shadcn UI.

**TASK**: Setup complete development environment

**REQUIREMENTS**:
- Follow @doc/AI_CODING_RULES.md untuk semua terminal commands
- Reference @doc/SYSTEM_REQUIREMENTS.md untuk tech stack
- Implement @doc/DATABASE_ERD.md database design
- Setup sesuai @doc/TESTING_STRATEGY.md

**DELIVERABLES**:
1. Generate semua Laravel files menggunakan artisan commands dari AI_CODING_RULES.md
2. Setup React + TypeScript + Shadcn UI environment
3. Configure database sesuai ERD specifications
4. Setup testing framework (PHPUnit + Vitest + Playwright)
5. Create basic project structure

**OUTPUT FORMAT**:
- Provide step-by-step terminal commands
- Explain each command purpose
- Verify setup completion
- Document any deviations from requirements

Pastikan menggunakan Laravel 12.x syntax dan React 18+ concurrent features sesuai AI_CODING_RULES.md.
```

### 1.2 Database Schema Implementation
```
**CONTEXT**: Implement database schema berdasarkan ERD design

**REQUIREMENTS**:
- Follow exact schema dari @doc/DATABASE_ERD.md
- Implement all 15 tables dengan relationships
- Create proper indexes untuk performance
- Setup constraints dan validation rules
- Include audit fields (created_at, updated_at, deleted_at)

**BUSINESS LOGIC FOCUS**:
- Whole property rental system (bukan per-kamar)
- DP management dengan percentage tracking
- Guest breakdown (male, female, children)
- Extra bed auto-calculation
- Media management dengan categorization

**TASK**: Generate migration files dengan terminal commands

**DELIVERABLES**:
1. Migration files for all tables
2. Foreign key constraints
3. Database indexes untuk optimization
4. Seeder files dengan realistic test data
5. Model relationships sesuai ERD

Use `php artisan make:migration` commands dan ensure compatibility dengan Laravel 12.x.
```

---

## 🏗️ PHASE 2: BACKEND DEVELOPMENT

### 2.1 Model Development Prompt
```
**CONTEXT**: Create Laravel models dengan modern practices

**REQUIREMENTS**:
- Follow @doc/AI_CODING_RULES.md Laravel 12.x patterns
- Implement @doc/DATABASE_ERD.md relationships
- Use enhanced features: readonly properties, enhanced casts, attributes

**BUSINESS RULES**:
- Property capacity validation
- Booking date validation
- Guest breakdown calculation
- DP amount calculation
- Payment status workflow

**TASK**: Generate comprehensive models

**DELIVERABLES**:
1. Property model dengan media relationships
2. Booking model dengan guest breakdown logic
3. Payment model dengan DP tracking
4. PropertyMedia model dengan file management
5. User model dengan role-based permissions

**SPECIFIC REQUIREMENTS**:
- Use Laravel 12.x Attribute accessors/mutators
- Implement proper scopes for queries
- Add model events untuk business logic
- Include proper casting untuk JSON fields
- Setup soft deletes where appropriate

Generate menggunakan `php artisan make:model` dengan proper flags.
```

### 2.2 API Controller Development
```
**CONTEXT**: Build REST API controllers mengikuti Laravel 12.x best practices

**REQUIREMENTS**:
- Reference @doc/API_DOCUMENTATION.md untuk endpoint specifications
- Follow @doc/AI_CODING_RULES.md untuk controller structure
- Implement @doc/SYSTEM_REQUIREMENTS.md functional requirements

**API ENDPOINTS TO IMPLEMENT**:
1. Properties API (CRUD, media upload, availability check)
2. Bookings API (creation, workflow, status management)
3. Payments API (DP processing, verification)
4. Reports API (financial, occupancy)
5. Media Management API

**BUSINESS LOGIC**:
- Property availability calculation
- Booking workflow management
- DP percentage handling
- Guest breakdown validation
- Extra bed calculation

**TASK**: Create API controllers dengan proper structure

**DELIVERABLES**:
1. PropertyController dengan resource methods
2. BookingController dengan workflow logic
3. PaymentController dengan DP management
4. MediaController untuk file handling
5. ReportController untuk analytics

Use `php artisan make:controller --api` commands dan implement Laravel 12.x dependency injection patterns.
```

### 2.3 Service Layer Development
```
**CONTEXT**: Implement business logic dalam service classes

**REQUIREMENTS**:
- Follow @doc/AI_CODING_RULES.md service patterns
- Implement complex business rules dari @doc/FRD_IMPROVED.md
- Reference @doc/DATA_FLOW_DIAGRAM.md untuk process flows

**CORE SERVICES**:
1. BookingService - Booking creation, validation, workflow
2. PropertyService - Property management, availability
3. PaymentService - DP processing, payment workflow
4. MediaService - File upload, optimization
5. NotificationService - Email, WhatsApp integration

**BUSINESS LOGIC TO IMPLEMENT**:
- Booking availability check dengan conflict detection
- Extra bed calculation berdasarkan guest count
- DP amount calculation dengan percentage options
- Guest breakdown validation
- Dynamic pricing calculation

**TASK**: Create service classes dengan dependency injection

**DELIVERABLES**:
1. Service classes dengan clear interfaces
2. Business rule validation
3. Error handling dan logging
4. Integration dengan external services
5. Performance optimization

Generate dengan `php artisan make:service` dan implement Laravel 12.x patterns.
```

---

## 🎨 PHASE 3: FRONTEND DEVELOPMENT

### 3.1 Component Library Setup
```
**CONTEXT**: Setup React component library dengan Shadcn UI

**REQUIREMENTS**:
- Follow @doc/UI_UX_GUIDELINES.md design system
- Use @doc/AI_CODING_RULES.md React patterns
- Implement Shadcn UI components

**COMPONENTS TO CREATE**:
1. Form components (Input, Select, TextArea dengan validation)
2. Data display (Table, Card, Badge, Alert)
3. Navigation (Sidebar, Breadcrumb, Pagination)
4. Layout components (Dashboard, Form, List layouts)
5. Business-specific (PropertyCard, BookingForm, PaymentStatus)

**DESIGN SYSTEM**:
- Use design tokens dari UI/UX guidelines
- Implement responsive patterns
- Follow accessibility standards
- Use TypeScript untuk type safety

**TASK**: Create reusable component library

**DELIVERABLES**:
1. Base UI components menggunakan Shadcn UI
2. Business-specific components
3. Layout components
4. Form components dengan validation
5. Component documentation dengan Storybook

Use latest React 18+ patterns: concurrent features, suspense, error boundaries.
```

### 3.2 Property Management UI
```
**CONTEXT**: Build property management interface

**REQUIREMENTS**:
- Reference @doc/API_DOCUMENTATION.md untuk data structure
- Follow @doc/UI_UX_GUIDELINES.md patterns
- Implement @doc/FRD_IMPROVED.md property features

**FEATURES TO IMPLEMENT**:
1. Property listing dengan search dan filter
2. Property creation form dengan media upload
3. Property detail view dengan image gallery
4. Availability calendar interface
5. Property settings dan management

**BUSINESS REQUIREMENTS**:
- Whole property rental interface
- Media management dengan drag-drop
- Amenities selection
- Pricing configuration
- Availability blocking

**TASK**: Create comprehensive property management UI

**DELIVERABLES**:
1. PropertyList component dengan filtering
2. PropertyForm dengan validation
3. PropertyDetail dengan media gallery
4. PropertyCalendar untuk availability
5. Media upload component

Use React 18+ features dan Shadcn UI components untuk consistency.
```

### 3.3 Booking Management UI
```
**CONTEXT**: Build booking management interface dengan complex workflow

**REQUIREMENTS**:
- Follow @doc/FRD_IMPROVED.md booking specifications
- Implement guest breakdown interface
- Handle DP workflow management

**BOOKING FEATURES**:
1. Booking creation form dengan guest breakdown
2. Booking workflow tracking
3. Payment management interface
4. Guest communication system
5. Booking calendar dan timeline

**BUSINESS LOGIC UI**:
- Guest breakdown input (male, female, children)
- Extra bed calculation display
- DP percentage selection
- Payment status tracking
- Staff verification workflow

**TASK**: Create booking management components

**DELIVERABLES**:
1. BookingForm dengan guest breakdown
2. BookingWorkflow component
3. PaymentTracking interface
4. BookingCalendar view
5. BookingDetail comprehensive view

Implement real-time updates dengan React Query dan optimistic updates.
```

---

## 🧪 PHASE 4: TESTING IMPLEMENTATION

### 4.1 Backend Testing Setup
```
**CONTEXT**: Implement comprehensive testing strategy

**REQUIREMENTS**:
- Follow @doc/TESTING_STRATEGY.md specifications
- Achieve 80%+ code coverage
- Test all business logic thoroughly

**TESTING SCOPE**:
1. Unit tests untuk service classes
2. Feature tests untuk API endpoints
3. Integration tests untuk database operations
4. Security tests untuk authentication
5. Performance tests untuk critical paths

**BUSINESS LOGIC TESTING**:
- Booking availability calculations
- Extra bed logic
- DP amount calculations
- Guest breakdown validation
- Payment workflow

**TASK**: Create comprehensive test suite

**DELIVERABLES**:
1. Unit tests untuk semua services
2. Feature tests untuk API endpoints
3. Database factory dan seeder untuk testing
4. Security testing untuk vulnerabilities
5. Performance benchmarks

Use PHPUnit dan Pest untuk modern testing approach.
```

### 4.2 Frontend Testing Setup
```
**CONTEXT**: Implement React testing dengan modern tools

**REQUIREMENTS**:
- Follow @doc/TESTING_STRATEGY.md frontend testing
- Test component behavior dan user interactions
- Implement accessibility testing

**TESTING SCOPE**:
1. Component unit tests dengan Testing Library
2. Integration tests untuk forms
3. E2E tests untuk critical user journeys
4. Accessibility tests dengan axe-core
5. Performance tests dengan Lighthouse

**CRITICAL USER JOURNEYS**:
- Property search dan booking creation
- Payment workflow completion
- Admin property management
- Staff booking verification
- Guest communication flow

**TASK**: Create frontend test suite

**DELIVERABLES**:
1. Component tests dengan Vitest
2. E2E tests dengan Playwright
3. Accessibility testing setup
4. Performance monitoring
5. Visual regression testing

Test real user scenarios dengan realistic data.
```

---

## 📊 PHASE 5: REPORTING & ANALYTICS

### 5.1 Financial Reporting System
```
**CONTEXT**: Implement comprehensive reporting system

**REQUIREMENTS**:
- Reference @doc/API_DOCUMENTATION.md reporting endpoints
- Follow @doc/FRD_IMPROVED.md financial requirements
- Implement real-time analytics

**REPORTING FEATURES**:
1. Financial reports dengan DP tracking
2. Occupancy reports dan analytics
3. Revenue analysis dengan trends
4. Property performance metrics
5. Guest analytics dan insights

**FINANCIAL METRICS**:
- Total revenue dengan breakdown
- DP collection rates
- Outstanding payments tracking
- Property profitability analysis
- Seasonal performance trends

**TASK**: Build reporting dan analytics system

**DELIVERABLES**:
1. Report generation backend services
2. Dashboard dengan key metrics
3. Chart components dengan Chart.js/Recharts
4. Export functionality (PDF/Excel)
5. Real-time data updates

Implement caching untuk performance dan real-time updates.
```

---

## 🔄 PHASE 6: INTEGRATION & OPTIMIZATION

### 6.1 Third-party Integrations
```
**CONTEXT**: Integrate external services untuk complete functionality

**REQUIREMENTS**:
- Follow @doc/SYSTEM_REQUIREMENTS.md integration specs
- Implement @doc/FRD_IMPROVED.md communication features

**INTEGRATIONS TO IMPLEMENT**:
1. Payment gateway (Midtrans) untuk DP processing
2. WhatsApp Business API untuk notifications
3. Email service untuk confirmations
4. Google Maps untuk property locations
5. Image optimization services

**INTEGRATION PATTERNS**:
- Robust error handling
- Retry logic dengan exponential backoff
- Webhook processing
- Rate limiting compliance
- Security best practices

**TASK**: Implement external service integrations

**DELIVERABLES**:
1. Payment gateway integration
2. Communication service setup
3. Map integration untuk properties
4. Image processing pipeline
5. Webhook handlers

Test integrations thoroughly dengan sandbox environments.
```

### 6.2 Performance Optimization
```
**CONTEXT**: Optimize application performance untuk production

**REQUIREMENTS**:
- Meet @doc/SYSTEM_REQUIREMENTS.md performance targets
- Follow @doc/AI_CODING_RULES.md optimization patterns

**OPTIMIZATION AREAS**:
1. Database query optimization
2. Caching strategy implementation
3. Frontend performance tuning
4. Image optimization
5. API response optimization

**PERFORMANCE TARGETS**:
- Response time < 2 seconds
- Database queries < 100ms
- Image loading < 3 seconds
- 99.5% uptime target
- Mobile performance optimization

**TASK**: Implement comprehensive performance optimization

**DELIVERABLES**:
1. Database indexing dan query optimization
2. Redis caching implementation
3. CDN setup untuk media files
4. Frontend code splitting
5. Performance monitoring setup

Measure performance improvements dengan before/after metrics.
```

---

## 🚀 PHASE 7: DEPLOYMENT & PRODUCTION

### 7.1 Production Deployment Setup
```
**CONTEXT**: Setup production environment dengan best practices

**REQUIREMENTS**:
- Follow @doc/SYSTEM_REQUIREMENTS.md production specs
- Implement security best practices
- Setup monitoring dan alerting

**DEPLOYMENT COMPONENTS**:
1. Server configuration (Nginx, PHP-FPM)
2. Database optimization (PostgreSQL/MySQL)
3. Redis setup untuk caching dan queues
4. SSL certificate configuration
5. Backup dan disaster recovery

**SECURITY HARDENING**:
- Firewall configuration
- Rate limiting implementation
- Security headers setup
- Regular security updates
- Vulnerability monitoring

**TASK**: Setup production environment

**DELIVERABLES**:
1. Production server configuration
2. CI/CD pipeline setup
3. Monitoring dan alerting
4. Backup strategy implementation
5. Security hardening checklist

Document semua deployment procedures untuk team knowledge.
```

---

## 🔍 PROMPT TEMPLATES BY FEATURE

### Property Management Prompts
```
**PROPERTY LISTING**:
Create property search dengan filtering berdasarkan @doc/API_DOCUMENTATION.md specifications. Implement infinite scrolling dan optimize untuk performance.

**PROPERTY CREATION**:
Build property creation form mengikuti @doc/UI_UX_GUIDELINES.md patterns. Include media upload dengan preview dan validation sesuai @doc/FRD_IMPROVED.md requirements.

**AVAILABILITY MANAGEMENT**:
Implement property calendar dengan booking conflicts detection. Reference @doc/DATABASE_ERD.md untuk data relationships.
```

### Booking Management Prompts
```
**BOOKING CREATION**:
Create booking form dengan guest breakdown interface. Follow @doc/FRD_IMPROVED.md business rules untuk extra bed calculation dan DP management.

**BOOKING WORKFLOW**:
Implement booking status tracking mengikuti @doc/DATA_FLOW_DIAGRAM.md process flows. Include staff verification dan payment tracking.

**PAYMENT PROCESSING**:
Build payment interface dengan DP percentage selection. Integrate dengan payment gateway sesuai @doc/SYSTEM_REQUIREMENTS.md specs.
```

### Reporting Prompts
```
**FINANCIAL REPORTS**:
Create financial dashboard dengan DP tracking dan revenue analysis. Reference @doc/API_DOCUMENTATION.md untuk data structure.

**OCCUPANCY ANALYTICS**:
Build occupancy reports dengan trend analysis. Implement export functionality untuk PDF dan Excel formats.
```

---

## 📋 QUALITY ASSURANCE PROMPTS

### Code Review Prompts
```
**BACKEND CODE REVIEW**:
Review Laravel code menggunakan checklist dari @doc/AI_CODING_RULES.md. Check compliance dengan Laravel 12.x best practices dan security standards.

**FRONTEND CODE REVIEW**:
Review React components untuk TypeScript compliance, Shadcn UI consistency, dan accessibility standards dari @doc/UI_UX_GUIDELINES.md.

**BUSINESS LOGIC VALIDATION**:
Validate business rules implementation terhadap @doc/FRD_IMPROVED.md specifications. Check DP workflow, guest breakdown, dan extra bed calculations.
```

### Testing Prompts
```
**UNIT TEST CREATION**:
Generate unit tests untuk service classes mengikuti @doc/TESTING_STRATEGY.md patterns. Cover all business logic scenarios dengan edge cases.

**INTEGRATION TEST SETUP**:
Create integration tests untuk API endpoints. Test complete workflows dari property creation hingga booking completion.

**E2E TEST SCENARIOS**:
Build E2E tests untuk critical user journeys. Test guest booking flow, admin management, dan payment processing.
```

---

## 🎯 SUCCESS METRICS & VALIDATION

### Development Progress Tracking
```
**MILESTONE VALIDATION**:
- [ ] Phase 1: Environment setup completed
- [ ] Phase 2: Backend API functional
- [ ] Phase 3: Frontend interface complete
- [ ] Phase 4: Testing suite implemented
- [ ] Phase 5: Reporting system working
- [ ] Phase 6: Integrations functional
- [ ] Phase 7: Production deployment ready

**QUALITY GATES**:
- [ ] 80%+ test coverage achieved
- [ ] Performance targets met
- [ ] Security standards implemented
- [ ] Documentation complete
- [ ] Business rules validated
```

### Business Requirements Validation
```
**CORE FUNCTIONALITY CHECK**:
- [ ] Whole property rental system working
- [ ] DP management dengan percentage tracking
- [ ] Guest breakdown calculation correct
- [ ] Extra bed auto-calculation functioning
- [ ] Payment workflow complete
- [ ] Staff verification process working
- [ ] Media management operational
- [ ] Reporting system accurate

**USER EXPERIENCE VALIDATION**:
- [ ] Mobile responsiveness implemented
- [ ] Accessibility standards met
- [ ] Performance benchmarks achieved
- [ ] Error handling comprehensive
- [ ] User feedback incorporated
```

---

## 🔧 TROUBLESHOOTING PROMPTS

### Common Issues Resolution
```
**DATABASE PERFORMANCE**:
Analyze slow queries menggunakan Laravel Telescope. Optimize berdasarkan @doc/DATABASE_ERD.md indexing strategy.

**API RESPONSE OPTIMIZATION**:
Debug API performance issues. Implement caching sesuai @doc/AI_CODING_RULES.md performance patterns.

**FRONTEND RENDERING**:
Optimize React component performance. Use React DevTools untuk identify re-rendering issues.

**INTEGRATION FAILURES**:
Debug third-party API failures. Implement proper error handling dan retry logic.
```

---

**AI Prompting Guide Version**: 1.0  
**Target Development**: 8 months (16 sprints)  
**Documentation Coverage**: Complete  
**Last Updated**: 2025  

---

**🎯 USAGE INSTRUCTIONS**: 
1. Start dengan Phase 1 prompts untuk project setup
2. Follow sequential phases untuk structured development
3. Use feature-specific prompts untuk detailed implementation
4. Apply quality assurance prompts untuk code review
5. Reference troubleshooting prompts untuk issue resolution

**📚 REQUIRED READING**: 
- @doc/FRD_IMPROVED.md - Business requirements
- @doc/AI_CODING_RULES.md - Development standards  
- @doc/SYSTEM_REQUIREMENTS.md - Technical specifications
- @doc/DATABASE_ERD.md - Database design
- @doc/API_DOCUMENTATION.md - API specifications
- @doc/UI_UX_GUIDELINES.md - Design standards
- @doc/TESTING_STRATEGY.md - Testing approach 