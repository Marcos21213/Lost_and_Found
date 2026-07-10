import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Dialog,
  Empty,
  Grid,
  Image,
  NavBar,
  Skeleton,
  Tabs,
  Tag,
  Toast,
} from 'antd-mobile';
import AppTabBar from '@/components/AppTabBar';
import {
  fetchAdminStatistics,
  fetchMyCollects,
  fetchMyComments,
  fetchMyPosts,
  fetchUserProfile,
  uploadAvatar,
} from '@/api';
import type { AdminStatistics, PostType, RawMyComment, RawPost, RawUser } from '@/api';
import {
  createPlaceholderImage,
  formatRelativeTime,
  getAvatarUrl,
  getPostImage,
  normalizeUserInfo,
  statusMeta,
} from '@/utils/display';
import { clearAuthStorage, getUserInfo, getUserRole, setUserInfo } from '@/utils/storage';
import type { UserInfo } from '@/utils/storage';

type MineTab = 'posts' | 'favorites' | 'comments';
type FunctionKey = MineTab | 'audit' | 'profile' | 'help' | 'admin' | 'users' | 'offline';

type MineCardItem = {
  id: string;
  title: string;
  desc: string;
  type: PostType | 'comment';
  tag: string;
  tagColor: string;
  time: string;
  image: string;
};

const emptyLists: Record<MineTab, MineCardItem[]> = {
  posts: [],
  favorites: [],
  comments: [],
};

