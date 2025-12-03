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
  Checkbox,
} from "antd";
import {
  DeleteOutlined,
  ContainerOutlined,
  RobotOutlined,
  CloudDownloadOutlined,
} from "@ant-design/icons";
import MainLayout from "../components/MainLayout";
import {
  getLocalEmails,
  syncEmails,
  analyzeEmails,
  getCategories,
  performBatchAction,
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
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(
    undefined
  );

  // Selection State (New)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, category]);

  const loadData = async () => {
    setLoadingList(true);
    // Clear selection when changing pages
    setSelectedIds([]);
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

  const handleSmartSync = async () => {
    await runSyncCycle(undefined);
  };

  const handleLoadHistory = async () => {
    if (!nextPageToken) message.info("Syncing history for the first time...");
    await runSyncCycle(nextPageToken);
  };

  const runSyncCycle = async (token?: string) => {
    setSyncing(true);
    try {
      const isHistory = !!token;
      message.loading({
        content: isHistory
          ? "Loading older emails..."
          : "Checking for new emails...",
        key: "sync",
      });

      const syncRes = await syncEmails(token);
      if (syncRes.nextPageToken) setNextPageToken(syncRes.nextPageToken);

      if (syncRes.synced > 0) {
        message.loading({
          content: `Analyzing ${syncRes.synced} emails...`,
          key: "sync",
        });
        await analyzeEmails();
        message.success({ content: `Synced & Classified!`, key: "sync" });
        loadData();
        loadCategories();
      } else {
        message.info({ content: "No new emails found.", key: "sync" });
      }
    } catch (error) {
      message.error({ content: "Sync failed", key: "sync" });
    } finally {
      setSyncing(false);
    }
  };

  // --- Multi-Select Logic ---

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === emails.length) {
      setSelectedIds([]); // Deselect All
    } else {
      setSelectedIds(emails.map((e) => e.id)); // Select All visible
    }
  };

  const executeBatchAction = async (action: "archive" | "delete") => {
    if (selectedIds.length === 0) return;

    setActionLoading(true);
    try {
      await performBatchAction(selectedIds, action);
      message.success(`Successfully ${action}d ${selectedIds.length} emails`);

      // Refresh list
      loadData();
    } catch (error) {
      message.error("Failed to perform action");
    } finally {
      setActionLoading(false);
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
            <Button onClick={handleSelectAll}>
              {selectedIds.length === emails.length && emails.length > 0
                ? "Deselect All"
                : "Select All"}
            </Button>
            <Text strong style={{ marginLeft: 8 }}>
              Filter:
            </Text>
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
            <Button
              icon={<CloudDownloadOutlined />}
              onClick={handleLoadHistory}
              loading={syncing}
            >
              Load Older
            </Button>
          </Space>
        </Space>
      </Card>

      {/* Main List */}
      <Card title="Inbox" bordered={false} style={{ paddingBottom: 60 }}>
        {loadingList ? (
          <div style={{ textAlign: "center", padding: 50 }}>
            <Spin size="large" />
          </div>
        ) : (
          <>
            <List
              itemLayout="vertical"
              dataSource={emails}
              locale={{ emptyText: "No emails here." }}
              renderItem={(item) => (
                <List.Item
                  key={item.id}
                  style={{
                    background: selectedIds.includes(item.id)
                      ? "#e6f7ff"
                      : "#fff", // Highlight selected
                    marginBottom: 12,
                    border: selectedIds.includes(item.id)
                      ? "1px solid #1890ff"
                      : "1px solid #f0f0f0",
                    borderRadius: 8,
                    padding: 16,
                    transition: "all 0.3s",
                  }}
                  // Click anywhere to toggle selection
                  onClick={() => toggleSelect(item.id)}
                  actions={[
                    // We can keep individual actions or remove them since we have bulk actions now
                    // Let's keep them for convenience
                    <Button
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent toggling selection
                        setSelectedIds([item.id]); // Just select this one
                        executeBatchAction(
                          item.suggestedAction === "delete"
                            ? "delete"
                            : "archive"
                        );
                      }}
                      type={
                        item.suggestedAction === "keep" ? "default" : "primary"
                      }
                      danger={item.suggestedAction === "delete"}
                      icon={
                        item.suggestedAction === "delete" ? (
                          <DeleteOutlined />
                        ) : (
                          <ContainerOutlined />
                        )
                      }
                    >
                      Quick{" "}
                      {item.suggestedAction === "delete" ? "Delete" : "Archive"}
                    </Button>,
                  ]}
                >
                  <div style={{ display: "flex", gap: 16 }}>
                    {/* Checkbox */}
                    <Checkbox
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      onClick={(e) => e.stopPropagation()}
                    />

                    <div style={{ flex: 1 }}>
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
                    </div>
                  </div>
                </List.Item>
              )}
            />

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

      {/* FLOATING ACTION BAR */}
      {selectedIds.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#001529",
            padding: "12px 24px",
            borderRadius: 30,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            gap: 16,
            color: "white",
            zIndex: 1000,
            animation: "fadeIn 0.3s ease-out",
          }}
        >
          <Text style={{ color: "white", fontWeight: "bold" }}>
            {selectedIds.length} Selected
          </Text>

          <div style={{ height: 20, width: 1, background: "#555" }}></div>

          <Button
            type="primary"
            style={{
              background: "#faad14",
              borderColor: "#faad14",
              color: "black",
            }}
            icon={<ContainerOutlined />}
            loading={actionLoading}
            onClick={() => executeBatchAction("archive")}
          >
            Archive
          </Button>

          <Button
            type="primary"
            danger
            icon={<DeleteOutlined />}
            loading={actionLoading}
            onClick={() => executeBatchAction("delete")}
          >
            Delete
          </Button>

          <Button
            type="text"
            style={{ color: "#aaa" }}
            onClick={() => setSelectedIds([])}
          >
            Cancel
          </Button>
        </div>
      )}
    </MainLayout>
  );
}
