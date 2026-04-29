# Implementation Plan: Admin Dashboard UI/UX Improvement

## Overview

This implementation plan refactors `resources/js/layouts/admin-layout.tsx` to improve UI/UX across the admin panel. Changes include fixing sidebar state management, removing orphan NavLinks, improving mobile/desktop consistency, enhancing accessibility, and modernizing visual design.

**Single file modified:** `resources/js/layouts/admin-layout.tsx`

**Stack:** Laravel 13 + Inertia.js v3 + React 19 + Tailwind CSS v4 + shadcn/ui

---

## Tasks

- [x] 1. Cleanup orphan NavLinks and fix dashboard href in `getAdminNavItems`
  - Remove all orphan NavLinks from `getAdminNavItems` function for all roles
  - Orphan paths to remove: `/admin/staff`, `/admin/cleaning-tasks`, `/admin/cleaning-staff`, `/admin/schedules`, `/admin/guests`, `/admin/guest-support`, `/admin/bookings/payment-status`, `/admin/bookings/room-status`
  - Remove empty groups after orphan removal (e.g., "Guest Services" for `front_desk`)
  - Fix Dashboard href from `/dashboard` to `/admin/dashboard` in `baseItems`
  - _Requirements: 2.1, 2.2, 2.3, 2.6_

- [ ]* 1.1 Write property test for orphan NavLink removal
  - **Property 2: No Orphan NavLinks**
  - **Validates: Requirements 2.1, 2.2**
  - Test that for any role, `getAdminNavItems` returns no orphan hrefs
  - Use fast-check with `fc.constantFrom(...roles)` to test all roles
  - _Requirements: 2.1, 2.2_

- [ ]* 1.2 Write property test for empty group removal
  - **Property 3: No Empty Groups**
  - **Validates: Requirements 2.3**
  - Test that for any role, all groups have `children.length > 0`
  - _Requirements: 2.3_

- [x] 2. Fix sidebar state management — separate handlers for mobile and desktop toggle
  - Rename `toggleSidebar` to `toggleDesktopSidebar` — only modifies `sidebarCollapsed`
  - Create `openMobileSidebar` handler — only sets `sidebarOpen = true`
  - Create `closeMobileSidebar` handler — only sets `sidebarOpen = false`
  - Update header mobile button to call `openMobileSidebar`
  - Update header desktop button to call `toggleDesktopSidebar`
  - Update Sheet `onOpenChange` to call `closeMobileSidebar`
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ]* 2.1 Write property test for state independence
  - **Property 1: State Independence**
  - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
  - Test that toggling one state does not affect the other
  - Use fast-check with `fc.boolean() × fc.boolean()` to test all combinations
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 3. Extract `SidebarLogoHeader` sub-component
  - Create new `SidebarLogoHeader` component with `collapsed?: boolean` prop
  - Move logo header JSX from both Desktop and Mobile sidebars into this component
  - Use `SidebarLogoHeader` in Desktop Sidebar with `collapsed={sidebarCollapsed}`
  - Use `SidebarLogoHeader` in Mobile Sidebar with `collapsed={false}`
  - Apply conditional padding: `px-6 py-5` (expanded), `px-3 py-5` (collapsed)
  - Apply conditional layout: `justify-center` when collapsed, `space-x-3` when expanded
  - _Requirements: 5.2_

- [x] 4. Refactor Mobile Sidebar — replace `AdminSidebarContent` with `AdminSidebarNav`
  - Remove `AdminSidebarContent` component definition entirely
  - Replace `<AdminSidebarContent navItems={navItems} />` in Sheet with `<AdminSidebarNav navItems={navItems} collapsed={false} onNavClick={closeMobileSidebar} />`
  - Add `AdminSidebarFooter` to Mobile Sidebar below nav area
  - Wrap Mobile Sidebar nav and footer with `<TooltipProvider>` (for consistency, though not needed in mobile)
  - _Requirements: 5.1, 5.4, 5.6_

- [x] 5. Improve `AdminSidebarNav` — spacing, animation, aria attributes, `onNavClick` prop
  - [x] 5.1 Add `onNavClick?: () => void` prop to `AdminSidebarNavProps`
    - Call `onNavClick?.()` in every `<Link onClick>` handler
    - _Requirements: 5.4_
  
  - [x] 5.2 Add `aria-current="page"` to active NavLinks
    - Use `aria-current={isChildActive(item.href) ? "page" : undefined}`
    - _Requirements: 6.3_
  
  - [x] 5.3 Add `aria-expanded` to group header buttons
    - Use `aria-expanded={isExpanded}`
    - _Requirements: 6.3_
  
  - [x] 5.4 Replace conditional render with grid animation for group expand/collapse
    - Use `grid-rows-[1fr]` (expanded) and `grid-rows-[0fr]` (collapsed)
    - Apply `transition-all duration-200 ease-in-out` to grid container
    - Wrap children in `overflow-hidden` div
    - _Requirements: 7.7_
  
  - [x] 5.5 Update spacing to match design system
    - Group header: `px-4 py-3`
    - Single nav item: `px-4 py-3`
    - Child nav item: `px-3 py-2.5`
    - Collapsed icon button: `p-2.5` with `justify-center`
    - _Requirements: 7.2_
  
  - [x] 5.6 Add icon scale animation on hover
    - Apply `group-hover:scale-110 transition-transform duration-200` to all icons
    - _Requirements: 7.7_

