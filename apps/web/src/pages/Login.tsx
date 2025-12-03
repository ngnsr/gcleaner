import { useEffect, useState } from "react";
import { Button, Card, Typography, Layout } from "antd";
import { GoogleOutlined } from "@ant-design/icons";
import { getAuthUrl } from "../api";

const { Title, Paragraph } = Typography;

export default function Login() {
  const [authUrl, setAuthUrl] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuthUrl()
      .then((url) => {
        setAuthUrl(url);
        setLoading(false);
      })
      .catch((err) => {
        console.error("API Error", err);
        setLoading(false);
      });
  }, []);

  return (
    <Layout
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f0f2f5",
      }}
    >
      <Card
        style={{
          width: 400,
          textAlign: "center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}
      >
        <Title level={2}>GCleaner</Title>
        <Paragraph type="secondary">AI-powered Gmail Organization</Paragraph>

        <div style={{ marginTop: 24 }}>
          <Button
            type="primary"
            icon={<GoogleOutlined />}
            size="large"
            block
            loading={loading}
            href={authUrl}
            disabled={!authUrl}
          >
            Sign in with Google
          </Button>
        </div>
      </Card>
    </Layout>
  );
}
