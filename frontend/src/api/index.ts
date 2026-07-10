import request from '@/utils/request';

export type ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
};

export type PageResult<T> = {
  items: T[];
  page: number;
  page_size: number;
  total: number;
};

export type PostType = 'lost' | 'found';
export type PostStatus = 'pending' | 'open' | 'offline' | 'matched' | 'closed' | string;

export type RawUser = {
  id: number | string;
  username: string;
  phone?: string | null;
  college?: string | null;
  avatar?: string | null;
  is_admin?: boolean;
  is_disabled?: boolean;
  create_time?: string;
};

export type RawPost = {
  id: number | string;
  user_id: number | string;
  post_type: PostType;
  goods_name: string;
  category: string;
  location: string;
  happen_time: string;
  description: string;
  img_list: string[];
  contact: string;
  status: PostStatus;
  create_time: string;
  collected?: boolean;
  collect_time?: string;
  author?: Pick<RawUser, 'id' | 'username' | 'avatar'>;
};

export type RawComment = {
  id: number | string;
  post_id: number | string;
  user_id: number | string;
  content: string;
  create_time: string;
  user?: Pick<RawUser, 'id' | 'username' | 'avatar'>;
};

export type RawMyComment = RawComment & {
  post: RawPost | null;
};

export type PostStatistics = {
  all: number;
  lost: number;
  found: number;
};

export type AdminStatistics = {
  total_posts: number;
  pending_posts: number;
  open_posts: number;
  offline_posts: number;
  today_posts: number;
  total_users: number;
  matched_posts: number;
  category_stats: Array<{ category: string; count: number }>;
  post_type_stats: Array<{ post_type: PostType | string; count: number }>;
  status_stats: Array<{ status: PostStatus; count: number }>;
  monthly_stats: Array<{ month: string; label: string; count: number }>;
};

export type CreatePostPayload = {
  postType: PostType;
  goodsName: string;
  category: string;
  location: string;
  happenTime: string;
  description: string;
  contact: string;
  files: File[];
};

type AuthResponse = {
  token?: string;
  token_type?: string;
  user?: RawUser;
};

const unwrap = async <T>(promise: Promise<unknown>) => {
  const response = (await promise) as ApiResponse<T>;
  return response.data;
};

export const login = (account: string, password: string) =>
  unwrap<AuthResponse>(request.post('/user/login', { account, password }));

export const register = (payload: { account: string; password: string; nickname?: string }) =>
  unwrap<RawUser>(request.post('/user/register', payload));

export const fetchUserProfile = () => unwrap<RawUser>(request.get('/user/me'));

export const uploadAvatar = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return unwrap<{ avatar: string; user: RawUser }>(
    request.post('/user/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
  );
};

export const createPost = (payload: CreatePostPayload) => {
  const formData = new FormData();
  formData.append('post_type', payload.postType);
  formData.append('goods_name', payload.goodsName);
  formData.append('category', payload.category);
  formData.append('location', payload.location);
  formData.append('happen_time', payload.happenTime);
  formData.append('description', payload.description);
  formData.append('contact', payload.contact);
  payload.files.forEach((file) => {
    formData.append('files', file);
  });

  return unwrap<{ post: RawPost; content_check: unknown }>(
    request.post('/post', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
  );
};

export const fetchPostList = (params: {
  page: number;
  pageSize: number;
  postType?: PostType;
  keyword?: string;
}) =>
  unwrap<PageResult<RawPost>>(
    request.get('/post/list', {
      params: {
        page: params.page,
        page_size: params.pageSize,
        post_type: params.postType,
        keyword: params.keyword || undefined,
      },
    }),
  );

export const fetchPostStatistics = () => unwrap<PostStatistics>(request.get('/post/statistics'));

export const semanticSearchPosts = (params: { page: number; pageSize: number; keyword: string }) =>
  unwrap<PageResult<RawPost>>(
    request.post('/search', {
      keyword: params.keyword,
      page: params.page,
      page_size: params.pageSize,
    }),
  );

export const fetchPostDetail = (postId: string | number) => unwrap<RawPost>(request.get(`/post/${postId}`));

export const offlinePost = (postId: string | number) => unwrap<RawPost>(request.patch(`/post/${postId}/offline`));

export const fetchPostComments = (postId: string | number) =>
  unwrap<PageResult<RawComment>>(request.get(`/interact/comments/${postId}`, { params: { page: 1, page_size: 100 } }));

export const createComment = (postId: string | number, content: string) =>
  unwrap<RawComment>(request.post('/interact/comment', { post_id: Number(postId), content }));

export const deleteComment = (commentId: string | number) => unwrap<{ comment_id: number }>(request.delete(`/interact/comment/${commentId}`));

export const collectPost = (postId: string | number) => unwrap<unknown>(request.post(`/interact/collect/${postId}`));

export const cancelCollectPost = (postId: string | number) => unwrap<unknown>(request.delete(`/interact/collect/${postId}`));

export const fetchMyPosts = () =>
  unwrap<PageResult<RawPost>>(request.get('/interact/my-posts', { params: { page: 1, page_size: 50 } }));

export const fetchMyCollects = () =>
  unwrap<PageResult<RawPost>>(request.get('/interact/my-collects', { params: { page: 1, page_size: 50 } }));

export const fetchMyComments = () =>
  unwrap<PageResult<RawMyComment>>(request.get('/interact/my-comments', { params: { page: 1, page_size: 50 } }));

export const fetchAdminPosts = (params: { page: number; pageSize: number; status: PostStatus }) =>
  unwrap<PageResult<RawPost>>(
    request.get('/admin/posts', {
      params: {
        status: params.status,
        page: params.page,
        page_size: params.pageSize,
      },
    }),
  );

export const approveAdminPost = (postId: string | number) => unwrap<RawPost>(request.patch(`/admin/posts/${postId}/approve`));

export const rejectAdminPost = (postId: string | number, reason?: string) =>
  unwrap<{ post: RawPost; reason?: string }>(request.patch(`/admin/posts/${postId}/reject`, { reason }));

export const fetchAdminStatistics = () => unwrap<AdminStatistics>(request.get('/admin/statistics'));

export const resolveAssetUrl = (url?: string | null) => {
  if (!url) {
    return '';
  }

  if (/^(blob:|data:|https?:\/\/)/.test(url)) {
    return url;
  }

  const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
  const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

  if (/^https?:\/\//.test(baseURL)) {
    return `${new URL(baseURL).origin}${normalizedUrl}`;
  }

  return normalizedUrl;
};
