import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import "./index.css";
import Layout from "./components/Layout";
import PublicLayout from "./components/PublicLayout";
import { GuestRoute, ProtectedRoute, RoleRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import Addresses from "./pages/Addresses";
import Assignments from "./pages/Assignments";
import Dashboard from "./pages/Dashboard";
import DeliveryAttempts from "./pages/DeliveryAttempts";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import Register from "./pages/Register";
import ShipmentDetail from "./pages/ShipmentDetail";
import ShipmentForm from "./pages/ShipmentForm";
import Shipments from "./pages/Shipments";
import Track from "./pages/Track";
import TrackingEvents from "./pages/TrackingEvents";
import Users from "./pages/Users";

const router = createBrowserRouter([
  {
    errorElement: <NotFound />,
    children: [
      {
        path: "/",
        element: <PublicLayout />,
        children: [
          { index: true, element: <Track /> },
          { path: "track/:trackingNumber", element: <Track /> },
          {
            element: <GuestRoute />,
            children: [
              { path: "login", element: <Login /> },
              { path: "register", element: <Register /> },
            ],
          },
        ],
      },
      {
        path: "/app",
        element: <ProtectedRoute />,
        children: [
          {
            element: <Layout />,
            children: [
              { index: true, element: <Navigate to="dashboard" replace /> },
              { path: "dashboard", element: <Dashboard /> },
              { path: "shipments", element: <Shipments /> },
              { path: "shipments/:id", element: <ShipmentDetail /> },
              { path: "profile", element: <Profile /> },
              {
                element: <RoleRoute roles={["admin", "staff", "customer"]} />,
                children: [
                  { path: "shipments/new", element: <ShipmentForm /> },
                  { path: "shipments/:id/edit", element: <ShipmentForm /> },
                  { path: "addresses", element: <Addresses /> },
                ],
              },
              {
                element: <RoleRoute roles={["admin", "staff", "agent"]} />,
                children: [
                  { path: "tracking-events", element: <TrackingEvents /> },
                  { path: "assignments", element: <Assignments /> },
                  { path: "delivery-attempts", element: <DeliveryAttempts /> },
                ],
              },
              {
                element: <RoleRoute roles={["admin", "staff"]} />,
                children: [{ path: "users", element: <Users /> }],
              },
            ],
          },
        ],
      },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthProvider>
  </StrictMode>,
);
