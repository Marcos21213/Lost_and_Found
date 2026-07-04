import { ChangeEvent, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Badge, Button, Card, Dialog, Empty, Grid, Image, NavBar, Tabs, Tag, Toast } from 'antd-mobile';
import { clearAuthStorage, getUserInfo } from '@/utils/storage';

type UserInfo = {
  id?: string;
  phone?: string;
  nickname?: string;
  college?: string;
  avatar?: string;
};

type MineTab = 'posts' | 'favorites' | 'comments';

type MineCardItem = {
  id: string;
  title: string;
  desc: string;
  type: 'lost' | 'found' | 'comment';
  tag: string;
  time: string;
  image: string;
};

const createImage = (label: string, start: string, end: string) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="180" viewBox="0 0 240 180">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="${start}" offset="0"/>
          <stop stop-color="${end}" offset="1"/>
        </linearGradient>
      </defs>
      <rect width="240" height="180" rx="28" fill="url(#g)"/>
      <circle cx="196" cy="38" r="36" fill="rgba(255,255,255,.16)"/>
      <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="46" font-family="Arial" font-weight="800">${label}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const createAvatar = (name: string) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="#1677ff" offset="0"/>
          <stop stop-color="#35c6ff" offset="1"/>
        </linearGradient>
      </defs>
      <rect width="160" height="160" rx="80" fill="url(#g)"/>
      <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="64" font-family="Arial" font-weight="800">${name.slice(0, 1)}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const mineLists: Record<MineTab, MineCardItem[]> = {
  posts: [
    {
      id: '101',
      title: '蓝色保温杯遗失',
      desc: '图书馆三楼靠窗位置，杯身有浅色贴纸。',
      type: 'lost',
      tag: '寻找中',
      time: '今天 10:20',
      image: createImage('杯', '#1677ff', '#55c7ff'),
    },
    {
      id: '105',
      title: '白色帆布袋寻找',
      desc: '袋内有教材和实验记录本，可能落在自习室。',
      type: 'lost',
      tag: '待反馈',
      time: '昨天 16:40',
      image: createImage('袋', '#f59e0b', '#fb7185'),
    },
  ],
  favorites: [
    {
      id: '102',
      title: '捡到校园卡一张',
      desc: '已交到一食堂服务台，可凭证件领取。',
      type: 'found',
      tag: '已收藏',
      time: '28 分钟前',
      image: createImage('卡', '#22c55e', '#7ddf9b'),
    },
    {
      id: '108',
      title: '拾到计算器',
      desc: '型号为科学计算器，显示屏贴膜未撕。',
      type: 'found',
      tag: '已收藏',
      time: '前天 12:12',
      image: createImage('算', '#8b5cf6', '#06b6d4'),
    },
  ],
  comments: [
    {
      id: '103',
      title: '黑色无线耳机盒',
      desc: '我的留言：可以去操场看台右侧问一下保洁老师。',
      type: 'comment',
      tag: '留言',
      time: '5 分钟前',
      image: createImage('耳', '#6366f1', '#38bdf8'),
    },
  ],
};

const functionItems = [
  { key: 'posts', title: '我的发布', icon: '发', count: mineLists.posts.length },
  { key: 'favorites', title: '我的收藏', icon: '藏', count: mineLists.favorites.length },
  { key: 'comments', title: '我的留言', icon: '言', count: mineLists.comments.length },
  { key: 'audit', title: '审核进度', icon: '审', count: 1 },
  { key: 'profile', title: '资料设置', icon: '设', count: 0 },
  { key: 'help', title: '帮助反馈', icon: '助', count: 0 },
] as const;

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

.mine-avatar-wrap:active .mine-avatar-edit {
  transform: scale(0.94);
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
  padding: 14px 14px calc(28px + env(safe-area-inset-bottom));
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
  transition: transform 150ms ease, background 150ms ease, box-shadow 150ms ease;
}

