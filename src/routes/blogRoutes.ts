import express from 'express';
import { CategoryController } from '../controllers/categoryController';
import { TagController } from '../controllers/tagController';
import { PostController } from '../controllers/postController';
import { CommentController } from '../controllers/commentController';
import { NotificationController } from '../controllers/notificationController';
import { protect, restrictTo } from '../middleware/auth';

const router = express.Router();

// 实例化控制器
const categoryController = new CategoryController();
const tagController = new TagController();
const postController = new PostController();
const commentController = new CommentController();
const notificationController = new NotificationController();

// 分类路由
router
  .route('/categories')
  .get(categoryController.getAllCategories)
  .post(protect, restrictTo('admin'), categoryController.createCategory);

router.get('/categories/search', categoryController.searchCategories);

router
  .route('/categories/:id')
  .get(categoryController.getCategoryDetail)
  .patch(protect, restrictTo('admin'), categoryController.updateCategory)
  .delete(protect, restrictTo('admin'), categoryController.deleteCategory);

router.patch(
  '/categories/order',
  protect,
  restrictTo('admin'),
  categoryController.updateCategoryOrder
);

router.post(
  '/categories/refresh-counts',
  protect,
  restrictTo('admin'),
  categoryController.refreshCategoryPostCounts
);

// 标签路由
router
  .route('/tags')
  .get(tagController.getAllTags)
  .post(protect, restrictTo('admin'), tagController.createTag);

router.get('/tags/search', tagController.searchTags);
router.get('/tags/popular', tagController.getPopularTags);

router
  .route('/tags/:id')
  .get(tagController.getTagDetail)
  .patch(protect, restrictTo('admin'), tagController.updateTag)
  .delete(protect, restrictTo('admin'), tagController.deleteTag);

router.post(
  '/tags/refresh-counts',
  protect,
  restrictTo('admin'),
  tagController.refreshTagPostCounts
);

// 文章路由
router
  .route('/posts')
  .get(postController.searchPosts)
  .post(protect, postController.createPost);

router.get('/posts/popular', postController.getPopularPosts);
router.get('/posts/author/:authorId', postController.getAuthorPosts);
router.get('/posts/related/:id', postController.getRelatedPosts);

router.get('/posts/saved', protect, postController.getSavedPosts);
router.post('/posts/:id/save', protect, postController.savePost);
router.delete('/posts/:id/save', protect, postController.unsavePost);

router.post('/posts/:id/like', protect, postController.likePost);
router.delete('/posts/:id/like', protect, postController.unlikePost);

router.patch('/posts/:id/publish', protect, postController.publishPost);
router.patch('/posts/:id/unpublish', protect, postController.unpublishPost);
router.patch('/posts/:id/schedule', protect, postController.schedulePost);

router.post(
  '/posts/publish-scheduled',
  protect,
  restrictTo('admin'),
  postController.runScheduledPublishing
);

router
  .route('/posts/:slug')
  .get(postController.getPostDetail)
  .patch(protect, postController.updatePost)
  .delete(protect, postController.deletePost);

// 评论路由
router
  .route('/comments')
  .post(protect, commentController.createComment);

router.get('/posts/:postId/comments', commentController.getPostComments);
router.get('/comments/:commentId/replies', commentController.getCommentReplies);
router.get('/users/:userId/comments', commentController.getUserComments);

router.post('/comments/:id/like', protect, commentController.likeComment);
router.delete('/comments/:id/like', protect, commentController.unlikeComment);

router.patch(
  '/comments/:id/moderate',
  protect,
  restrictTo('admin'),
  commentController.moderateComment
);

router.patch(
  '/comments/:id/highlight',
  protect,
  restrictTo('admin'),
  commentController.highlightComment
);

router
  .route('/comments/:id')
  .patch(protect, commentController.updateComment)
  .delete(protect, commentController.deleteComment);

// 通知路由
router.get('/notifications', protect, notificationController.getUserNotifications);
router.get('/notifications/unread-count', protect, notificationController.getUnreadCount);
router.patch('/notifications/:id/read', protect, notificationController.markAsRead);
router.patch('/notifications/read-all', protect, notificationController.markAllAsRead);
router.delete('/notifications/:id', protect, notificationController.deleteNotification);
router.delete('/notifications', protect, notificationController.deleteNotifications);

router.post(
  '/notifications/system',
  protect,
  restrictTo('admin'),
  notificationController.createSystemNotification
);

export default router; 