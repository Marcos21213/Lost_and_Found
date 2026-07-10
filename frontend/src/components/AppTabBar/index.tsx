import { useNavigate } from 'react-router-dom';
import { TabBar } from 'antd-mobile';
import { getUserRole } from '@/utils/storage';

export type AppTabKey = 'home' | 'publish' | 'mine' | 'admin';

const paths: Record<AppTabKey, string> = {
  home: '/home',
  publish: '/publish',
  mine: '/mine',
  admin: '/admin',
};

const baseTabs: Array<{ key: AppTabKey; title: string; icon: string }> = [
  { key: 'home', title: '首页', icon: '首' },
  { key: 'publish', title: '发布', icon: '+' },
  { key: 'mine', title: '我的', icon: '我' },
];

const adminTab = { key: 'admin' as const, title: '管理', icon: '管' };

const tabBarStyles = `
.app-tabbar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 50;
  padding-bottom: env(safe-area-inset-bottom);
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 -10px 28px rgba(16, 24, 40, 0.08);
  backdrop-filter: blur(14px);
}

.app-tabbar .adm-tab-bar-wrap {
  max-width: 640px;
  margin: 0 auto;
}

.app-tab-icon {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  margin: 0 auto 2px;
  border-radius: 8px;
  color: currentColor;
  font-size: 13px;
  line-height: 1;
  font-weight: 900;
}
`;

export default function AppTabBar({ activeKey }: { activeKey: AppTabKey }) {
  const navigate = useNavigate();
  const isAdmin = getUserRole() === 'admin';
  const tabs = isAdmin ? [baseTabs[0], adminTab, baseTabs[2]] : baseTabs;

  return (
    <>
      <style>{tabBarStyles}</style>
      <TabBar
        className="app-tabbar"
        activeKey={activeKey}
        onChange={(key) => {
          const targetPath = paths[key as AppTabKey];

          if (targetPath) {
            navigate(targetPath);
          }
        }}
      >
        {tabs.map((item) => (
          <TabBar.Item
            key={item.key}
            title={item.title}
            icon={<span className="app-tab-icon">{item.icon}</span>}
          />
        ))}
      </TabBar>
    </>
  );
}
