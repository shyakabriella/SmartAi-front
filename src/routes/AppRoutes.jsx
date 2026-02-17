// src/routes/AppRoutes.jsx
import { Routes, Route, Navigate } from "react-router-dom";

import Layout from "../components/Layout.jsx";
import Home from "../pages/Home.jsx";
import Login from "../pages/Login.jsx";
import Terms from "../pages/Terms.jsx";
import HostRegister from "../pages/HostRegister.jsx";

import DashboardLayouts from "../layouts/DashboardLayouts.jsx";
import ProtectedRoute from "../components/auth/ProtectedRoute.jsx";

/* ---------------- OWNER ---------------- */
import Owner from "../pages/owner/Owner.jsx";
import OwnerShowroomPage from "../pages/owner/OwnerShowroomPage.jsx"; // ✅ REAL SHOWROOM PAGE

/* ---------------- ADMIN ---------------- */
import Admin from "../pages/admin/Admin.jsx";
import Agent from "../pages/admin/Agent.jsx";

import CustomersPage from "../pages/admin/customers/CustomersPage.jsx";
import CustomerCreate from "../pages/admin/customers/CustomerCreate.jsx";
import CustomerDetail from "../pages/admin/customers/CustomerDetail.jsx";

import VehiclesPage from "../pages/admin/vehicles/VehiclesPage.jsx"; // ✅ reused for owner too
import CustomerShowroom from "../pages/admin/vehicles/CustomerShowroom.jsx";

import DriversPage from "../pages/admin/drivers/DriversPage.jsx";
import DriverCreate from "../pages/admin/drivers/DriverCreate.jsx";
import DriverDetail from "../pages/admin/drivers/DriverDetail.jsx";

import ReviewsPage from "../pages/admin/reviews/ReviewsPage.jsx";
import Payments from "../pages/admin/payments/Payments.jsx";

import ShowroomsPage from "../pages/admin/showrooms/ShowroomsPage.jsx";
import ShowroomVehiclesPage from "../pages/admin/showrooms/ShowroomVehiclesPage.jsx";

/* ---------------- CUSTOMER ---------------- */
import CustomerLayouts from "../pages/customer/CustomerLayouts.jsx";
import Customer from "../pages/customer/Customer.jsx";

function AppRoutes() {
  return (
    <Routes>
      {/* ---------------- PUBLIC ---------------- */}
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="terms" element={<Terms />} />
        <Route path="login" element={<Login />} />
        <Route path="host/register" element={<HostRegister />} />
      </Route>

      {/* ---------------- CUSTOMER ---------------- */}
      <Route
        path="/customer"
        element={
          <ProtectedRoute>
            <CustomerLayouts />
          </ProtectedRoute>
        }
      >
        <Route index element={<Customer />} />
        <Route
          path="bookings"
          element={<div className="p-6">Customer Bookings (coming soon)</div>}
        />
        <Route
          path="profile"
          element={<div className="p-6">Customer Profile (coming soon)</div>}
        />
        <Route
          path="support"
          element={<div className="p-6">Support (coming soon)</div>}
        />
      </Route>

      {/* ---------------- OWNER ---------------- */}
      <Route
        path="/owner"
        element={
          <ProtectedRoute>
            <DashboardLayouts />
          </ProtectedRoute>
        }
      >
        <Route index element={<Owner />} />

        {/* ✅ REAL SHOWROOM PAGE (shows showroom + vehicles list + Add car button) */}
        <Route path="showroom" element={<OwnerShowroomPage />} />

        {/* ✅ reuse VehiclesPage so owner can really add vehicles */}
        <Route path="vehicles" element={<VehiclesPage />} />

        <Route
          path="bookings"
          element={<div className="p-6">Owner Bookings (coming soon)</div>}
        />
      </Route>

      {/* ---------------- ADMIN ---------------- */}
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

        {/* Showrooms */}
        <Route path="showrooms" element={<ShowroomsPage />} />
        <Route
          path="showrooms/:showroomId/vehicles"
          element={<ShowroomVehiclesPage />}
        />

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

        {/* Others */}
        <Route path="reviews" element={<ReviewsPage />} />
        <Route path="payments" element={<Payments />} />

        <Route
          path="bookings"
          element={<div className="p-6">Bookings (coming soon)</div>}
        />
      </Route>

      {/* ---------------- CATCH-ALL ---------------- */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;