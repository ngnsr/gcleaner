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
  Select,
  Pagination,
} from "antd";
import {
  DeleteOutlined,
  ContainerOutlined,
  CheckCircleOutlined,
  RobotOutlined,
  CloudDownloadOutlined,
} from "@ant-design/icons";
import MainLayout from "../components/MainLayout";
import {
  getLocalEmails,
  syncEmails,
  analyzeEmails,
  getCategories,
} from "../api";

const { Text } = Typography;

export default function Inbox() {
  // Data State
  const [emails, setEmails] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);

  // UI State
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("All");
  const [loadingList, setLoadingList] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Pagination Token for Gmail History
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(
    undefined
  );

  // 1. Initial Load
  useEffect(() => {
    loadData();
    loadCategories();
  }, [page, category]);

  const loadData = async () => {
    setLoadingList(true);
    try {
      const res = await getLocalEmails(page, category);
      setEmails(res.data);
      setTotal(res.total);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingList(false);
    }
  };

  const loadCategories = async () => {
    try {
      const cats = await getCategories();
      setCategories(cats);
    } catch (e) {
      console.error("Failed to load categories");
    }
  };

  // 2. Smart Sync (Newest + Analyze)
  const handleSmartSync = async () => {
    await runSyncCycle(undefined);
  };

  // 3. Load More History (Older + Analyze)
  const handleLoadHistory = async () => {
    if (!nextPageToken) {
      message.info("Syncing history for the first time...");
    }
    await runSyncCycle(nextPageToken);
  };

  // Shared Logic
  const runSyncCycle = async (token?: string) => {
    setSyncing(true);
    try {
      // A. Sync from Gmail
      const isHistory = !!token;
      message.loading({
        content: isHistory
          ? "Loading older emails..."
          : "Checking for new emails...",
        key: "sync",
      });

      const syncRes = await syncEmails(token);

      // Save the token for the next "Load More" click
      if (syncRes.nextPageToken) {
        setNextPageToken(syncRes.nextPageToken);
      }

      // B. Analyze
      if (syncRes.synced > 0) {
        message.loading({
          content: `Analyzing ${syncRes.synced} emails...`,
          key: "sync",
        });
        const analyzeRes = await analyzeEmails();
        message.success({
          content: `Synced ${syncRes.synced}, Classified ${analyzeRes.processed}`,
          key: "sync",
        });

        // Refresh Data
        loadData();
        loadCategories();
      } else {
        message.info({
          content: "No new emails found in this batch.",
          key: "sync",
        });
      }
    } catch (error) {
      message.error({ content: "Sync failed", key: "sync" });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <MainLayout onRefresh={handleSmartSync} loading={syncing}>
      {/* Filters Toolbar */}
      <Card bordered={false} style={{ marginBottom: 16, borderRadius: 8 }}>
        <Space
          style={{
            width: "100%",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <Space>
            <Text strong>Filter:</Text>
            <Select
              value={category}
              style={{ minWidth: 150 }}
              onChange={(val) => {
                setCategory(val);
                setPage(1);
              }}
            >
              <Select.Option value="All">All Emails</Select.Option>
              {categories.map((cat) => (
                <Select.Option key={cat} value={cat}>
                  {cat}
                </Select.Option>
              ))}
            </Select>
          </Space>

          <Space>
            <Text type="secondary">{total} emails stored</Text>
            {/* Load History Button */}
            <Button
              icon={<CloudDownloadOutlined />}
              onClick={handleLoadHistory}
              loading={syncing}
            >
              Load Older Emails
            </Button>
          </Space>
        </Space>
      </Card>

      {/* Main List */}
      <Card title="Inbox" bordered={false}>
        {loadingList ? (
          <div style={{ textAlign: "center", padding: 50 }}>
            <Spin size="large" />
          </div>
        ) : (
          <>
            <List
              itemLayout="vertical"
              dataSource={emails}
              locale={{
                emptyText:
                  "No emails here. Click 'Refresh' or 'Load Older Emails'!",
              }}
              renderItem={(item) => (
                <List.Item
                  key={item.id}
                  style={{
                    background: "#fff",
                    marginBottom: 12,
                    border: "1px solid #f0f0f0",
                    borderRadius: 8,
                    padding: 16,
                  }}
                  actions={[
                    item.suggestedAction && (
                      <Button
                        size="small"
                        type={
                          item.suggestedAction === "keep"
                            ? "default"
                            : "primary"
                        }
                        danger={item.suggestedAction === "delete"}
                        icon={
                          item.suggestedAction === "delete" ? (
                            <DeleteOutlined />
                          ) : item.suggestedAction === "archive" ? (
                            <ContainerOutlined />
                          ) : (
                            <CheckCircleOutlined />
                          )
                        }
                      >
                        {item.suggestedAction.toUpperCase()}
                      </Button>
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
                        <Space>
                          {item.category && (
                            <Tag color="blue">{item.category}</Tag>
                          )}
                          {!item.isAnalyzed && (
                            <Tag color="default">Pending</Tag>
                          )}
                        </Space>
                      </div>
                    }
                    description={
                      <Text type="secondary">
                        From: {item.from} |{" "}
                        {new Date(item.date).toLocaleDateString()}
                      </Text>
                    }
                  />
                  {item.reasoning && (
                    <div
                      style={{
                        marginTop: 8,
                        color: "#666",
                        fontSize: 12,
                        background: "#f5f5f5",
                        padding: 5,
                        borderRadius: 4,
                      }}
                    >
                      <RobotOutlined /> AI: {item.reasoning}
                    </div>
                  )}
                </List.Item>
              )}
            />

            {/* Pagination for Database */}
            {total > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginTop: 20,
                }}
              >
                <Pagination
                  current={page}
                  total={total}
                  pageSize={10}
                  onChange={setPage}
                  showSizeChanger={false}
                />
              </div>
            )}
          </>
        )}
      </Card>
    </MainLayout>
  );
}
