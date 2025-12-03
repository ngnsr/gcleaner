import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Inbox from "./pages/Inbox";
import type { JSX } from "react";
import AuthCallback from "./components/AuthCallback";

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const isAuthenticated = localStorage.getItem("gcleaner_auth");
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/callback" element={<AuthCallback />} />

        <Route
          path="/inbox"
          element={
            <PrivateRoute>
              <Inbox />
            </PrivateRoute>
          }
        />

        {/* Default route */}
        <Route path="/" element={<Navigate to="/inbox" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
