import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Dialog,
  Empty,
  Image,
  InfiniteScroll,
  NavBar,
  PullToRefresh,
  SearchBar,
  Selector,
  Skeleton,
  Space,
  SpinLoading,
  Tabs,
  Tag,
  Toast,
} from 'antd-mobile';

type PostType = 'lost' | 'found';
type HomeTab = 'all' | PostType;
type SearchMode = 'normal' | 'ai';

type PostItem = {
  id: string;
  title: string;
  description: string;
  type: PostType;
  category: string;
  location: string;
  time: string;
  contact: string;
  image: string;
};

type QueryParams = {
  page: number;
  pageSize: number;
  tab: HomeTab;
  keyword: string;
  searchMode: SearchMode;
};

type QueryResult = {
  list: PostItem[];
  hasMore: boolean;
};

const PAGE_SIZE = 4;

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
      <circle cx="190" cy="34" r="34" fill="rgba(255,255,255,.18)"/>
      <circle cx="52" cy="146" r="42" fill="rgba(255,255,255,.14)"/>
      <text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="42" font-family="Arial" font-weight="800">${label}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const posts: PostItem[] = [
  {
    id: '101',
    title: '蓝色保温杯遗失',
    description: '杯身有浅色贴纸，最后一次看到是在图书馆三楼靠窗位置。',
    type: 'lost',
    category: '生活用品',
    location: '图书馆三楼',
    time: '10 分钟前',
    contact: '李同学 138****5721',
    image: createImage('杯', '#1677ff', '#55c7ff'),
  },
  {
    id: '102',
    title: '捡到校园卡一张',
    description: '姓名尾字为“宁”，已交到一食堂服务台，可凭证件领取。',
    type: 'found',
    category: '证件卡片',
    location: '一食堂门口',
    time: '28 分钟前',
    contact: '王同学 156****9042',
    image: createImage('卡', '#22c55e', '#7ddf9b'),
  },
  {
    id: '103',
    title: '黑色无线耳机盒',
    description: '耳机盒表面有一处轻微划痕，可能落在操场看台附近。',
    type: 'lost',
    category: '数码设备',
    location: '东操场',
    time: '1 小时前',
    contact: '陈同学 186****3188',
    image: createImage('耳', '#6366f1', '#38bdf8'),
  },
  {
    id: '104',
    title: '拾到透明雨伞',
    description: '雨伞收纳套还在，放在教学楼 A 座大厅保安处。',
    type: 'found',
    category: '雨具',
    location: '教学楼 A 座',
    time: '2 小时前',
    contact: '赵同学 151****6620',
    image: createImage('伞', '#0ea5e9', '#22c55e'),
  },
  {
    id: '105',
    title: '白色帆布袋寻找',
    description: '袋内有教材和一本实验记录本，封面写有高数作业。',
    type: 'lost',
    category: '书包资料',
    location: '自习室 B204',
    time: '今天 09:20',
    contact: '周同学 139****2468',
    image: createImage('袋', '#f59e0b', '#fb7185'),
  },
  {
    id: '106',
    title: '捡到钥匙串',
    description: '钥匙串上有蓝色小挂件，已暂存在二号门门卫室。',
    type: 'found',
    category: '钥匙',
    location: '二号门',
    time: '昨天 18:42',
    contact: '刘同学 177****4801',
    image: createImage('钥', '#14b8a6', '#1677ff'),
  },
  {
    id: '107',
    title: '灰色运动外套遗失',
    description: '外套左袖有学院标识，可能遗落在篮球馆更衣区。',
    type: 'lost',
    category: '衣物',
    location: '篮球馆',
    time: '昨天 16:05',
    contact: '孙同学 135****7930',
    image: createImage('衣', '#64748b', '#38bdf8'),
  },
  {
    id: '108',
    title: '拾到计算器',
    description: '型号为科学计算器，显示屏贴膜未撕，已放至学院办公室。',
    type: 'found',
    category: '学习用品',
    location: '理科楼 501',
    time: '前天 12:12',
    contact: '吴同学 182****5219',
    image: createImage('算', '#8b5cf6', '#06b6d4'),
  },
];

const typeMeta: Record<PostType, { text: string; color: string }> = {
  lost: {
    text: '寻物',
    color: '#ff6b3d',
  },
  found: {
    text: '招领',
    color: '#16a34a',
  },
};

const wait = (duration = 520) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });

const queryPostList = async (params: QueryParams): Promise<QueryResult> => {
  await wait();

  if (params.keyword.trim().toLowerCase() === 'error') {
    throw new Error('信息流加载失败，请稍后重试');
  }

  const keyword = params.keyword.trim().toLowerCase();
  const filtered = posts.filter((post) => {
    const matchedTab = params.tab === 'all' || post.type === params.tab;
    const plainText = `${post.title}${post.category}${post.location}`.toLowerCase();
    const semanticText = `${plainText}${post.description}${post.contact}`.toLowerCase();
    const matchedKeyword =
      !keyword || (params.searchMode === 'ai' ? semanticText.includes(keyword) : plainText.includes(keyword));

    return matchedTab && matchedKeyword;
  });
  const start = (params.page - 1) * params.pageSize;
  const list = filtered.slice(start, start + params.pageSize);

  return {
    list,
    hasMore: start + params.pageSize < filtered.length,
  };
};

