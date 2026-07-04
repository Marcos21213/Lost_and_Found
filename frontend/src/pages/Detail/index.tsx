import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Avatar,
  Button,
  Card,
  Dialog,
  Divider,
  Image,
  NavBar,
  Skeleton,
  Space,
  Swiper,
  Tag,
  TextArea,
  Toast,
} from 'antd-mobile';
import request from '@/utils/request';
import { getUserInfo } from '@/utils/storage';

type PostType = 'lost' | 'found';

type DetailPost = {
  id: string;
  title: string;
  type: PostType;
  category: string;
  status: string;
  location: string;
  time: string;
  contact: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string[];
  images: string[];
  collected: boolean;
};

type CommentItem = {
  id: string;
  userId: string;
  nickname: string;
  avatar: string;
  content: string;
  time: string;
};

type CurrentUser = {
  id?: string;
  phone?: string;
  nickname?: string;
};

const DEMO_MODE = true;

const wait = (duration = 520) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });

const createImage = (label: string, start: string, end: string) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="720" height="520" viewBox="0 0 720 520">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="${start}" offset="0"/>
          <stop stop-color="${end}" offset="1"/>
        </linearGradient>
      </defs>
      <rect width="720" height="520" rx="46" fill="url(#g)"/>
      <circle cx="604" cy="88" r="96" fill="rgba(255,255,255,.16)"/>
      <circle cx="126" cy="426" r="124" fill="rgba(255,255,255,.14)"/>
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="132" font-family="Arial" font-weight="800">${label}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const createAvatar = (name: string, color = '#1677ff') => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
      <rect width="120" height="120" rx="36" fill="${color}"/>
      <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="46" font-family="Arial" font-weight="800">${name.slice(0, 1)}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const getCurrentUser = (): Required<Pick<CurrentUser, 'id' | 'nickname'>> => {
  const user = getUserInfo<CurrentUser>();
  const id = String(user?.id || user?.phone || 'u1001');

  return {
    id,
    nickname: user?.nickname || '我',
  };
};

const createDemoPost = (id: string, currentUserId: string): DetailPost => ({
  id,
  title: '蓝色保温杯遗失',
  type: 'lost',
  category: '生活用品',
  status: '寻找中',
  location: '图书馆三楼靠窗自习区',
  time: '今天 10:20',
  contact: '13857216888',
  authorId: currentUserId,
  authorName: '李同学',
  authorAvatar: createAvatar('李', '#1677ff'),
  content: [
    '杯身是雾面蓝色，侧面贴有一枚浅色贴纸，杯盖上有轻微划痕。',
    '最后一次看到是在图书馆三楼靠窗位置，大约上午十点二十分离开后发现遗失。',
    '如果有同学看到或拾到，可以通过联系方式联系我，非常感谢。',
  ],
  images: [createImage('杯', '#1677ff', '#55c7ff'), createImage('找', '#22c55e', '#38bdf8')],
  collected: false,
});

const createDemoComments = (currentUserId: string): CommentItem[] => [
  {
    id: 'c101',
    userId: 'u2001',
    nickname: '王同学',
    avatar: createAvatar('王', '#22c55e'),
    content: '我中午路过三楼的时候好像看见过，靠近打印机那边可以再找一下。',
    time: '12 分钟前',
  },
  {
    id: 'c102',
    userId: currentUserId,
    nickname: '我',
    avatar: createAvatar('我', '#1677ff'),
    content: '谢谢，我已经去打印区看过了，还没有找到。',
    time: '刚刚',
  },
  {
    id: 'c103',
    userId: 'u2002',
    nickname: '赵同学',
    avatar: createAvatar('赵', '#8b5cf6'),
    content: '可以问一下前台老师，今天有几件物品被送过去。',
    time: '5 分钟前',
  },
];

const fetchDetail = async (postId: string, currentUserId: string) => {
  if (DEMO_MODE) {
    await wait();
    return {
      post: createDemoPost(postId, currentUserId),
      comments: createDemoComments(currentUserId),
    };
  }

  return (await request.get(`/posts/${postId}`)) as unknown as {
    post: DetailPost;
    comments: CommentItem[];
  };
};

