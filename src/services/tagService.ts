import { Tag, ITag } from '../models/Tag';
import { Post } from '../models/Post';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

interface CreateTagDTO {
  name: string;
  description?: string;
  color?: string;
}

interface UpdateTagDTO {
  name?: string;
  description?: string;
  color?: string;
}

/**
 * 标签服务类
 * 处理标签的创建、查询和管理
 */
export class TagService {
  /**
   * 创建标签
   * @param data 标签数据
   */
  async createTag(data: CreateTagDTO): Promise<ITag> {
    try {
      // 检查标签名是否已存在
      const existingTag = await Tag.findOne({ name: data.name });
      if (existingTag) {
        throw new AppError('标签名已存在', 400);
      }

      // 创建标签
      const tag = await Tag.create(data);
      logger.info(`标签创建成功: ${tag.name}`);
      return tag;
    } catch (error) {
      logger.error('创建标签失败', error);
      throw error;
    }
  }

  /**
   * 更新标签
   * @param tagId 标签ID
   * @param data 更新数据
   */
  async updateTag(tagId: string, data: UpdateTagDTO): Promise<ITag> {
    try {
      // 查找标签
      const tag = await Tag.findById(tagId);
      if (!tag) {
        throw new AppError('标签不存在', 404);
      }

      // 如果更新标签名，检查是否已存在
      if (data.name && data.name !== tag.name) {
        const existingTag = await Tag.findOne({ name: data.name });
        if (existingTag) {
          throw new AppError('标签名已存在', 400);
        }
      }

      // 更新标签
      Object.assign(tag, data);
      await tag.save();

      logger.info(`标签${tagId}更新成功`);
      return tag;
    } catch (error) {
      logger.error('更新标签失败', error);
      throw error;
    }
  }

  /**
   * 删除标签
   * @param tagId 标签ID
   */
  async deleteTag(tagId: string): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 查找标签
      const tag = await Tag.findById(tagId);
      if (!tag) {
        throw new AppError('标签不存在', 404);
      }

      // 检查标签是否被文章使用
      const postsCount = await Post.countDocuments({ tags: tagId });
      if (postsCount > 0) {
        throw new AppError(`无法删除，该标签被${postsCount}篇文章使用`, 400);
      }

      // 删除标签
      await Tag.findByIdAndDelete(tagId, { session });

      await session.commitTransaction();
      session.endSession();

      logger.info(`标签${tagId}删除成功`);
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      
      logger.error('删除标签失败', error);
      throw error;
    }
  }

  /**
   * 获取所有标签
   * @param page 页码
   * @param limit 每页数量
   * @param sort 排序方式
   */
  async getAllTags(page: number = 1, limit: number = 20, sort: string = 'name'): Promise<{
    data: ITag[],
    meta: {
      total: number,
      page: number,
      limit: number,
      totalPages: number
    }
  }> {
    try {
      // 定义排序
      let sortOption: any = {};
      if (sort === 'popular') {
        sortOption = { postCount: -1 };
      } else if (sort === 'recent') {
        sortOption = { createdAt: -1 };
      } else {
        sortOption = { name: 1 };
      }

      const total = await Tag.countDocuments();
      const skip = (page - 1) * limit;

      // 获取标签列表
      const tags = await Tag.find()
        .sort(sortOption)
        .skip(skip)
        .limit(limit);

      return {
        data: tags,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('获取标签列表失败', error);
      throw error;
    }
  }

  /**
   * 获取标签详情
   * @param tagId 标签ID或slug
   */
  async getTagDetail(tagId: string): Promise<ITag> {
    try {
      let tag;
      
      // 检查是否使用ID或slug
      if (mongoose.Types.ObjectId.isValid(tagId)) {
        tag = await Tag.findById(tagId);
      } else {
        tag = await Tag.findOne({ slug: tagId });
      }

      if (!tag) {
        throw new AppError('标签不存在', 404);
      }

      return tag;
    } catch (error) {
      logger.error('获取标签详情失败', error);
      throw error;
    }
  }

  /**
   * 搜索标签
   * @param query 搜索关键词
   * @param limit 结果数量限制
   */
  async searchTags(query: string, limit: number = 10): Promise<ITag[]> {
    try {
      if (!query.trim()) {
        return [];
      }

      // 使用文本索引搜索
      const tags = await Tag.find(
        { $text: { $search: query } },
        { score: { $meta: 'textScore' } as any }
      )
        .sort({ score: { $meta: 'textScore' } as any })
        .limit(limit) as unknown as ITag[];

      // 如果文本索引搜索没有结果，使用正则表达式
      if (tags.length === 0) {
        return await Tag.find({
          name: { $regex: query, $options: 'i' }
        })
          .limit(limit);
      }

      return tags;
    } catch (error) {
      logger.error('搜索标签失败', error);
      throw error;
    }
  }

  /**
   * 获取热门标签
   * @param limit 结果数量限制
   */
  async getPopularTags(limit: number = 10): Promise<ITag[]> {
    try {
      // 按照关联文章数量排序
      const tags = await Tag.find()
        .sort({ postCount: -1 })
        .limit(limit);

      return tags;
    } catch (error) {
      logger.error('获取热门标签失败', error);
      throw error;
    }
  }

  /**
   * 批量创建或获取标签
   * @param tagNames 标签名数组
   */
  async getOrCreateTags(tagNames: string[]): Promise<ITag[]> {
    if (!tagNames.length) return [];
    
    try {
      const uniqueTagNames = [...new Set(tagNames.map(name => name.trim()).filter(name => name))];
      const tags: ITag[] = [];

      // 查找已存在的标签
      const existingTags = await Tag.find({ name: { $in: uniqueTagNames } });
      const existingTagNames = existingTags.map(tag => tag.name);
      
      // 添加已存在的标签
      tags.push(...existingTags);

      // 创建不存在的标签
      const newTagNames = uniqueTagNames.filter(name => !existingTagNames.includes(name));
      if (newTagNames.length) {
        const newTags = await Tag.create(
          newTagNames.map(name => ({ name }))
        );
        tags.push(...newTags);
      }

      return tags;
    } catch (error) {
      logger.error('批量创建标签失败', error);
      throw error;
    }
  }

  /**
   * 更新标签的文章计数
   * 用于维护标签的 postCount 虚拟字段准确性
   */
  async updateTagPostCounts(): Promise<void> {
    try {
      const tags = await Tag.find();
      
      for (const tag of tags) {
        const postCount = await Post.countDocuments({ tags: tag._id });
        // 使用类型断言处理postCount属性
        const tagWithCount = tag as unknown as ITag & { postCount?: number };
        
        if (tagWithCount.postCount !== postCount) {
          await Tag.updateOne(
            { _id: tag._id },
            { $set: { postCount } }
          );
          logger.info(`更新标签 ${tag.name} 的文章计数: ${postCount}`);
        }
      }
    } catch (error) {
      logger.error('更新标签文章计数失败', error);
      throw error;
    }
  }
} 