const homeStyles = `
.home-page {
  min-height: 100vh;
  overflow-x: hidden;
  background: #f5f8fd;
}

.home-header {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 6px 14px 14px;
  color: #fff;
  background: linear-gradient(135deg, #1677ff 0%, #2da7ff 58%, #35c6ff 100%);
  box-shadow: 0 12px 30px rgba(22, 119, 255, 0.24);
}

.home-navbar {
  --height: 46px;
  --border-bottom: 0;
  color: #fff;
  font-weight: 800;
}

.home-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 4px 0 12px;
}

.home-stat {
  padding: 10px 8px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(10px);
}

.home-stat strong {
  display: block;
  font-size: 17px;
  line-height: 1.1;
}

.home-stat span {
  display: block;
  margin-top: 4px;
  color: rgba(255, 255, 255, 0.82);
  font-size: 11px;
}

.home-tabs {
  padding: 4px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.18);
}

.home-tabs .adm-tabs-header {
  border-bottom: 0;
}

.home-tabs .adm-tabs-tab-wrapper {
  padding: 0 3px;
}

.home-tabs .adm-tabs-tab {
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.78);
  font-size: 13px;
  transition: all 180ms ease;
}

.home-tabs .adm-tabs-tab-active {
  color: #1677ff;
  background: #fff;
  font-weight: 800;
  box-shadow: 0 8px 18px rgba(15, 70, 145, 0.16);
}

.home-tabs .adm-tabs-tab-line {
  display: none;
}

.home-content {
  max-width: 640px;
  margin: 0 auto;
  padding: 14px 14px calc(88px + env(safe-area-inset-bottom));
}

.home-search-card {
  margin-bottom: 14px;
  padding: 12px;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 10px 26px rgba(16, 24, 40, 0.07);
}

.home-search-card .adm-selector {
  --border-radius: 999px;
}

.home-search-card .adm-selector-item {
  flex: 1;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  background: #f2f6fb;
  color: #667085;
  font-size: 12px;
  font-weight: 700;
}

.home-search-card .adm-selector-item-active {
  color: #1677ff;
  background: #e8f2ff;
  box-shadow: inset 0 0 0 1px rgba(22, 119, 255, 0.16);
}

.home-search {
  margin-top: 10px;
  --height: 42px;
  --border-radius: 14px;
  --background: #f7faff;
  --placeholder-color: #98a2b3;
}

.home-list {
  display: grid;
  gap: 12px;
}

.post-card {
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 10px 26px rgba(16, 24, 40, 0.07);
  overflow: hidden;
  transition: transform 140ms ease, box-shadow 140ms ease;
}

.post-card:active {
  transform: scale(0.985);
  box-shadow: 0 7px 18px rgba(16, 24, 40, 0.1);
}

.post-card .adm-card-body {
  padding: 12px;
}

.post-row {
  display: grid;
  grid-template-columns: 94px minmax(0, 1fr);
  gap: 12px;
}

.post-thumb {
  width: 94px;
  height: 94px;
  overflow: hidden;
  border-radius: 16px;
  background: #eef4ff;
}

.post-main {
  min-width: 0;
}

.post-title-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.post-title {
  flex: 1;
  min-width: 0;
  margin: 0;
  color: #182230;
  font-size: 16px;
  line-height: 1.35;
  font-weight: 800;
}

.post-desc {
  display: -webkit-box;
  margin: 7px 0 9px;
  overflow: hidden;
  color: #667085;
  font-size: 12px;
  line-height: 1.5;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.post-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  color: #98a2b3;
  font-size: 11px;
}

.post-tag {
  flex: none;
  --border-radius: 999px;
  font-weight: 800;
}

.home-skeleton {
  padding: 12px;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 10px 26px rgba(16, 24, 40, 0.06);
}

.home-empty {
  margin-top: 34px;
  padding: 28px 12px;
  border-radius: 20px;
  background: #fff;
}

.home-publish {
  position: fixed;
  right: 18px;
  bottom: calc(22px + env(safe-area-inset-bottom));
  z-index: 20;
  height: 46px;
  padding: 0 18px;
  border: 0;
  border-radius: 999px;
  font-weight: 800;
  background: linear-gradient(135deg, #1677ff 0%, #35a2ff 100%);
  box-shadow: 0 16px 30px rgba(22, 119, 255, 0.3);
  transition: transform 140ms ease;
}

.home-publish:active {
  transform: scale(0.96);
}
`;

const renderSkeleton = () => (
  <div className="home-list">
    {Array.from({ length: 4 }).map((_, index) => (
      <div className="home-skeleton" key={index}>
        <Space block align="start">
          <Skeleton animated style={{ '--width': '94px', '--height': '94px', '--border-radius': '16px' }} />
          <div style={{ flex: 1 }}>
            <Skeleton.Title animated />
            <Skeleton.Paragraph animated lineCount={3} />
          </div>
        </Space>
      </div>
    ))}
  </div>
);

