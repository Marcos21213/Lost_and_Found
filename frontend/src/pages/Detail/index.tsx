import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Avatar,
  Button,
  Card,
  Dialog,
  Divider,
  Empty,
  Image,
  NavBar,
  Skeleton,
  Space,
  Swiper,
  Tag,
  TextArea,
  Toast,
} from 'antd-mobile';
import {
  cancelCollectPost,
  collectPost,
  createComment,
  deleteComment,
  fetchPostComments,
  fetchPostDetail,
  offlinePost,
  resolveAssetUrl,
} from '@/api';
import type { PostStatus, PostType, RawComment, RawPost } from '@/api';
import { createPlaceholderImage, formatRelativeTime, getAvatarUrl, statusMeta } from '@/utils/display';
import { getUserInfo } from '@/utils/storage';

type DetailPost = {
  id: string;
  title: string;
  type: PostType;
  category: string;
  rawStatus: PostStatus;
  status: string;
  statusColor: string;
  location: string;
  happenTime: string;
  createTime: string;
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
  id?: string | number;
  username?: string;
  nickname?: string;
};

const getCurrentUser = (): Required<Pick<CurrentUser, 'id' | 'nickname'>> => {
  const user = getUserInfo<CurrentUser>();
  const id = String(user?.id || '');
  const nickname = String(user?.nickname || user?.username || '我');

  return { id, nickname };
};

const mapDetailPost = (post: RawPost): DetailPost => {
  const authorName = post.author?.username || '校园用户';
  const meta = statusMeta(post.status);
  const images = post.img_list?.map(resolveAssetUrl).filter(Boolean);

  return {
    id: String(post.id),
    title: post.goods_name,
    type: post.post_type,
    category: post.category,
    rawStatus: post.status,
    status: meta.text,
    statusColor: meta.color,
    location: post.location,
    happenTime: post.happen_time,
    createTime: formatRelativeTime(post.create_time),
    contact: post.contact,
    authorId: String(post.user_id),
    authorName,
    authorAvatar: getAvatarUrl(authorName, post.author?.avatar),
    content: post.description
      .split(/\n+/)
      .map((item) => item.trim())
      .filter(Boolean),
    images: images.length > 0 ? images : [createPlaceholderImage(post.goods_name || post.category)],
    collected: Boolean(post.collected),
  };
};

const mapComment = (comment: RawComment): CommentItem => {
  const nickname = comment.user?.username || '校园用户';

  return {
    id: String(comment.id),
    userId: String(comment.user_id),
    nickname,
    avatar: getAvatarUrl(nickname, comment.user?.avatar),
    content: comment.content,
    time: formatRelativeTime(comment.create_time),
  };
};

const detailStyles = `
.detail-page {
  min-height: 100vh;
  overflow-x: hidden;
  background: #f5f8fd;
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
}

.detail-favorite-active {
  color: #fff;
  background: linear-gradient(135deg, #ff7a45 0%, #ff4d4f 100%);
  box-shadow: 0 10px 18px rgba(255, 77, 79, 0.24);
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
`;