const detailStyles = `
.detail-page {
  min-height: 100vh;
  overflow-x: hidden;
  background: #f5f8fd;
  animation: detailEnter 360ms ease both;
}

.detail-header {
  position: sticky;
  top: 0;
  z-index: 20;
  padding: 6px 12px 12px;
  color: #fff;
  background: linear-gradient(135deg, #1677ff 0%, #2fa7ff 58%, #35c6ff 100%);
  box-shadow: 0 12px 28px rgba(22, 119, 255, 0.22);
}

.detail-nav {
  --height: 44px;
  --border-bottom: 0;
  color: #fff;
  font-weight: 800;
}

.detail-content {
  max-width: 640px;
  margin: 0 auto;
  padding: 14px 14px calc(92px + env(safe-area-inset-bottom));
}

.detail-swiper-card {
  overflow: hidden;
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 12px 30px rgba(16, 24, 40, 0.08);
}

.detail-swiper {
  --height: 240px;
  --border-radius: 22px;
}

.detail-image {
  width: 100%;
  height: 240px;
  object-fit: cover;
}

.detail-indicator {
  position: absolute;
  right: 14px;
  bottom: 12px;
  display: inline-flex;
  gap: 5px;
  padding: 5px 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.32);
  backdrop-filter: blur(8px);
}

.detail-indicator-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.58);
  transition: all 180ms ease;
}

.detail-indicator-dot-active {
  width: 16px;
  background: #fff;
}

.detail-card {
  margin-top: 14px;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 10px 26px rgba(16, 24, 40, 0.07);
}

.detail-card .adm-card-body {
  padding: 16px;
}

.detail-title-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.detail-title {
  flex: 1;
  min-width: 0;
  margin: 0;
  color: #182230;
  font-size: 22px;
  line-height: 1.28;
  font-weight: 900;
}

.detail-type {
  flex: none;
  --border-radius: 999px;
  font-weight: 800;
}

.detail-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.detail-meta {
  padding: 10px;
  border-radius: 14px;
  background: #f7faff;
}

.detail-meta span {
  display: block;
  color: #98a2b3;
  font-size: 11px;
}

.detail-meta strong {
  display: block;
  margin-top: 3px;
  color: #344054;
  font-size: 13px;
  line-height: 1.35;
}

.detail-section-title {
  margin: 0 0 10px;
  color: #182230;
  font-size: 16px;
  line-height: 1.3;
  font-weight: 900;
}

.detail-paragraph {
  margin: 0 0 10px;
  color: #475467;
  font-size: 14px;
  line-height: 1.78;
}

.detail-contact {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-radius: 16px;
  background: linear-gradient(135deg, #edf6ff 0%, #f7fbff 100%);
  border: 1px solid #dbeafe;
}

.detail-contact-text span {
  display: block;
  color: #667085;
  font-size: 12px;
}

.detail-contact-text strong {
  display: block;
  margin-top: 3px;
  color: #1677ff;
  font-size: 17px;
  letter-spacing: 0;
}

.detail-copy-button {
  border-radius: 999px;
  font-weight: 800;
}

.detail-author {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #eef2f7;
}

.detail-author-name {
  margin: 0;
  color: #344054;
  font-size: 14px;
  font-weight: 800;
}

.detail-author-time {
  margin: 2px 0 0;
  color: #98a2b3;
  font-size: 12px;
}

.detail-actions {
  margin-top: 14px;
}

.detail-action-button {
  flex: 1;
  height: 40px;
  border-radius: 14px;
  font-weight: 800;
}

.detail-risk-button {
  color: #ef4444;
  border-color: #fecaca;
  background: #fff5f5;
}

.detail-favorite {
  min-width: 94px;
  height: 38px;
  border-radius: 999px;
  color: #667085;
  background: #f2f6fb;
  border: 0;
  font-weight: 800;
  transition: transform 160ms ease, color 160ms ease, background 160ms ease;
}

.detail-favorite-active {
  color: #fff;
  background: linear-gradient(135deg, #ff7a45 0%, #ff4d4f 100%);
  box-shadow: 0 10px 18px rgba(255, 77, 79, 0.24);
}

.detail-favorite:active {
  transform: scale(0.94);
}

.detail-comments {
  display: grid;
  gap: 12px;
}

.detail-comment {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  gap: 10px;
}

.detail-comment-bubble {
  padding: 11px 12px;
  border-radius: 4px 16px 16px;
  background: #f6f8fb;
}

.detail-comment-mine .detail-comment-bubble {
  background: #e8f2ff;
  border: 1px solid rgba(22, 119, 255, 0.12);
}

.detail-comment-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.detail-comment-name {
  color: #344054;
  font-size: 13px;
  font-weight: 800;
}

.detail-comment-time {
  color: #98a2b3;
  font-size: 11px;
}

.detail-comment-text {
  margin: 6px 0 0;
  color: #475467;
  font-size: 13px;
  line-height: 1.6;
}

.detail-delete-comment {
  margin-top: 6px;
  padding: 0;
  color: #ef4444;
  font-size: 12px;
}

.detail-composer {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 30;
  padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 -10px 26px rgba(16, 24, 40, 0.08);
  backdrop-filter: blur(14px);
}

.detail-composer-inner {
  max-width: 640px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 74px;
  gap: 10px;
  margin: 0 auto;
}

.detail-input {
  padding: 8px 12px;
  border-radius: 16px;
  background: #f5f8fc;
  border: 1px solid #e7eef8;
}

.detail-input:focus-within {
  border-color: rgba(22, 119, 255, 0.5);
  box-shadow: 0 0 0 4px rgba(22, 119, 255, 0.08);
  background: #fff;
}

.detail-send {
  height: 44px;
  align-self: end;
  border: 0;
  border-radius: 15px;
  font-weight: 800;
  background: linear-gradient(135deg, #1677ff 0%, #35a2ff 100%);
  box-shadow: 0 10px 20px rgba(22, 119, 255, 0.22);
}

.detail-loading-card {
  padding: 16px;
  border-radius: 20px;
  background: #fff;
}

@keyframes detailEnter {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
`;

