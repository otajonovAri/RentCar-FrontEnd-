import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuthStore } from '@/store/authStore'
import MainLayout from '@/components/layout/MainLayout'
import GuestLayout from '@/components/layout/GuestLayout'
import PrivateRoute from '@/components/PrivateRoute'

// ── Root redirect: auth → my-rentals/dashboard, guest → catalog ───────────────
function RootRedirect() {
  const { isAuthenticated, role } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/catalog" replace />
  if (role === 'Customer' || role === 'Owner') return <Navigate to="/my-rentals" replace />
  return <Navigate to="/dashboard" replace />
}

// ── Catalog wrapper: auth → MainLayout, guest → GuestLayout ──────────────────
function CatalogWrapper() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (isAuthenticated) {
    // Authenticated users get the full app layout (sidebar visible)
    return <MainLayout />
  }
  // Guests get the public layout
  return <GuestLayout />
}

// ── Lazy loading ──────────────────────────────────────────────────────────────
function L({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <Spin size="large" />
        </div>
      }
    >
      {children}
    </Suspense>
  )
}

// ── Auth sahifalari ───────────────────────────────────────────────────────────
const LoginPage              = lazy(() => import('@/pages/auth/LoginPage'))
const RegisterPage           = lazy(() => import('@/pages/auth/RegisterPage'))
const VerifyEmailPage        = lazy(() => import('@/pages/auth/VerifyEmailPage'))
const ConfirmEmailPage       = lazy(() => import('@/pages/auth/ConfirmEmailPage'))
const ResendConfirmationPage = lazy(() => import('@/pages/auth/ResendConfirmationPage'))

// ── Sahifalar ─────────────────────────────────────────────────────────────────
const DashboardPage    = lazy(() => import('@/pages/DashboardPage'))
const ProfilePage      = lazy(() => import('@/pages/ProfilePage'))
const CustomerHomePage = lazy(() => import('@/pages/customer/CustomerHomePage'))
const NotFoundPage     = lazy(() => import('@/pages/NotFoundPage'))
const ForbiddenPage    = lazy(() => import('@/pages/ForbiddenPage'))

// ── Katalog (ochiq + auth uchun) ──────────────────────────────────────────────
const CarCatalogPage = lazy(() => import('@/pages/catalog/CarCatalogPage'))
const CarDetailPage  = lazy(() => import('@/pages/catalog/CarDetailPage'))

// ── Asosiy modullar ───────────────────────────────────────────────────────────
const CarsPage          = lazy(() => import('@/pages/cars/CarsPage'))
const RegionsPage       = lazy(() => import('@/pages/regions/RegionsPage'))
const CitiesPage        = lazy(() => import('@/pages/cities/CitiesPage'))
const BranchesPage      = lazy(() => import('@/pages/branches/BranchesPage'))
const DriversPage       = lazy(() => import('@/pages/drivers/DriversPage'))
const ReservationsPage  = lazy(() => import('@/pages/reservations/ReservationsPage'))
const RentalsPage       = lazy(() => import('@/pages/rentals/RentalsPage'))
const FinesPage         = lazy(() => import('@/pages/fines/FinesPage'))
const InvoicesPage      = lazy(() => import('@/pages/invoices/InvoicesPage'))
const NotificationsPage = lazy(() => import('@/pages/notifications/NotificationsPage'))
const ConversationsPage = lazy(() => import('@/pages/conversations/ConversationsPage'))
const OwnerPortalPage   = lazy(() => import('@/pages/ownerPortal/OwnerPortalPage'))

// ── Manager+ ─────────────────────────────────────────────────────────────────
const InspectionsPage       = lazy(() => import('@/pages/inspections/InspectionsPage'))
const DamageReportsPage     = lazy(() => import('@/pages/damageReports/DamageReportsPage'))
const MaintenancePage       = lazy(() => import('@/pages/maintenance/MaintenancePage'))
const OwnerPayoutsPage      = lazy(() => import('@/pages/ownerPayouts/OwnerPayoutsPage'))
const InsurancePage         = lazy(() => import('@/pages/insurance/InsurancePage'))
const OwnersPage            = lazy(() => import('@/pages/owners/OwnersPage'))
const OwnerContractsPage    = lazy(() => import('@/pages/ownerContracts/OwnerContractsPage'))

// ── Admin+ ───────────────────────────────────────────────────────────────────
const UsersPage              = lazy(() => import('@/pages/users/UsersPage'))
const DeletionRequestsPage   = lazy(() => import('@/pages/deletionRequests/DeletionRequestsPage'))
const PricingTiersPage       = lazy(() => import('@/pages/pricingTiers/PricingTiersPage'))
const PromotionsPage         = lazy(() => import('@/pages/promotions/PromotionsPage'))
const CarListingsPage        = lazy(() => import('@/pages/carListings/CarListingsPage'))
const CarFeaturesPage        = lazy(() => import('@/pages/carFeatures/CarFeaturesPage'))
const BrandsPage             = lazy(() => import('@/pages/brands/BrandsPage'))
const CarModelsPage          = lazy(() => import('@/pages/carModels/CarModelsPage'))

