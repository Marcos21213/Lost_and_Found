import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Dialog, Empty, InfiniteScroll, NavBar, Skeleton, Space, Tag, Toast } from 'antd-mobile';
import AppTabBar from '@/components/AppTabBar';
import { approveAdminPost, fetchAdminPosts, fetchAdminStatistics, rejectAdminPost } from '@/api';
import type { AdminStatistics, PostStatus, PostType, RawPost } from '@/api';
import { formatRelativeTime, statusMeta } from '@/utils/display';

type ReviewPost = {
  id: string;
  title: string;
  desc: string;
  category: string;
  type: PostType;
  location: string;
  reporter: string;
  time: string;
  status: PostStatus;
};

type AdminPageResult = {
  list: ReviewPost[];
  hasMore: boolean;
};

const PAGE_SIZE = 5;
const chartColors = ['#1677ff', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

const defaultStats: AdminStatistics = {
  total_posts: 0,
  pending_posts: 0,
  open_posts: 0,
  offline_posts: 0,
  today_posts: 0,
  total_users: 0,
  matched_posts: 0,
  category_stats: [],
  post_type_stats: [],
  status_stats: [],
  monthly_stats: [],
};

const mapReviewPost = (post: RawPost): ReviewPost => ({
  id: String(post.id),
  title: post.goods_name,
  desc: post.description,
  category: post.category,
  type: post.post_type,
  location: post.location,
  reporter: post.author?.username || `用户 ${post.user_id}`,
  time: formatRelativeTime(post.create_time),
  status: post.status,
});

const fetchReviewPosts = async (page: number): Promise<AdminPageResult> => {
  const result = await fetchAdminPosts({
    page,
    pageSize: PAGE_SIZE,
    status: 'pending',
  });

  return {
    list: result.items.map(mapReviewPost),
    hasMore: page * PAGE_SIZE < result.total,
  };
};

const updateReviewStatus = async (id: string, status: PostStatus) => {
  if (status === 'open') {
    await approveAdminPost(id);
    return;
  }

  await rejectAdminPost(id, '管理员审核下架');
};

const buildLinePoints = (values: number[]) => {
  const width = 300;
  const height = 140;
  const padding = 18;
  const data = values.length > 0 ? values : [0];
  const max = Math.max(...data, 1);
  const min = Math.min(...data);

  return data
    .map((value, index) => {
      const x = padding + (index / Math.max(data.length - 1, 1)) * (width - padding * 2);
      const ratio = (value - min) / (max - min || 1);
      const y = height - padding - ratio * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');
};

const adminStyles = `
.admin-page {
  min-height: 100vh;
  overflow-x: hidden;
  background: #f5f8fd;
}

.admin-header {
  position: sticky;
  top: 0;
  z-index: 12;
  padding: 6px 14px 14px;
  color: #fff;
  background: linear-gradient(135deg, #0f63dc 0%, #1677ff 52%, #35c6ff 100%);
  box-shadow: 0 12px 30px rgba(22, 119, 255, 0.22);
}

.admin-nav {
  --height: 44px;
  --border-bottom: 0;
  color: #fff;
  font-weight: 900;
}

.admin-overview {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
}

.admin-overview-card {
  padding: 12px 8px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(14px);
}

.admin-overview-card strong {
  display: block;
  font-size: 22px;
  line-height: 1.1;
  font-weight: 900;
}

.admin-overview-card span {
  display: block;
  margin-top: 5px;
  color: rgba(255, 255, 255, 0.82);
  font-size: 11px;
}

.admin-content {
  max-width: 640px;
  margin: 0 auto;
  padding: 14px 14px calc(92px + env(safe-area-inset-bottom));
}

.admin-section {
  margin-bottom: 14px;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 10px 26px rgba(16, 24, 40, 0.07);
}

.admin-section .adm-card-body {
  padding: 14px;
}

.admin-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 0 0 14px;
  color: #182230;
  font-size: 16px;
  line-height: 1.3;
  font-weight: 900;
}

.admin-section-title span {
  color: #98a2b3;
  font-size: 11px;
  font-weight: 700;
}

.admin-chart-grid {
  display: grid;
  grid-template-columns: 128px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
}

.admin-pie {
  width: 118px;
  height: 118px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  box-shadow: inset 0 0 0 12px rgba(255, 255, 255, 0.7), 0 12px 22px rgba(16, 24, 40, 0.08);
}

.admin-pie-inner {
  width: 70px;
  height: 70px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  color: #182230;
  background: #fff;
  font-size: 18px;
  font-weight: 900;
}

.admin-legend {
  display: grid;
  gap: 8px;
}

.admin-legend-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: #475467;
  font-size: 12px;
}

.admin-legend-left {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.admin-legend-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
}

.admin-line-wrap {
  overflow: hidden;
  border-radius: 16px;
  background: linear-gradient(180deg, #f7faff 0%, #fff 100%);
}

.admin-line-chart {
  width: 100%;
  height: auto;
  display: block;
}

.admin-months {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  margin-top: -4px;
  color: #98a2b3;
  font-size: 10px;
  text-align: center;
}

.admin-list {
  display: grid;
  gap: 12px;
}

.admin-post-card {
  border-radius: 18px;
  background: #fff;
  box-shadow: inset 0 0 0 1px #eef2f7;
}

.admin-post-card .adm-card-body {
  padding: 13px;
}

.admin-post-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.admin-post-title {
  margin: 0;
  color: #182230;
  font-size: 15px;
  line-height: 1.35;
  font-weight: 900;
}

.admin-post-desc {
  display: -webkit-box;
  margin: 7px 0 10px;
  overflow: hidden;
  color: #667085;
  font-size: 12px;
  line-height: 1.55;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.admin-post-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  margin-bottom: 12px;
  color: #98a2b3;
  font-size: 11px;
}

.admin-status-tag {
  flex: none;
  --border-radius: 999px;
  font-weight: 800;
}

.admin-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.admin-action {
  height: 38px;
  border-radius: 14px;
  font-weight: 900;
}

.admin-risk {
  color: #ef4444;
  border-color: #fecaca;
  background: #fff5f5;
}

.admin-skeleton {
  padding: 14px;
  border-radius: 18px;
  background: #fff;
  box-shadow: inset 0 0 0 1px #eef2f7;
}
`;

const renderSkeleton = () => (
  <div className="admin-list">
    {Array.from({ length: 3 }).map((_, index) => (
      <div className="admin-skeleton" key={index}>
        <Skeleton.Title animated />
        <Skeleton.Paragraph animated lineCount={4} />
      </div>
    ))}
  </div>
);

export default function Admin() {
  const [list, setList] = useState<ReviewPost[]>([]);
  const [stats, setStats] = useState<AdminStatistics>(defaultStats);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState('');
  const actionLockedRef = useRef(false);

  const categoryTotal = useMemo(
    () => stats.category_stats.reduce((sum, item) => sum + item.count, 0),
    [stats.category_stats],
  );
  const categoryLegend = useMemo(
    () =>
      stats.category_stats.slice(0, 6).map((item, index) => ({
        ...item,
        color: chartColors[index % chartColors.length],
        percent: categoryTotal ? Math.round((item.count / categoryTotal) * 100) : 0,
      })),
    [categoryTotal, stats.category_stats],
  );
  const pieGradient = useMemo(() => {
    if (categoryLegend.length === 0 || categoryTotal === 0) {
      return '#eef4ff';
    }

    let cursor = 0;
    const segments = categoryLegend.map((item) => {
      const start = cursor;
      cursor += (item.count / categoryTotal) * 100;
      return `${item.color} ${start}% ${cursor}%`;
    });

    return `conic-gradient(${segments.join(', ')})`;
  }, [categoryLegend, categoryTotal]);
  const monthlyValues = useMemo(() => stats.monthly_stats.map((item) => item.count), [stats.monthly_stats]);
  const trendPoints = useMemo(() => buildLinePoints(monthlyValues), [monthlyValues]);
  const monthLabels = useMemo(
    () => stats.monthly_stats.filter((_, index) => index % 2 === 0).map((item) => item.label),
    [stats.monthly_stats],
  );
  const overviewItems = useMemo(
    () => [
      { label: '待审核', value: stats.pending_posts },
      { label: '今日新增', value: stats.today_posts },
      { label: '已下架', value: stats.offline_posts },
    ],
    [stats],
  );

  const loadStats = useCallback(async () => {
    try {
      setStats(await fetchAdminStatistics());
    } catch {
      setStats(defaultStats);
    }
  }, []);

  const loadPosts = useCallback(async (targetPage: number, append: boolean) => {
    if (!append) {
      setLoading(true);
    }

    try {
      const result = await fetchReviewPosts(targetPage);
      setList((current) => (append ? [...current, ...result.list] : result.list));
      setPage(targetPage);
      setHasMore(result.hasMore);
    } catch (error) {
      setHasMore(false);
      await Dialog.alert({
        title: '加载失败',
        content: error instanceof Error ? error.message : '待审核列表加载失败，请稍后重试',
        confirmText: '知道了',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadStats();
      void loadPosts(1, false);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadPosts, loadStats]);

  const handleReview = async (post: ReviewPost, status: PostStatus) => {
    if (actionLockedRef.current) {
      Toast.show({ content: '操作太快了，请稍后再试' });
      return;
    }

    if (status === 'offline') {
      const confirmed = await Dialog.confirm({
        title: '确认下架',
        content: `确认下架「${post.title}」吗？该操作会影响帖子展示。`,
        confirmText: '下架',
        cancelText: '取消',
      });

      if (!confirmed) {
        return;
      }
    }

    actionLockedRef.current = true;
    window.setTimeout(() => {
      actionLockedRef.current = false;
    }, 800);
    setActionLoadingId(`${post.id}-${status}`);

    try {
      await updateReviewStatus(post.id, status);
      setList((current) => current.filter((item) => item.id !== post.id));
      void loadStats();
      Toast.show({
        icon: 'success',
        content: status === 'open' ? '审核已通过' : '帖子已下架',
      });
    } catch (error) {
      Toast.show({ icon: 'fail', content: error instanceof Error ? error.message : '操作失败，请稍后重试' });
    } finally {
      setActionLoadingId('');
    }
  };

  return (
    <main className="admin-page">
      <style>{adminStyles}</style>
      <header className="admin-header">
        <NavBar className="admin-nav" backArrow={false}>
          管理员后台
        </NavBar>
        <div className="admin-overview">
          {overviewItems.map((item) => (
            <div className="admin-overview-card" key={item.label}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </header>

      <section className="admin-content">
        <Card className="admin-section">
          <h2 className="admin-section-title">
            物品分类占比
            <span>{categoryTotal} 条记录</span>
          </h2>
          {categoryLegend.length === 0 ? (
            <Empty description="暂无分类数据" />
          ) : (
            <div className="admin-chart-grid">
              <div className="admin-pie" style={{ background: pieGradient }}>
                <div className="admin-pie-inner">100%</div>
              </div>
              <div className="admin-legend">
                {categoryLegend.map((item) => (
                  <div className="admin-legend-item" key={item.category}>
                    <span className="admin-legend-left">
                      <span className="admin-legend-dot" style={{ background: item.color }} />
                      {item.category}
                    </span>
                    <strong>{item.percent}%</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="admin-section">
          <h2 className="admin-section-title">
            月度发帖趋势
            <span>近 12 个月</span>
          </h2>
          <div className="admin-line-wrap">
            <svg className="admin-line-chart" viewBox="0 0 300 140" role="img" aria-label="月度发帖趋势折线图">
              <defs>
                <linearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(22, 119, 255, 0.22)" />
                  <stop offset="100%" stopColor="rgba(22, 119, 255, 0)" />
                </linearGradient>
              </defs>
              <path d={`M ${trendPoints} L 282,122 L 18,122 Z`} fill="url(#trendArea)" />
              <polyline points={trendPoints} fill="none" stroke="#1677ff" strokeWidth="4" strokeLinecap="round" />
              {trendPoints.split(' ').map((point) => {
                const [x, y] = point.split(',');
                return <circle cx={x} cy={y} r="4" fill="#fff" stroke="#1677ff" strokeWidth="3" key={point} />;
              })}
            </svg>
          </div>
          <div className="admin-months">
            {monthLabels.map((month) => (
              <span key={month}>{month}</span>
            ))}
          </div>
        </Card>

        <Card className="admin-section">
          <h2 className="admin-section-title">
            待审核帖子
            <span>{stats.pending_posts} 条待处理</span>
          </h2>

          {loading ? (
            renderSkeleton()
          ) : list.length === 0 ? (
            <Empty description="暂无待审核帖子" />
          ) : (
            <div className="admin-list">
              {list.map((post) => {
                const meta = statusMeta(post.status);

                return (
                  <Card className="admin-post-card" key={post.id}>
                    <div className="admin-post-head">
                      <h3 className="admin-post-title">{post.title}</h3>
                      <Tag className="admin-status-tag" fill="solid" color={meta.color}>
                        {meta.text}
                      </Tag>
                    </div>
                    <p className="admin-post-desc">{post.desc}</p>
                    <div className="admin-post-meta">
                      <span>{post.category}</span>
                      <span>{post.type === 'lost' ? '寻物' : '招领'}</span>
                      <span>{post.location}</span>
                      <span>{post.reporter}</span>
                      <span>{post.time}</span>
                    </div>
                    <div className="admin-actions">
                      <Button
                        className="admin-action"
                        color="success"
                        fill="outline"
                        loading={actionLoadingId === `${post.id}-open`}
                        onClick={() => handleReview(post, 'open')}
                      >
                        审核通过
                      </Button>
                      <Button
                        className="admin-action admin-risk"
                        fill="outline"
                        loading={actionLoadingId === `${post.id}-offline`}
                        onClick={() => handleReview(post, 'offline')}
                      >
                        下架
                      </Button>
                    </div>
                  </Card>
                );
              })}

              <InfiniteScroll loadMore={() => loadPosts(page + 1, true)} hasMore={hasMore}>
                {(more, failed, retry) => {
                  if (failed) {
                    return (
                      <Button size="small" fill="none" onClick={retry}>
                        加载失败，点此重试
                      </Button>
                    );
                  }

                  return more ? (
                    <Space justify="center">正在加载更多</Space>
                  ) : (
                    <Space justify="center">没有更多待审核帖子了</Space>
                  );
                }}
              </InfiniteScroll>
            </div>
          )}
        </Card>
      </section>
      <AppTabBar activeKey="admin" />
    </main>
  );
}
