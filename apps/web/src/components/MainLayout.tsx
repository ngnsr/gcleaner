import { Layout, Typography, Button, Space, message } from "antd";
import { ReloadOutlined, LogoutOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";

const { Header, Content } = Layout;
const { Title } = Typography;

interface MainLayoutProps {
  children: ReactNode;
  onRefresh?: () => void;
  loading?: boolean;
}

export default function MainLayout({
  children,
  onRefresh,
  loading = false,
}: MainLayoutProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("gcleaner_auth");
    localStorage.removeItem("gcleaner_token");
    message.success("Logged out successfully");
    navigate("/login");
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#001529",
          padding: "0 24px",
          position: "sticky",
          top: 0,
          zIndex: 1000,
        }}
      >
        <Title level={4} style={{ color: "white", margin: 0 }}>
          GCleaner AI
        </Title>

        <Space>
          {/* Only show Refresh button if the page provided an onRefresh function */}
          {onRefresh && (
            <Button
              icon={<ReloadOutlined />}
              onClick={onRefresh}
              loading={loading}
              type="default"
              ghost
              style={{ color: "white", borderColor: "white" }}
            >
              Refresh
            </Button>
          )}

          <Button
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            danger
            type="primary"
          >
            Log Out
          </Button>
        </Space>
      </Header>

      <Content
        style={{
          padding: "24px",
          maxWidth: "1000px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        {children}
      </Content>
    </Layout>
  );
}
