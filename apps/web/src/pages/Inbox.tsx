import { useEffect, useState } from "react";
import {
  List,
  Card,
  Tag,
  Button,
  Spin,
  Typography,
  message,
  Space,
} from "antd";
import { getEmails, clusterEmails } from "../api";
import MainLayout from "../components/MainLayout";

const { Text } = Typography;

export default function Inbox() {
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const rawEmails = await getEmails();
      setEmails(rawEmails);
      setLoading(false);

      setProcessing(true);
      message.info("AI is analyzing your emails...");

      const analyzedEmails = await clusterEmails();
      setEmails(analyzedEmails);
      message.success("Analysis complete!");
    } catch (error) {
      console.error(error);
      message.error("Failed to load or classify emails");
    } finally {
      setLoading(false);
      setProcessing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getActionColor = (action: string) => {
    switch (action?.toLowerCase()) {
      case "delete":
        return "error";
      case "archive":
        return "warning";
      case "keep":
        return "success";
      default:
        return "default";
    }
  };

  return (
    <MainLayout onRefresh={fetchData} loading={loading || processing}>
      <Card title="Smart Inbox" bordered={false}>
        {loading && !emails.length ? (
          <div style={{ textAlign: "center", padding: 50 }}>
            <Spin size="large" tip="Connecting to Gmail..." />
          </div>
        ) : (
          <List
            itemLayout="vertical"
            dataSource={emails}
            renderItem={(item) => (
              <List.Item
                key={item.id}
                style={{
                  background: "#fff",
                  marginBottom: 16,
                  border: "1px solid #f0f0f0",
                  borderRadius: 8,
                  padding: 16,
                }}
                actions={[
                  item.action && (
                    <Space>
                      <Button
                        size="small"
                        type="primary"
                        danger={item.action === "delete"}
                        ghost
                      >
                        {item.action.toUpperCase()}
                      </Button>
                    </Space>
                  ),
                ]}
              >
                <List.Item.Meta
                  title={
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text strong>{item.subject || "(No Subject)"}</Text>
                      {item.category && <Tag color="blue">{item.category}</Tag>}
                    </div>
                  }
                  description={<Text type="secondary">From: {item.from}</Text>}
                />
                {item.action && (
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary">AI Suggestion: </Text>
                    <Tag color={getActionColor(item.action)}>{item.action}</Tag>
                  </div>
                )}
              </List.Item>
            )}
          />
        )}
      </Card>
    </MainLayout>
  );
}
