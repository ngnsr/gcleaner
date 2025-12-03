import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Spin, Card, message } from "antd";
import { authenticateWithCode } from "../api";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get("code");
  const called = useRef(false);

  useEffect(() => {
    if (code && !called.current) {
      called.current = true;
      authenticateWithCode(code)
        .then(() => {
          message.success("Logged in successfully!");
          localStorage.setItem("gcleaner_auth", "true");
          navigate("/inbox");
        })
        .catch((err) => {
          console.error(err);
          message.error("Login failed");
          navigate("/login");
        });
    } else if (!code) {
      navigate("/login");
    }
  }, [code, navigate]);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Card>
        <Spin tip="Verifying credentials..." />
      </Card>
    </div>
  );
}
