import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Dialog,
  Empty,
  InfiniteScroll,
  NavBar,
  Skeleton,
  Space,
  Tag,
  Toast,
} from 'antd-mobile';
import request from '@/utils/request';

type ReviewStatus = 'pending' | 'approved' | 'offline';

type ReviewPost = {
  id: string;
  title: string;
  desc: string;
  category: string;
  type: 'lost' | 'found';
  location: string;
  reporter: string;
  time: string;
  status: ReviewStatus;
};

type AdminPageResult = {
  list: ReviewPost[];
  hasMore: boolean;
};

const DEMO_MODE = true;
const PAGE_SIZE = 3;

const allReviewPosts: ReviewPost[] = [
  {
    id: 'a101',
    title: '蓝色保温杯遗失',
    desc: '发布人补充了联系方式，内容完整，图片清晰。',
    category: '生活用品',
    type: 'lost',
    location: '图书馆三楼',
    reporter: '李同学',
    time: '10 分钟前',
    status: 'pending',
  },
  {
    id: 'a102',
    title: '拾到校园卡一张',
    desc: '包含学生姓名部分信息，建议审核后展示脱敏内容。',
    category: '证件卡片',
    type: 'found',
    location: '一食堂',
    reporter: '王同学',
    time: '28 分钟前',
    status: 'pending',
  },
  {
    id: 'a103',
    title: '黑色无线耳机盒',
    desc: '疑似重复发布，需管理员核对是否保留。',
    category: '数码设备',
    type: 'lost',
    location: '东操场',
    reporter: '陈同学',
    time: '1 小时前',
    status: 'pending',
  },
  {
    id: 'a104',
    title: '透明雨伞招领',
    desc: '文字描述规范，领取地点明确。',
    category: '雨具',
    type: 'found',
    location: '教学楼 A 座',
    reporter: '赵同学',
    time: '2 小时前',
    status: 'pending',
  },
  {
    id: 'a105',
    title: '帆布袋寻找',
    desc: '图片较模糊，但描述信息充分。',
    category: '书包资料',
    type: 'lost',
    location: '自习室 B204',
    reporter: '周同学',
    time: '今天 09:20',
    status: 'pending',
  },
  {
    id: 'a106',
    title: '拾到钥匙串',
    desc: '涉及门禁钥匙，建议下架并联系保卫处。',
    category: '钥匙',
    type: 'found',
    location: '二号门',
    reporter: '刘同学',
    time: '昨天 18:42',
    status: 'pending',
  },
];

const overviewItems = [
  { label: '待审核', value: 18, tone: '#1677ff' },
  { label: '今日新增', value: 32, tone: '#22c55e' },
  { label: '已下架', value: 5, tone: '#ef4444' },
] as const;

const categoryData = [
  { label: '证件卡片', value: 34, color: '#1677ff' },
  { label: '数码设备', value: 24, color: '#22c55e' },
  { label: '生活用品', value: 18, color: '#f59e0b' },
  { label: '其他', value: 24, color: '#8b5cf6' },
];

const monthlyData = [22, 28, 26, 34, 39, 48, 45, 56, 62, 58, 66, 74];
const monthLabels = ['1月', '3月', '5月', '7月', '9月', '11月'];

const wait = (duration = 520) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });

const fetchReviewPosts = async (page: number): Promise<AdminPageResult> => {
  if (DEMO_MODE) {
    await wait();
    const start = (page - 1) * PAGE_SIZE;
    const list = allReviewPosts.slice(start, start + PAGE_SIZE);

    return {
      list,
      hasMore: start + PAGE_SIZE < allReviewPosts.length,
    };
  }

  return (await request.get('/admin/posts/pending', {
    params: {
      page,
      pageSize: PAGE_SIZE,
    },
  })) as unknown as AdminPageResult;
};