export default function Detail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useState(() => getCurrentUser())[0];
  const [post, setPost] = useState<DetailPost | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const actionLockedRef = useRef(false);

  const isOwner = Boolean(post && post.authorId === currentUser.id);
  const canComment = post?.rawStatus === 'open';

  useEffect(() => {
    let mounted = true;

    const loadDetail = async () => {
      if (!id) {
        return;
      }

      setLoading(true);

      try {
        const [postResult, commentResult] = await Promise.all([fetchPostDetail(id), fetchPostComments(id)]);

        if (!mounted) {
          return;
        }

        setPost(mapDetailPost(postResult));
        setComments(commentResult.items.map(mapComment));
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
  }, [id]);

  const handleCopy = async () => {
    if (!post) {
      return;
    }

    try {
      await navigator.clipboard.writeText(post.contact);
      Toast.show({ icon: 'success', content: '联系方式已复制' });
    } catch {
      Toast.show({ content: `联系方式：${post.contact}` });
    }
  };

  const handleFavorite = async () => {
    if (!post || favoriteLoading) {
      return;
    }

    setFavoriteLoading(true);

    try {
      if (post.collected) {
        await cancelCollectPost(post.id);
      } else {
        await collectPost(post.id);
      }

      setPost({ ...post, collected: !post.collected });
      Toast.show({ icon: 'success', content: post.collected ? '已取消收藏' : '已收藏' });
    } catch (error) {
      Toast.show({ icon: 'fail', content: error instanceof Error ? error.message : '收藏状态更新失败' });
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleSend = async () => {
    const content = message.trim();

    if (!content) {
      Toast.show({ icon: 'fail', content: '请输入留言内容' });
      return;
    }

    if (!post || !canComment) {
      Toast.show({ content: '当前帖子不可留言' });
      return;
    }

    if (actionLockedRef.current) {
      Toast.show({ content: '操作太快了，请稍后再试' });
      return;
    }

    actionLockedRef.current = true;
    window.setTimeout(() => {
      actionLockedRef.current = false;
    }, 900);
    setSending(true);

    try {
      const result = await createComment(post.id, content);

      setComments((current) => [...current, mapComment(result)]);
      setMessage('');
      Toast.show({ icon: 'success', content: '留言已发布' });
    } catch (error) {
      Toast.show({ icon: 'fail', content: error instanceof Error ? error.message : '留言发布失败' });
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
      await deleteComment(comment.id);
      setComments((current) => current.filter((item) => item.id !== comment.id));
      Toast.show({ icon: 'success', content: '留言已删除' });
    } catch (error) {
      Toast.show({ icon: 'fail', content: error instanceof Error ? error.message : '删除失败，请稍后重试' });
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
      const updated = await offlinePost(post.id);
      setPost(mapDetailPost({ ...updated, collected: post.collected, author: { id: post.authorId, username: post.authorName } }));
      Toast.show({ icon: 'success', content: '帖子已下架' });
    } catch (error) {
      Toast.show({ icon: 'fail', content: error instanceof Error ? error.message : '下架失败，请稍后重试' });
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
                autoplay={post.images.length > 1}
                loop={post.images.length > 1}
                indicator={(total, current) => (
                  <div className="detail-indicator">
                    {Array.from({ length: total }).map((_, index) => (
                      <span
                        className={`detail-indicator-dot ${current === index ? 'detail-indicator-dot-active' : ''}`}
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
                <Tag className="detail-type" fill="solid" color={post.type === 'lost' ? '#ff6b3d' : '#16a34a'}>
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
                  <strong style={{ color: post.statusColor }}>{post.status}</strong>
                </div>
                <div className="detail-meta">
                  <span>地点</span>
                  <strong>{post.location}</strong>
                </div>
                <div className="detail-meta">
                  <span>发生时间</span>
                  <strong>{post.happenTime}</strong>
                </div>
              </div>

              <div className="detail-author">
                <Avatar src={post.authorAvatar} style={{ '--size': '42px', '--border-radius': '14px' }} />
                <div>
                  <p className="detail-author-name">{post.authorName}</p>
                  <p className="detail-author-time">发布于 {post.createTime}</p>
                </div>
              </div>

              <Space className="detail-actions" block>
                <Button
                  className={`detail-favorite ${post.collected ? 'detail-favorite-active' : ''}`}
                  loading={favoriteLoading}
                  disabled={post.rawStatus !== 'open'}
                  onClick={handleFavorite}
                >
                  <span>{post.collected ? '★' : '☆'}</span>
                  <span>{post.collected ? '已收藏' : '收藏'}</span>
                </Button>
                {isOwner && (
                  <Button className="detail-action-button detail-risk-button" fill="outline" onClick={handleOffline}>
                    下架
                  </Button>
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
              {comments.length === 0 ? (
                <Empty description="暂无留言" />
              ) : (
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
              )}
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
              disabled={!canComment}
              placeholder={canComment ? '写下你的线索或补充信息' : '当前帖子不可留言'}
            />
          </div>
          <Button className="detail-send" color="primary" loading={sending} disabled={!canComment} onClick={handleSend}>
            发布
          </Button>
        </div>
      </div>
    </main>
  );
}
