import { useCallback, useEffect, useState } from 'react';
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
import AppTabBar from '@/components/AppTabBar';
import { fetchPostList, fetchPostStatistics, semanticSearchPosts } from '@/api';
import type { RawPost } from '@/api';
import { formatRelativeTime, getPostImage } from '@/utils/display';
import { getUserRole } from '@/utils/storage';

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

const queryPostList = async (params: QueryParams): Promise<QueryResult> => {
  const keyword = params.keyword.trim();
  const result =
    params.searchMode === 'ai' && keyword
      ? await semanticSearchPosts({
          page: params.page,
          pageSize: Math.min(params.pageSize, 15),
          keyword,
        })
      : await fetchPostList({
          page: params.page,
          pageSize: params.pageSize,
          postType: params.tab === 'all' ? undefined : params.tab,
          keyword,
        });

  const rawItems =
    params.searchMode === 'ai' && params.tab !== 'all'
      ? result.items.filter((post) => post.post_type === params.tab)
      : result.items;

  return {
    list: rawItems.map(mapPostItem),
    hasMore: params.page * params.pageSize < result.total,
  };
};

const mapPostItem = (post: RawPost): PostItem => ({
  id: String(post.id),
  title: post.goods_name,
  description: post.description,
  type: post.post_type,
  category: post.category,
  location: post.location,
  time: formatRelativeTime(post.create_time),
  contact: post.contact,
  image: getPostImage(post),
});

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
  padding: 14px 14px calc(130px + env(safe-area-inset-bottom));
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
  bottom: calc(78px + env(safe-area-inset-bottom));
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
  const [stats, setStats] = useState({ all: 0, lost: 0, found: 0 });
  const navigate = useNavigate();
  const isAdmin = getUserRole() === 'admin';

  const loadStats = useCallback(async () => {
    try {
      const result = await fetchPostStatistics();
      setStats(result);
    } catch {
      setStats({ all: 0, lost: 0, found: 0 });
    }
  }, []);

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
      void loadStats();
      void loadPosts(1, false);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadPosts, loadStats]);

  const handleSearch = (value: string) => {
    setKeyword(value.trim());
    Toast.show({
      content: value.trim() ? '正在搜索相关帖子' : '已清空搜索条件',
    });
  };

  const handleRefresh = async () => {
    await Promise.all([loadStats(), loadPosts(1, false)]);
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

      {!isAdmin && (
        <Button className="home-publish" color="primary" onClick={() => navigate('/publish')}>
          发布帖子
        </Button>
      )}
      <AppTabBar activeKey="home" />
    </main>
  );
}