export default function Detail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useMemo(() => getCurrentUser(), []);
  const [post, setPost] = useState<DetailPost | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const actionLockedRef = useRef(false);
  const commentIdRef = useRef(1000);

  const isOwner = Boolean(post && post.authorId === currentUser.id);

  useEffect(() => {
    let mounted = true;

    const loadDetail = async () => {
      setLoading(true);

      try {
        const result = await fetchDetail(id || '101', currentUser.id);

        if (!mounted) {
          return;
        }

        setPost(result.post);
        setComments(result.comments);
      } catch (error) {
        await Dialog.alert({
          title: '加载失败',
          content: error instanceof Error ? error.message : '帖子详情加载失败，请稍后重试',
          confirmText: '知道了',
        });
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadDetail();

    return () => {
      mounted = false;
    };
  }, [currentUser.id, id]);

  const handleCopy = async () => {
    if (!post) {
      return;
    }

    try {
      await navigator.clipboard.writeText(post.contact);
      Toast.show({
        icon: 'success',
        content: '联系方式已复制',
      });
    } catch {
      Toast.show({
        content: `联系方式：${post.contact}`,
      });
    }
  };

  const handleFavorite = async () => {
    if (!post || favoriteLoading) {
      return;
    }

    setFavoriteLoading(true);

    try {
      if (!DEMO_MODE) {
        await request.post(`/posts/${post.id}/favorite`);
      } else {
        await wait(260);
      }

      setPost({
        ...post,
        collected: !post.collected,
      });
      Toast.show({
        icon: 'success',
        content: post.collected ? '已取消收藏' : '已收藏',
      });
    } catch (error) {
      Toast.show({
        icon: 'fail',
        content: error instanceof Error ? error.message : '收藏状态更新失败',
      });
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleSend = async () => {
    const content = message.trim();

    if (!content) {
      Toast.show({
        icon: 'fail',
        content: '请输入留言内容',
      });
      return;
    }

    if (actionLockedRef.current) {
      Toast.show({
        content: '操作太快了，请稍后再试',
      });
      return;
    }

    actionLockedRef.current = true;
    window.setTimeout(() => {
      actionLockedRef.current = false;
    }, 900);
    setSending(true);

    try {
      if (!DEMO_MODE && post) {
        await request.post(`/posts/${post.id}/comments`, { content });
      } else {
        await wait(360);
      }

      setComments((current) => [
        ...current,
        {
          id: `c-${commentIdRef.current++}`,
          userId: currentUser.id,
          nickname: currentUser.nickname,
          avatar: createAvatar(currentUser.nickname, '#1677ff'),
          content,
          time: '刚刚',
        },
      ]);
      setMessage('');
      Toast.show({
        icon: 'success',
        content: '留言已发布',
      });
    } catch (error) {
      Toast.show({
        icon: 'fail',
        content: error instanceof Error ? error.message : '留言发布失败',
      });
    } finally {
      setSending(false);
    }
  };

  const handleDeleteComment = async (comment: CommentItem) => {
    const confirmed = await Dialog.confirm({
      title: '删除留言',
      content: '确认删除这条留言吗？',
      confirmText: '删除',
      cancelText: '取消',
    });

    if (!confirmed) {
      return;
    }

    try {
      if (!DEMO_MODE && post) {
        await request.delete(`/posts/${post.id}/comments/${comment.id}`);
      } else {
        await wait(240);
      }

      setComments((current) => current.filter((item) => item.id !== comment.id));
      Toast.show({
        icon: 'success',
        content: '留言已删除',
      });
    } catch (error) {
      Toast.show({
        icon: 'fail',
        content: error instanceof Error ? error.message : '删除失败，请稍后重试',
      });
    }
  };

  const handleOffline = async () => {
    if (!post) {
      return;
    }

    const confirmed = await Dialog.confirm({
      title: '下架帖子',
      content: '下架后其他同学将无法继续看到该帖子，确认继续吗？',
      confirmText: '确认下架',
      cancelText: '取消',
    });

    if (!confirmed) {
      return;
    }

    try {
      if (!DEMO_MODE) {
        await request.patch(`/posts/${post.id}/status`, { status: 'offline' });
      } else {
        await wait(380);
      }

      setPost({
        ...post,
        status: '已下架',
      });
      Toast.show({
        icon: 'success',
        content: '帖子已下架',
      });
    } catch (error) {
      Toast.show({
        icon: 'fail',
        content: error instanceof Error ? error.message : '下架失败，请稍后重试',
      });
    }
  };

  return (
    <main className="detail-page">
      <style>{detailStyles}</style>
      <header className="detail-header">
        <NavBar className="detail-nav" onBack={() => navigate(-1)}>
          帖子详情
        </NavBar>
      </header>

      <section className="detail-content">
        {loading || !post ? (
          <div className="detail-loading-card">
            <Skeleton animated style={{ '--height': '220px', '--border-radius': '20px' }} />
            <Skeleton.Title animated />
            <Skeleton.Paragraph animated lineCount={6} />
          </div>
        ) : (
          <>
            <div className="detail-swiper-card">
              <Swiper
                className="detail-swiper"
                autoplay
                loop
                indicator={(total, current) => (
                  <div className="detail-indicator">
                    {Array.from({ length: total }).map((_, index) => (
                      <span
                        className={`detail-indicator-dot ${
                          current === index ? 'detail-indicator-dot-active' : ''
                        }`}
                        key={index}
                      />
                    ))}
                  </div>
                )}
              >
                {post.images.map((image) => (
                  <Swiper.Item key={image}>
                    <Image className="detail-image" src={image} fit="cover" />
                  </Swiper.Item>
                ))}
              </Swiper>
            </div>

            <Card className="detail-card">
              <div className="detail-title-row">
                <h1 className="detail-title">{post.title}</h1>
                <Tag
                  className="detail-type"
                  fill="solid"
                  color={post.type === 'lost' ? '#ff6b3d' : '#16a34a'}
                >
                  {post.type === 'lost' ? '寻物' : '招领'}
                </Tag>
              </div>

              <div className="detail-meta-grid">
                <div className="detail-meta">
                  <span>分类</span>
                  <strong>{post.category}</strong>
                </div>
                <div className="detail-meta">
                  <span>状态</span>
                  <strong>{post.status}</strong>
                </div>
                <div className="detail-meta">
                  <span>地点</span>
                  <strong>{post.location}</strong>
                </div>
                <div className="detail-meta">
                  <span>时间</span>
                  <strong>{post.time}</strong>
                </div>
              </div>

              <div className="detail-author">
                <Avatar src={post.authorAvatar} style={{ '--size': '42px', '--border-radius': '14px' }} />
                <div>
                  <p className="detail-author-name">{post.authorName}</p>
                  <p className="detail-author-time">发布于 {post.time}</p>
                </div>
              </div>

              <Space className="detail-actions" block>
                <Button
                  className={`detail-favorite ${post.collected ? 'detail-favorite-active' : ''}`}
                  loading={favoriteLoading}
                  onClick={handleFavorite}
                >
                  <span>{post.collected ? '★' : '☆'}</span>
                  <span>{post.collected ? '已收藏' : '收藏'}</span>
                </Button>
                {isOwner && (
                  <>
                    <Button
                      className="detail-action-button"
                      fill="outline"
                      onClick={() => {
                        Toast.show('编辑功能待接入');
                      }}
                    >
                      编辑
                    </Button>
                    <Button className="detail-action-button detail-risk-button" fill="outline" onClick={handleOffline}>
                      下架
                    </Button>
                  </>
                )}
              </Space>
            </Card>

            <Card className="detail-card">
              <h2 className="detail-section-title">详细描述</h2>
              {post.content.map((paragraph) => (
                <p className="detail-paragraph" key={paragraph}>
                  {paragraph}
                </p>
              ))}
              <Divider />
              <div className="detail-contact">
                <div className="detail-contact-text">
                  <span>联系方式</span>
                  <strong>{post.contact}</strong>
                </div>
                <Button className="detail-copy-button" color="primary" fill="outline" onClick={handleCopy}>
                  复制
                </Button>
              </div>
            </Card>

            <Card className="detail-card">
              <h2 className="detail-section-title">留言区</h2>
              <div className="detail-comments">
                {comments.map((comment) => {
                  const isMine = comment.userId === currentUser.id;

                  return (
                    <div className={`detail-comment ${isMine ? 'detail-comment-mine' : ''}`} key={comment.id}>
                      <Avatar src={comment.avatar} style={{ '--size': '38px', '--border-radius': '13px' }} />
                      <div className="detail-comment-bubble">
                        <div className="detail-comment-head">
                          <span className="detail-comment-name">{comment.nickname}</span>
                          <span className="detail-comment-time">{comment.time}</span>
                        </div>
                        <p className="detail-comment-text">{comment.content}</p>
                        {isMine && (
                          <Button
                            className="detail-delete-comment"
                            fill="none"
                            onClick={() => handleDeleteComment(comment)}
                          >
                            删除
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </>
        )}
      </section>

      <div className="detail-composer">
        <div className="detail-composer-inner">
          <div className="detail-input">
            <TextArea
              value={message}
              onChange={setMessage}
              rows={1}
              maxLength={120}
              placeholder="写下你的线索或补充信息"
            />
          </div>
          <Button className="detail-send" color="primary" loading={sending} onClick={handleSend}>
            发布
          </Button>
        </div>
      </div>
    </main>
  );
}