.mine-grid-item:active {
  transform: scale(0.97);
  background: #e8f2ff;
  box-shadow: inset 0 0 0 1px rgba(22, 119, 255, 0.1);
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

.mine-tabs .adm-tabs-tab-active {
  color: #1677ff;
}

.mine-tabs .adm-tabs-tab-line {
  height: 3px;
  border-radius: 999px;
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
  transition: transform 140ms ease, box-shadow 140ms ease;
}

.mine-card:active {
  transform: scale(0.985);
  box-shadow: inset 0 0 0 1px rgba(22, 119, 255, 0.2);
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

export default function Mine() {
  const navigate = useNavigate();
  const storedUser = useMemo(() => getUserInfo<UserInfo>(), []);
  const [activeTab, setActiveTab] = useState<MineTab>('posts');
  const [avatar, setAvatar] = useState(storedUser?.avatar || createAvatar(storedUser?.nickname || '我'));
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nickname = storedUser?.nickname || '校园用户';
  const college = storedUser?.college || '计算机学院 2026 级';

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      Toast.show({
        icon: 'fail',
        content: '请选择图片文件',
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      Toast.show({
        icon: 'fail',
        content: '头像图片不能超过 2MB',
      });
      return;
    }

    setAvatar(URL.createObjectURL(file));
    Toast.show({
      icon: 'success',
      content: '头像已更新',
    });
  };

  const handleGridClick = (key: (typeof functionItems)[number]['key']) => {
    if (key === 'posts' || key === 'favorites' || key === 'comments') {
      setActiveTab(key);
      return;
    }

    Toast.show({
      content: '功能入口已预留',
    });
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
    Toast.show({
      icon: 'success',
      content: '已退出登录',
    });
    window.setTimeout(() => {
      navigate('/login', { replace: true });
    }, 360);
  };

  const currentList = mineLists[activeTab];

  return (
    <main className="mine-page">
      <style>{mineStyles}</style>
      <header className="mine-header">
        <NavBar className="mine-navbar" backArrow={false}>
          个人中心
        </NavBar>
        <section className="mine-profile">
          <div className="mine-avatar-wrap" onClick={() => fileInputRef.current?.click()}>
            <Avatar className="mine-avatar" src={avatar} style={{ '--size': '72px', '--border-radius': '999px' }} />
            <span className="mine-avatar-edit">改</span>
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
              <div className="mine-profile-stat">
                <strong>{mineLists.posts.length}</strong>
                <span>发布</span>
              </div>
              <div className="mine-profile-stat">
                <strong>{mineLists.favorites.length}</strong>
                <span>收藏</span>
              </div>
              <div className="mine-profile-stat">
                <strong>{mineLists.comments.length}</strong>
                <span>留言</span>
              </div>
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

        <section className="mine-section">
          <Tabs className="mine-tabs" activeKey={activeTab} onChange={(key) => setActiveTab(key as MineTab)}>
            <Tabs.Tab title="我的发布" key="posts" />
            <Tabs.Tab title="我的收藏" key="favorites" />
            <Tabs.Tab title="我的留言" key="comments" />
          </Tabs>

          {currentList.length === 0 ? (
            <Empty description="暂无内容" />
          ) : (
            <div className="mine-list">
              {currentList.map((item) => (
                <Card className="mine-card" key={item.id} onClick={() => navigate(`/detail/${item.id}`)}>
                  <div className="mine-card-row">
                    <Image className="mine-card-image" src={item.image} fit="cover" />
                    <div>
                      <h3 className="mine-card-title">{item.title}</h3>
                      <p className="mine-card-desc">{item.desc}</p>
                      <div className="mine-card-meta">
                        <Tag
                          className="mine-tag"
                          fill="solid"
                          color={item.type === 'lost' ? '#ff6b3d' : item.type === 'found' ? '#16a34a' : '#1677ff'}
                        >
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

        <Button className="mine-logout" fill="outline" onClick={handleLogout}>
          退出登录
        </Button>
      </section>
    </main>
  );
}