export default function Home() {
  const [activeTab, setActiveTab] = useState<HomeTab>('all');
  const [searchMode, setSearchMode] = useState<SearchMode>('normal');
  const [searchText, setSearchText] = useState('');
  const [keyword, setKeyword] = useState('');
  const [list, setList] = useState<PostItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const navigate = useNavigate();

  const stats = useMemo(
    () => ({
      all: posts.length,
      lost: posts.filter((post) => post.type === 'lost').length,
      found: posts.filter((post) => post.type === 'found').length,
    }),
    [],
  );

  const loadPosts = useCallback(
    async (targetPage: number, append: boolean) => {
      if (!append) {
        setInitialLoading(true);
      }

      try {
        const result = await queryPostList({
          page: targetPage,
          pageSize: PAGE_SIZE,
          tab: activeTab,
          keyword,
          searchMode,
        });

        setList((current) => (append ? [...current, ...result.list] : result.list));
        setPage(targetPage);
        setHasMore(result.hasMore);
      } catch (error) {
        setHasMore(false);
        setList((current) => (append ? current : []));
        await Dialog.alert({
          title: '加载失败',
          content: error instanceof Error ? error.message : '请求失败，请稍后重试',
          confirmText: '知道了',
        });
      } finally {
        setInitialLoading(false);
      }
    },
    [activeTab, keyword, searchMode],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPosts(1, false);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadPosts]);

  const handleSearch = (value: string) => {
    setKeyword(value.trim());
    Toast.show({
      content: value.trim() ? '正在搜索相关帖子' : '已清空搜索条件',
    });
  };

  const handleRefresh = async () => {
    await loadPosts(1, false);
    Toast.show({
      icon: 'success',
      content: '已刷新',
    });
  };

  return (
    <main className="home-page">
      <style>{homeStyles}</style>
      <header className="home-header">
        <NavBar className="home-navbar" backArrow={false}>
          校园失物招领
        </NavBar>

        <div className="home-stats">
          <div className="home-stat">
            <strong>{stats.all}</strong>
            <span>全部线索</span>
          </div>
          <div className="home-stat">
            <strong>{stats.lost}</strong>
            <span>正在寻找</span>
          </div>
          <div className="home-stat">
            <strong>{stats.found}</strong>
            <span>等待认领</span>
          </div>
        </div>

        <Tabs className="home-tabs" activeKey={activeTab} onChange={(key) => setActiveTab(key as HomeTab)}>
          <Tabs.Tab title="全部" key="all" />
          <Tabs.Tab title="寻物" key="lost" />
          <Tabs.Tab title="招领" key="found" />
        </Tabs>
      </header>

      <section className="home-content">
        <div className="home-search-card">
          <Selector<SearchMode>
            columns={2}
            value={[searchMode]}
            options={[
              { label: '普通搜索', value: 'normal' },
              { label: 'AI 语义搜索', value: 'ai' },
            ]}
            onChange={(value) => setSearchMode(value[0] || 'normal')}
          />
          <SearchBar
            className="home-search"
            value={searchText}
            placeholder={searchMode === 'ai' ? '描述物品特征，例如：蓝色水杯' : '搜索物品、地点、分类'}
            showCancelButton
            cancelText="搜索"
            onChange={setSearchText}
            onSearch={handleSearch}
            onCancel={() => handleSearch(searchText)}
            onClear={() => {
              setSearchText('');
              setKeyword('');
            }}
          />
        </div>

        <PullToRefresh
          onRefresh={handleRefresh}
          renderText={(status) => {
            if (status === 'refreshing') {
              return (
                <Space align="center">
                  <SpinLoading color="primary" />
                  正在刷新
                </Space>
              );
            }
            return status === 'canRelease' ? '松开立即刷新' : '下拉刷新信息流';
          }}
        >
          {initialLoading ? (
            renderSkeleton()
          ) : list.length === 0 ? (
            <div className="home-empty">
              <Empty description="暂无匹配帖子，换个关键词试试" />
            </div>
          ) : (
            <div className="home-list">
              {list.map((post) => (
                <Card className="post-card" key={post.id} onClick={() => navigate(`/detail/${post.id}`)}>
                  <div className="post-row">
                    <Image className="post-thumb" src={post.image} fit="cover" />
                    <div className="post-main">
                      <div className="post-title-row">
                        <h2 className="post-title">{post.title}</h2>
                        <Tag className="post-tag" color={typeMeta[post.type].color} fill="solid">
                          {typeMeta[post.type].text}
                        </Tag>
                      </div>
                      <p className="post-desc">{post.description}</p>
                      <div className="post-meta">
                        <span>{post.category}</span>
                        <span>{post.location}</span>
                        <span>{post.time}</span>
                      </div>
                    </div>
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
                  return more ? '正在加载更多' : '没有更多帖子了';
                }}
              </InfiniteScroll>
            </div>
          )}
        </PullToRefresh>
      </section>

      <Button className="home-publish" color="primary" onClick={() => navigate('/publish')}>
        发布帖子
      </Button>
    </main>
  );
}