const defaultAdminStats: AdminStatistics = {
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

const mapPostCard = (post: RawPost, mode: 'post' | 'favorite'): MineCardItem => {
  const meta = mode === 'favorite' ? { text: '已收藏', color: '#1677ff' } : statusMeta(post.status);

  return {
    id: String(post.id),
    title: post.goods_name,
    desc: post.description,
    type: post.post_type,
    tag: meta.text,
    tagColor: meta.color,
    time: formatRelativeTime(mode === 'favorite' ? post.collect_time || post.create_time : post.create_time),
    image: getPostImage(post),
  };
};

const mapCommentCard = (comment: RawMyComment): MineCardItem => {
  const post = comment.post;

  return {
    id: String(comment.post_id),
    title: post?.goods_name || '原帖已删除',
    desc: `我的留言：${comment.content}`,
    type: 'comment',
    tag: '留言',
    tagColor: '#1677ff',
    time: formatRelativeTime(comment.create_time),
    image: post ? getPostImage(post) : createPlaceholderImage('帖'),
  };
};

const mineStyles = `
.mine-page {
  min-height: 100vh;
  overflow-x: hidden;
  background: #f5f8fd;
}

.mine-header {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 6px 14px 14px;
  background: linear-gradient(135deg, #1677ff 0%, #2fa7ff 56%, #35c6ff 100%);
  box-shadow: 0 12px 30px rgba(22, 119, 255, 0.22);
}

.mine-navbar {
  --height: 44px;
  --border-bottom: 0;
  color: #fff;
  font-weight: 800;
}

.mine-profile {
  display: grid;
  grid-template-columns: 78px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  padding: 16px;
  border-radius: 24px;
  color: #fff;
  background: rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(14px);
}

.mine-avatar-wrap {
  position: relative;
  width: 72px;
  height: 72px;
}

.mine-avatar {
  border: 3px solid rgba(255, 255, 255, 0.78);
  box-shadow: 0 12px 24px rgba(15, 70, 145, 0.22);
}

.mine-avatar-input {
  display: none;
}

.mine-avatar-edit {
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: 2px solid rgba(255, 255, 255, 0.9);
  border-radius: 999px;
  color: #1677ff;
  background: #fff;
  font-size: 12px;
  font-weight: 900;
  box-shadow: 0 8px 16px rgba(15, 70, 145, 0.2);
}

.mine-name {
  margin: 0;
  font-size: 22px;
  line-height: 1.25;
  font-weight: 900;
}

.mine-college {
  margin: 6px 0 0;
  color: rgba(255, 255, 255, 0.82);
  font-size: 13px;
}

.mine-profile-stats {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}

.mine-profile-stat strong {
  display: block;
  font-size: 18px;
  line-height: 1.1;
}

.mine-profile-stat span {
  color: rgba(255, 255, 255, 0.78);
  font-size: 11px;
}

.mine-content {
  max-width: 640px;
  margin: 0 auto;
  padding: 14px 14px calc(92px + env(safe-area-inset-bottom));
}

.mine-section {
  margin-bottom: 14px;
  padding: 14px;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 10px 26px rgba(16, 24, 40, 0.07);
}

.mine-section-title {
  margin: 0 0 12px;
  color: #182230;
  font-size: 16px;
  font-weight: 900;
}

.mine-grid-item {
  position: relative;
  min-height: 82px;
  display: grid;
  place-items: center;
  padding: 12px 6px;
  border-radius: 18px;
  background: #f7faff;
}

.mine-grid-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  margin-bottom: 8px;
  border-radius: 12px;
  color: #1677ff;
  background: #e8f2ff;
  font-size: 15px;
  font-weight: 900;
}

.mine-grid-title {
  color: #344054;
  font-size: 12px;
  font-weight: 800;
}

.mine-tabs {
  margin: -4px -6px 10px;
}

.mine-tabs .adm-tabs-header {
  border-bottom: 0;
}

.mine-tabs .adm-tabs-tab {
  font-size: 13px;
  font-weight: 800;
}

.mine-list {
  display: grid;
  gap: 12px;
}

.mine-card {
  overflow: hidden;
  border-radius: 18px;
  background: #fff;
  box-shadow: inset 0 0 0 1px #eef2f7;
}

.mine-card .adm-card-body {
  padding: 12px;
}

.mine-card-row {
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr);
  gap: 12px;
}

.mine-card-image {
  width: 82px;
  height: 82px;
  overflow: hidden;
  border-radius: 15px;
  background: #eef4ff;
}

.mine-card-title {
  margin: 0;
  color: #182230;
  font-size: 15px;
  line-height: 1.35;
  font-weight: 900;
}

.mine-card-desc {
  display: -webkit-box;
  margin: 7px 0 8px;
  overflow: hidden;
  color: #667085;
  font-size: 12px;
  line-height: 1.45;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.mine-card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: #98a2b3;
  font-size: 11px;
}

.mine-tag {
  --border-radius: 999px;
  font-weight: 800;
}

.mine-admin-panel {
  display: grid;
  gap: 10px;
}

.mine-admin-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-radius: 16px;
  background: #f7faff;
  color: #344054;
  font-size: 13px;
  font-weight: 800;
}

.mine-admin-row strong {
  color: #1677ff;
  font-size: 20px;
}

.mine-logout {
  width: 100%;
  height: 46px;
  border-radius: 16px;
  color: #ef4444;
  font-weight: 900;
  background: #fff5f5;
  border-color: #fecaca;
  box-shadow: 0 8px 18px rgba(239, 68, 68, 0.08);
}
`;

const renderSkeleton = () => (
  <div className="mine-list">
    {Array.from({ length: 3 }).map((_, index) => (
      <div className="mine-card" key={index}>
        <Skeleton.Title animated />
        <Skeleton.Paragraph animated lineCount={3} />
      </div>
    ))}
  </div>
);

export default function Mine() {
  const navigate = useNavigate();
  const storedUser = useMemo(() => getUserInfo<UserInfo>(), []);
  const isAdmin = getUserRole() === 'admin';
  const [profile, setProfile] = useState<UserInfo | null>(storedUser);
  const [activeTab, setActiveTab] = useState<MineTab>('posts');
  const [lists, setLists] = useState<Record<MineTab, MineCardItem[]>>(emptyLists);
  const [adminStats, setAdminStats] = useState<AdminStatistics>(defaultAdminStats);
  const [loading, setLoading] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const nickname = String(profile?.nickname || profile?.username || '校园用户');
  const college = String(profile?.college || (isAdmin ? '校园服务中心' : '未填写学院'));
  const avatar = getAvatarUrl(nickname, typeof profile?.avatar === 'string' ? profile.avatar : '');
  const counts = useMemo(
    () => ({
      posts: lists.posts.length,
      favorites: lists.favorites.length,
      comments: lists.comments.length,
      pending: lists.posts.filter((item) => item.tag === '待审核').length,
    }),
    [lists],
  );

  const functionItems = useMemo(() => {
    if (isAdmin) {
      return [
        { key: 'admin' as const, title: '管理后台', icon: '管', count: adminStats.pending_posts },
        { key: 'posts' as const, title: '全部帖子', icon: '帖', count: adminStats.total_posts },
        { key: 'users' as const, title: '用户数量', icon: '用', count: adminStats.total_users },
        { key: 'offline' as const, title: '已下架', icon: '下', count: adminStats.offline_posts },
      ];
    }

    return [
      { key: 'posts' as const, title: '我的发布', icon: '发', count: counts.posts },
      { key: 'favorites' as const, title: '我的收藏', icon: '藏', count: counts.favorites },
      { key: 'comments' as const, title: '我的留言', icon: '言', count: counts.comments },
      { key: 'audit' as const, title: '审核进度', icon: '审', count: counts.pending },
      { key: 'profile' as const, title: '资料设置', icon: '设', count: 0 },
      { key: 'help' as const, title: '帮助反馈', icon: '助', count: 0 },
    ];
  }, [adminStats, counts, isAdmin]);

  const loadProfile = useCallback(async () => {
    const rawProfile = await fetchUserProfile();
    const userInfo = normalizeUserInfo(rawProfile as RawUser, String(storedUser?.username || storedUser?.account || ''));
    setProfile(userInfo);
    setUserInfo(userInfo);
  }, [storedUser?.account, storedUser?.username]);

  const loadUserData = useCallback(async () => {
    const [postsResult, collectsResult, commentsResult] = await Promise.all([
      fetchMyPosts(),
      fetchMyCollects(),
      fetchMyComments(),
    ]);

    setLists({
      posts: postsResult.items.map((post) => mapPostCard(post, 'post')),
      favorites: collectsResult.items.map((post) => mapPostCard(post, 'favorite')),
      comments: commentsResult.items.map(mapCommentCard),
    });
  }, []);

  const loadAdminData = useCallback(async () => {
    setAdminStats(await fetchAdminStatistics());
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadPage = async () => {
      setLoading(true);

      try {
        await loadProfile();
        if (isAdmin) {
          await loadAdminData();
        } else {
          await loadUserData();
        }
      } catch (error) {
        if (mounted) {
          Toast.show({ icon: 'fail', content: error instanceof Error ? error.message : '个人中心加载失败' });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadPage();

    return () => {
      mounted = false;
    };
  }, [isAdmin, loadAdminData, loadProfile, loadUserData]);

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      Toast.show({ icon: 'fail', content: '请选择图片文件' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      Toast.show({ icon: 'fail', content: '头像图片不能超过 2MB' });
      return;
    }

    setAvatarUploading(true);

    try {
      const result = await uploadAvatar(file);
      const userInfo = normalizeUserInfo(result.user, String(profile?.username || ''));
      setProfile(userInfo);
      setUserInfo(userInfo);
      Toast.show({ icon: 'success', content: '头像已更新' });
    } catch (error) {
      Toast.show({ icon: 'fail', content: error instanceof Error ? error.message : '头像上传失败' });
    } finally {
      setAvatarUploading(false);
      event.target.value = '';
    }
  };

  const handleGridClick = (key: FunctionKey) => {
    if (isAdmin) {
      if (key === 'admin' || key === 'posts' || key === 'offline') {
        navigate('/admin');
        return;
      }

      Toast.show({ content: '用户管理入口待接入页面' });
      return;
    }

    if (key === 'posts' || key === 'favorites' || key === 'comments') {
      setActiveTab(key);
      return;
    }

    if (key === 'audit') {
      setActiveTab('posts');
      return;
    }

    Toast.show({ content: '功能入口已预留' });
  };

  const handleLogout = async () => {
    const confirmed = await Dialog.confirm({
      title: '退出登录',
      content: '确认退出当前账号吗？退出后需要重新登录。',
      confirmText: '退出',
      cancelText: '取消',
    });

    if (!confirmed) {
      return;
    }

    clearAuthStorage();
    Toast.show({ icon: 'success', content: '已退出登录' });
    window.setTimeout(() => {
      navigate('/login', { replace: true });
    }, 360);
  };

  const currentList = lists[activeTab];

  return (
    <main className="mine-page">
      <style>{mineStyles}</style>
      <header className="mine-header">
        <NavBar className="mine-navbar" backArrow={false}>
          {isAdmin ? '管理员个人中心' : '个人中心'}
        </NavBar>
        <section className="mine-profile">
          <div className="mine-avatar-wrap" onClick={() => fileInputRef.current?.click()}>
            <Avatar className="mine-avatar" src={avatar} style={{ '--size': '72px', '--border-radius': '999px' }} />
            <span className="mine-avatar-edit">{avatarUploading ? '...' : '改'}</span>
            <input
              className="mine-avatar-input"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
            />
          </div>
          <div>
            <h1 className="mine-name">{nickname}</h1>
            <p className="mine-college">{college}</p>
            <div className="mine-profile-stats">
              {isAdmin ? (
                <>
                  <div className="mine-profile-stat">
                    <strong>{adminStats.total_posts}</strong>
                    <span>帖子</span>
                  </div>
                  <div className="mine-profile-stat">
                    <strong>{adminStats.pending_posts}</strong>
                    <span>待审</span>
                  </div>
                  <div className="mine-profile-stat">
                    <strong>{adminStats.total_users}</strong>
                    <span>用户</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="mine-profile-stat">
                    <strong>{counts.posts}</strong>
                    <span>发布</span>
                  </div>
                  <div className="mine-profile-stat">
                    <strong>{counts.favorites}</strong>
                    <span>收藏</span>
                  </div>
                  <div className="mine-profile-stat">
                    <strong>{counts.comments}</strong>
                    <span>留言</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      </header>

      <section className="mine-content">
        <section className="mine-section">
          <h2 className="mine-section-title">常用功能</h2>
          <Grid columns={3} gap={10}>
            {functionItems.map((item) => (
              <Grid.Item key={item.key} onClick={() => handleGridClick(item.key)}>
                <div className="mine-grid-item">
                  <Badge content={item.count || undefined}>
                    <div className="mine-grid-icon">{item.icon}</div>
                  </Badge>
                  <div className="mine-grid-title">{item.title}</div>
                </div>
              </Grid.Item>
            ))}
          </Grid>
        </section>

        {isAdmin ? (
          <section className="mine-section">
            <h2 className="mine-section-title">管理数据</h2>
            <div className="mine-admin-panel">
              <div className="mine-admin-row">
                <span>今日新增帖子</span>
                <strong>{adminStats.today_posts}</strong>
              </div>
              <div className="mine-admin-row">
                <span>已展示帖子</span>
                <strong>{adminStats.open_posts}</strong>
              </div>
              <div className="mine-admin-row">
                <span>已下架帖子</span>
                <strong>{adminStats.offline_posts}</strong>
              </div>
            </div>
          </section>
        ) : (
          <section className="mine-section">
            <Tabs className="mine-tabs" activeKey={activeTab} onChange={(key) => setActiveTab(key as MineTab)}>
              <Tabs.Tab title="我的发布" key="posts" />
              <Tabs.Tab title="我的收藏" key="favorites" />
              <Tabs.Tab title="我的留言" key="comments" />
            </Tabs>

            {loading ? (
              renderSkeleton()
            ) : currentList.length === 0 ? (
              <Empty description="暂无内容" />
            ) : (
              <div className="mine-list">
                {currentList.map((item) => (
                  <Card className="mine-card" key={`${activeTab}-${item.id}`} onClick={() => navigate(`/detail/${item.id}`)}>
                    <div className="mine-card-row">
                      <Image className="mine-card-image" src={item.image} fit="cover" />
                      <div>
                        <h3 className="mine-card-title">{item.title}</h3>
                        <p className="mine-card-desc">{item.desc}</p>
                        <div className="mine-card-meta">
                          <Tag className="mine-tag" fill="solid" color={item.tagColor}>
                            {item.tag}
                          </Tag>
                          <span>{item.time}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}

        <Button className="mine-logout" fill="outline" onClick={handleLogout}>
          退出登录
        </Button>
      </section>
      <AppTabBar activeKey="mine" />
    </main>
  );
}