// ── Router ────────────────────────────────────────────────────────────────────
const router = createBrowserRouter([

  // ─── Auth sahifalari (hammaga ochiq) ────────────────────────────────────
  { path: '/login',               element: <L><LoginPage /></L> },
  { path: '/register',            element: <L><RegisterPage /></L> },
  { path: '/verify-email',        element: <L><VerifyEmailPage /></L> },
  { path: '/confirm-email',       element: <L><ConfirmEmailPage /></L> },
  { path: '/resend-confirmation',  element: <L><ResendConfirmationPage /></L> },

  // ─── Root: guest → /catalog, auth → dashboard/my-rentals ────────────────
  { path: '/', element: <RootRedirect /> },

  // ─── Katalog (OCHIQ — login talab qilinmaydi) ────────────────────────────
  // Guest → GuestLayout, Authenticated → MainLayout (CatalogWrapper decides)
  {
    element: <CatalogWrapper />,
    children: [
      { path: '/catalog',     element: <L><CarCatalogPage /></L> },
      { path: '/catalog/:id', element: <L><CarDetailPage /></L> },
    ],
  },

  // ─── Himoyalangan sahifalar ───────────────────────────────────────────────
  {
    element: <PrivateRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { path: '/dashboard',     element: <L><DashboardPage /></L> },
          { path: '/my-rentals',    element: <L><CustomerHomePage /></L> },
          { path: '/profile',       element: <L><ProfilePage /></L> },

          // Barcha auth rollar
          { path: '/cars',          element: <L><CarsPage /></L> },
          { path: '/regions',       element: <L><RegionsPage /></L> },
          { path: '/cities',        element: <L><CitiesPage /></L> },
          { path: '/branches',      element: <L><BranchesPage /></L> },
          { path: '/drivers',       element: <L><DriversPage /></L> },
          { path: '/reservations',  element: <L><ReservationsPage /></L> },
          { path: '/rentals',       element: <L><RentalsPage /></L> },
          { path: '/fines',         element: <L><FinesPage /></L> },
          { path: '/invoices',      element: <L><InvoicesPage /></L> },
          { path: '/notifications', element: <L><NotificationsPage /></L> },
          { path: '/conversations', element: <L><ConversationsPage /></L> },
          { path: '/my-cars',       element: <L><OwnerPortalPage /></L> },

          // Manager, Admin, SuperAdmin
          {
            element: <PrivateRoute allowedRoles={['Manager', 'Admin', 'SuperAdmin']} />,
            children: [
              { path: '/payments',       element: <L><RentalsPage /></L> },
              { path: '/inspections',    element: <L><InspectionsPage /></L> },
              { path: '/damage-reports', element: <L><DamageReportsPage /></L> },
              { path: '/maintenance',    element: <L><MaintenancePage /></L> },
              { path: '/owner-payouts',  element: <L><OwnerPayoutsPage /></L> },
              { path: '/insurance',      element: <L><InsurancePage /></L> },
            ],
          },

          // Admin, SuperAdmin — Owner management
          {
            element: <PrivateRoute allowedRoles={['Admin', 'SuperAdmin']} />,
            children: [
              { path: '/owners',           element: <L><OwnersPage /></L> },
              { path: '/owner-contracts',  element: <L><OwnerContractsPage /></L> },
            ],
          },

          // Admin, SuperAdmin
          {
            element: <PrivateRoute allowedRoles={['Admin', 'SuperAdmin']} />,
            children: [
              { path: '/users',              element: <L><UsersPage /></L> },
              { path: '/deletion-requests',  element: <L><DeletionRequestsPage /></L> },
              { path: '/pricing-tiers',      element: <L><PricingTiersPage /></L> },
              { path: '/promotions',         element: <L><PromotionsPage /></L> },
              { path: '/car-listings',       element: <L><CarListingsPage /></L> },
              { path: '/car-features',       element: <L><CarFeaturesPage /></L> },
              { path: '/brands',             element: <L><BrandsPage /></L> },
              { path: '/car-models',         element: <L><CarModelsPage /></L> },
            ],
          },
        ],
      },
    ],
  },

  // ─── Xato sahifalari ─────────────────────────────────────────────────────
  { path: '/403', element: <L><ForbiddenPage /></L> },
  { path: '*',    element: <L><NotFoundPage /></L> },
], {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  future: {
    v7_startTransition:             true,
    v7_relativeSplatPath:           true,
    v7_fetcherPersist:              true,
    v7_normalizeFormMethod:         true,
    v7_partialHydration:            true,
    v7_skipActionErrorRevalidation: true,
  } as any,
})

export default router