const updateReviewStatus = async (id: string, status: ReviewStatus) => {
  if (DEMO_MODE) {
    await wait(360);
    return;
  }

  await request.patch(`/admin/posts/${id}/status`, { status });
};

const buildLinePoints = () => {
  const width = 300;
  const height = 140;
  const padding = 18;
  const max = Math.max(...monthlyData);
  const min = Math.min(...monthlyData);

  return monthlyData
    .map((value, index) => {
      const x = padding + (index / (monthlyData.length - 1)) * (width - padding * 2);
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
  padding: 14px 14px calc(28px + env(safe-area-inset-bottom));
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
  background: conic-gradient(#1677ff 0 34%, #22c55e 34% 58%, #f59e0b 58% 76%, #8b5cf6 76% 100%);
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
  margin: 7px 0 10px;
  color: #667085;
  font-size: 12px;
  line-height: 1.55;
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

const statusMeta: Record<ReviewStatus, { text: string; color: string }> = {
  pending: { text: '待审核', color: '#1677ff' },
  approved: { text: '已通过', color: '#22c55e' },
  offline: { text: '已下架', color: '#ef4444' },
};

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
  const navigate = useNavigate();
  const [list, setList] = useState<ReviewPost[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState('');
  const actionLockedRef = useRef(false);

  const trendPoints = useMemo(() => buildLinePoints(), []);

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
      void loadPosts(1, false);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadPosts]);

  const handleReview = async (post: ReviewPost, status: ReviewStatus) => {
    if (actionLockedRef.current) {
      Toast.show({
        content: '操作太快了，请稍后再试',
      });
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
      setList((current) => current.map((item) => (item.id === post.id ? { ...item, status } : item)));
      Toast.show({
        icon: 'success',
        content: status === 'approved' ? '审核已通过' : '帖子已下架',
      });
    } catch (error) {
      Toast.show({
        icon: 'fail',
        content: error instanceof Error ? error.message : '操作失败，请稍后重试',
      });
    } finally {
      setActionLoadingId('');
    }
  };

  return (
    <main className="admin-page">
      <style>{adminStyles}</style>
      <header className="admin-header">
        <NavBar className="admin-nav" onBack={() => navigate(-1)}>
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
            <span>近 30 天</span>
          </h2>
          <div className="admin-chart-grid">
            <div className="admin-pie">
              <div className="admin-pie-inner">100%</div>
            </div>
            <div className="admin-legend">
              {categoryData.map((item) => (
                <div className="admin-legend-item" key={item.label}>
                  <span className="admin-legend-left">
                    <span className="admin-legend-dot" style={{ background: item.color }} />
                    {item.label}
                  </span>
                  <strong>{item.value}%</strong>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="admin-section">
          <h2 className="admin-section-title">
            月度发帖趋势
            <span>全年统计</span>
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
            <span>{list.filter((item) => item.status === 'pending').length} 条待处理</span>
          </h2>

          {loading ? (
            renderSkeleton()
          ) : list.length === 0 ? (
            <Empty description="暂无待审核帖子" />
          ) : (
            <div className="admin-list">
              {list.map((post) => (
                <Card className="admin-post-card" key={post.id}>
                  <div className="admin-post-head">
                    <h3 className="admin-post-title">{post.title}</h3>
                    <Tag className="admin-status-tag" fill="solid" color={statusMeta[post.status].color}>
                      {statusMeta[post.status].text}
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
                      disabled={post.status === 'approved'}
                      loading={actionLoadingId === `${post.id}-approved`}
                      onClick={() => handleReview(post, 'approved')}
                    >
                      审核通过
                    </Button>
                    <Button
                      className="admin-action admin-risk"
                      fill="outline"
                      disabled={post.status === 'offline'}
                      loading={actionLoadingId === `${post.id}-offline`}
                      onClick={() => handleReview(post, 'offline')}
                    >
                      下架
                    </Button>
                  </div>
                </Card>
              ))}

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
    </main>
  );
}
