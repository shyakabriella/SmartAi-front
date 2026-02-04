// src/routes/AppRoutes.jsx
import { Routes, Route, Navigate } from "react-router-dom";

// Public shell
import Layout from "../components/Layout.jsx";
import Home from "../pages/Home.jsx";
import Login from "../pages/Login.jsx";
import Terms from "../pages/Terms.jsx";
import HostRegister from "../pages/HostRegister.jsx";

// Owner dashboard (host/owner portal)
import Owner from "../pages/owner/Owner.jsx";

// Admin shell
import DashboardLayouts from "../layouts/DashboardLayouts.jsx";
import Admin from "../pages/admin/Admin.jsx";
import Agent from "../pages/admin/Agent.jsx";

// Customers (admin)
import CustomersPage from "../pages/admin/customers/CustomersPage.jsx";
import CustomerCreate from "../pages/admin/customers/CustomerCreate.jsx";
import CustomerDetail from "../pages/admin/customers/CustomerDetail.jsx";

// Vehicles (admin)
import VehiclesPage from "../pages/admin/vehicles/VehiclesPage.jsx";
import CustomerShowroom from "../pages/admin/vehicles/CustomerShowroom.jsx";

// Drivers (admin)
import DriversPage from "../pages/admin/drivers/DriversPage.jsx";
import DriverCreate from "../pages/admin/drivers/DriverCreate.jsx";
import DriverDetail from "../pages/admin/drivers/DriverDetail.jsx";

// Reviews (admin)
import ReviewsPage from "../pages/admin/reviews/ReviewsPage.jsx";

// Payments (admin)
import Payments from "../pages/admin/payments/Payments.jsx";

// Auth guard
import ProtectedRoute from "../components/auth/ProtectedRoute.jsx";

function AppRoutes() {
  return (
    <Routes>
      {/* ✅ Public site (ONLY keep Home + login + terms + host register) */}
      <Route element={<Layout />}>
        <Route index element={<Home />} />

        {/* Static / auth pages */}
        <Route path="terms" element={<Terms />} />
        <Route path="login" element={<Login />} />
        <Route path="host/register" element={<HostRegister />} />

        {/* ❌ HIDDEN / REMOVED public pages
            vehicles, drivers, deals, reviews, payment, booking/confirmed, trips
        */}
      </Route>

      {/* ❌ Optional: hide these placeholders too (customer/driver portals)
          If you still need them, keep them.
      */}
      {/* 
      <Route path="/customer" element={<div className="p-6">Customer Portal</div>} />
      <Route path="/driver" element={<div className="p-6">Driver Portal</div>} />
      */}

      {/* Owner / Host dashboard */}
      <Route
        path="/owner"
        element={
          <ProtectedRoute>
            <DashboardLayouts />
          </ProtectedRoute>
        }
      >
        <Route index element={<Owner />} />
      </Route>

      {/* Admin dashboard */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <DashboardLayouts />
          </ProtectedRoute>
        }
      >
        <Route index element={<Admin />} />
        <Route path="agent" element={<Agent />} />

        {/* Customers */}
        <Route path="customers">
          <Route index element={<CustomersPage />} />
          <Route path="new" element={<CustomerCreate />} />
          <Route path=":id" element={<CustomerDetail />} />
        </Route>

        {/* Vehicles */}
        <Route path="vehicles">
          <Route index element={<VehiclesPage />} />
          <Route path=":customerId" element={<CustomerShowroom />} />
        </Route>

        {/* Drivers */}
        <Route path="drivers">
          <Route index element={<DriversPage />} />
          <Route path="new" element={<DriverCreate />} />
          <Route path=":id" element={<DriverDetail />} />
        </Route>

        {/* Reviews */}
        <Route path="reviews" element={<ReviewsPage />} />

        {/* Payments */}
        <Route path="payments" element={<Payments />} />

        {/* Bookings placeholder */}
        <Route
          path="bookings"
          element={<div className="p-6">Bookings (coming soon)</div>}
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;