- [ ]* 5.7 Write property test for active state correctness
  - **Property 4: Active State Correctness**
  - **Validates: Requirements 2.5**
  - Test `isChildActive(href, currentPath)` logic with various href/path combinations
  - _Requirements: 2.5_

- [x] 6. Improve `AdminSidebarFooter` — role badge, fix typo, tooltip avatar when collapsed
  - [x] 6.1 Fix typo `bg-transparant` → `bg-transparent`
    - Search and replace in `AdminSidebarFooter`
    - _Requirements: 4.8_
  
  - [x] 6.2 Add role badge with color per role
    - Create `ROLE_BADGE_COLORS` constant mapping role to Tailwind classes
    - Render badge below user name with `getRoleDisplayName(role)`
    - Hide badge when `collapsed=true`
    - _Requirements: 7.3, 8.2_
  
  - [x] 6.3 Add tooltip to avatar when collapsed
    - Wrap avatar button in `<Tooltip>` when `collapsed=true`
    - Show user name + role in tooltip content
    - _Requirements: 8.3_

- [ ]* 6.4 Write property test for role badge uniqueness
  - **Property 5: Role Badge Uniqueness**
  - **Validates: Requirements 7.3**
  - Test that each role returns a unique badge color string
  - _Requirements: 7.3_

- [ ]* 6.5 Write unit test for footer user info rendering
  - **Property 7: Footer Renders User Info**
  - **Validates: Requirements 8.2**
  - Test that footer renders name, role, and initials for any valid user
  - _Requirements: 8.2_

- [x] 7. Improve Header — branding on mobile, aria labels
  - [x] 7.1 Add logo and brand name to mobile header
    - Show `AppLogoIcon` + "Homsjogja" text on mobile (below `lg`)
    - Position next to hamburger button
    - _Requirements: 3.1, 3.2_
  
  - [x] 7.2 Add aria labels to header buttons
    - Mobile hamburger: `aria-label="Open navigation menu"`
    - Desktop toggle: `aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}`
    - _Requirements: 6.5_
  
  - [x] 7.3 Ensure header height consistency
    - Verify `h-16` is applied consistently across all breakpoints
    - _Requirements: 3.7_

- [x] 8. Improve breadcrumb — chevron separator
  - Replace text separator `/` with `<ChevronRight>` icon from lucide-react
  - Apply `text-brand-primary` to chevron icon
  - Update spacing: `mx-2` around chevron
  - _Requirements: 7.6_

- [x] 9. Audit Tailwind CSS consistency across all components
  - [x] 9.1 Verify sidebar background uses `bg-brand-primary` consistently
    - Check Desktop Sidebar, Mobile Sidebar (Sheet)
    - _Requirements: 4.1_
  
  - [x] 9.2 Verify content area uses `bg-brand-background` consistently
    - Check `AppContent` wrapper
    - _Requirements: 4.2_
  
  - [x] 9.3 Verify nav hover/active states use consistent classes
    - Hover: `hover:bg-white/15` for groups, `hover:bg-white/10` for children
    - Active: `bg-white/25` for groups, `bg-white/20` for children
    - _Requirements: 4.3_
  
  - [x] 9.4 Verify footer border uses `border-white/20` consistently
    - _Requirements: 4.4_
  
  - [x] 9.5 Verify header button hover uses `hover:bg-brand-primary-20` consistently
    - _Requirements: 4.5_
  
  - [x] 9.6 Verify tooltip uses `bg-brand-primary text-white border-brand-primary-20` consistently
    - _Requirements: 4.6_
  
  - [x] 9.7 Remove any hardcoded hex colors or arbitrary values
    - Search for `bg-[#`, `text-[#`, etc.
    - Replace with `brand-*` tokens or Tailwind defaults
    - _Requirements: 4.8_

- [ ]* 9.8 Write property test for group title length
  - **Property 6: Group Title Length**
  - **Validates: Requirements 8.4**
  - Test that all group titles contain at most 2 words
  - _Requirements: 8.4_

- [x] 10. Checkpoint — Ensure all tests pass
  - Run property-based tests: `npm test -- admin-dashboard-ui-ux-improvement`
  - Run unit tests for `AdminSidebarNav`, `AdminSidebarFooter`, `getAdminNavItems`
  - Manually test mobile sidebar open/close behavior
  - Manually test desktop sidebar collapse/expand behavior
  - Manually test keyboard navigation (Tab, Enter, Escape)
  - Ask the user if questions arise or if they want to proceed with full test suite

---

## Notes

- All changes are confined to `resources/js/layouts/admin-layout.tsx` — no other files modified
- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use fast-check library with minimum 100 iterations
- Unit tests use Vitest + React Testing Library
- Checkpoints ensure incremental validation
