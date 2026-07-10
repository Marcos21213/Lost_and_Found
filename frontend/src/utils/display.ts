import { resolveAssetUrl } from '@/api';
import type { PostStatus, RawPost, RawUser } from '@/api';
import type { UserInfo } from '@/utils/storage';

export const formatRelativeTime = (value?: string) => {
  if (!value) {
    return '未知时间';
  }

  const timestamp = new Date(value.replace(' ', 'T')).getTime();
  if (Number.isNaN(timestamp)) {
    return value;
  }

  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSeconds < 60) {
    return '刚刚';
  }
  if (diffSeconds < 3600) {
    return `${Math.floor(diffSeconds / 60)} 分钟前`;
  }
  if (diffSeconds < 86400) {
    return `${Math.floor(diffSeconds / 3600)} 小时前`;
  }
  if (diffSeconds < 172800) {
    return '昨天';
  }

  return value.slice(0, 16);
};

export const statusMeta = (status: PostStatus) => {
  const meta: Record<string, { text: string; color: string }> = {
    pending: { text: '待审核', color: '#1677ff' },
    open: { text: '展示中', color: '#22c55e' },
    offline: { text: '已下架', color: '#ef4444' },
    matched: { text: '已匹配', color: '#8b5cf6' },
    closed: { text: '已关闭', color: '#667085' },
  };

  return meta[status] || { text: String(status || '未知'), color: '#667085' };
};

export const createPlaceholderImage = (label: string, start = '#1677ff', end = '#35c6ff') => {
  const safeLabel = (label.trim() || '物').slice(0, 1);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="360" height="270" viewBox="0 0 360 270">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="${start}" offset="0"/>
          <stop stop-color="${end}" offset="1"/>
        </linearGradient>
      </defs>
      <rect width="360" height="270" rx="28" fill="url(#g)"/>
      <circle cx="298" cy="52" r="52" fill="rgba(255,255,255,.16)"/>
      <circle cx="72" cy="218" r="68" fill="rgba(255,255,255,.14)"/>
      <text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="88" font-family="Arial" font-weight="800">${safeLabel}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export const getPostImage = (post: RawPost) =>
  resolveAssetUrl(post.img_list?.[0]) || createPlaceholderImage(post.goods_name || post.category);

export const createAvatar = (name: string, color = '#1677ff') => {
  const safeName = (name.trim() || '我').slice(0, 1);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
      <rect width="160" height="160" rx="80" fill="${color}"/>
      <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="64" font-family="Arial" font-weight="800">${safeName}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export const getAvatarUrl = (name: string, avatar?: string | null) => resolveAssetUrl(avatar) || createAvatar(name);

export const normalizeUserInfo = (rawUser: RawUser | undefined, fallbackAccount = ''): UserInfo => {
  const username = String(rawUser?.username || fallbackAccount || '');
  const isAdmin = Boolean(rawUser?.is_admin);

  return {
    ...rawUser,
    id: rawUser?.id || username,
    account: username,
    username,
    nickname: username,
    role: isAdmin ? 'admin' : 'user',
    is_admin: isAdmin,
  };
};
