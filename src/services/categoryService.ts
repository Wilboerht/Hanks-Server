import mongoose from 'mongoose';
import { Category, ICategory } from '../models/Category';
import { Post } from '../models/Post';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';
import { slugify } from '../utils/slugify';

interface CreateCategoryDTO {
  name: string;
  description?: string;
  parent?: string;
  order?: number;
  color?: string;
  icon?: string;
}

interface UpdateCategoryDTO {
  name?: string;
  description?: string;
  parent?: string | null;
  order?: number;
  color?: string;
  icon?: string;
}

// 用于保存结果的接口
interface CategoryCount {
  categoryId: string;
  name: string;
  count: number;
}

/**
 * 分类服务类
 * 处理分类的创建、更新、删除和查询等操作
 */
export class CategoryService {
  /**
   * 创建分类
   * @param data 分类数据
   */
  async createCategory(data: CreateCategoryDTO): Promise<ICategory> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 检查分类名称是否已存在
      const existingCategory = await Category.findOne({ name: data.name });
      if (existingCategory) {
        throw new AppError('分类名称已存在', 400);
      }

      // 生成slug
      const slug = slugify(data.name);
      const slugExist = await Category.findOne({ slug });
      if (slugExist) {
        throw new AppError('分类slug已存在，请使用其他名称', 400);
      }

      // 检查父分类是否存在
      if (data.parent) {
        const parentCategory = await Category.findById(data.parent);
        if (!parentCategory) {
          throw new AppError('父分类不存在', 404);
        }
      }

      // 创建分类
      const category = await Category.create(
        [{
          name: data.name,
          slug,
          description: data.description || '',
          parentCategory: data.parent ? new mongoose.Types.ObjectId(data.parent) : undefined,
          order: data.order || 0,
        }],
        { session }
      );

      await session.commitTransaction();
      return category[0];
    } catch (error) {
      await session.abortTransaction();
      logger.error('创建分类失败', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * 更新分类
   * @param categoryId 分类ID
   * @param data 更新数据
   */
  async updateCategory(categoryId: string, data: UpdateCategoryDTO): Promise<ICategory> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 查找分类
      const category = await Category.findById(categoryId);
      if (!category) {
        throw new AppError('分类不存在', 404);
      }

      // 如果更新了名称，检查名称是否已存在
      if (data.name && data.name !== category.name) {
        const existingCategory = await Category.findOne({ name: data.name, _id: { $ne: categoryId } });
        if (existingCategory) {
          throw new AppError('分类名称已存在', 400);
        }

        // 更新slug
        const slug = slugify(data.name);
        const slugExist = await Category.findOne({ slug, _id: { $ne: categoryId } });
        if (slugExist) {
          throw new AppError('分类slug已存在，请使用其他名称', 400);
        }
        
        category.slug = slug;
      }

      // 如果更新了父分类，检查是否合法
      if (data.parent !== undefined) {
        if (data.parent === categoryId) {
          throw new AppError('不能将分类自身设为父分类', 400);
        }

        // 检查父分类是否存在
        const parentCategory = data.parent ? await Category.findById(data.parent) : null;
        if (data.parent && !parentCategory) {
          throw new AppError('父分类不存在', 404);
        }

        // 检查是否会导致循环依赖
        if (data.parent) {
          let currentParent = parentCategory as ICategory;
          while (currentParent && currentParent.parentCategory) {
            if (currentParent.parentCategory.toString() === categoryId) {
              throw new AppError('不能设置子分类为父分类，会导致循环依赖', 400);
            }
            const nextParent = await Category.findById(currentParent.parentCategory);
            if (!nextParent) break;
            currentParent = nextParent;
          }
        }
      }

      // 更新分类
      if (data.name) category.name = data.name;
      if (data.description !== undefined) category.description = data.description;
      if (data.parent !== undefined) {
        category.parentCategory = data.parent 
          ? new mongoose.Types.ObjectId(data.parent) 
          : undefined;
      }
      if (data.order !== undefined) category.order = data.order;
      
      await category.save({ session });
      await session.commitTransaction();
      
      return category;
    } catch (error) {
      await session.abortTransaction();
      logger.error('更新分类失败', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * 删除分类
   * @param categoryId 分类ID
   */
  async deleteCategory(categoryId: string): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 查找分类
      const category = await Category.findById(categoryId);
      if (!category) {
        throw new AppError('分类不存在', 404);
      }

      // 获取子分类
      const childCategories = await Category.find({ parentCategory: categoryId });
      
      // 如果有子分类，不允许删除
      if (childCategories.length > 0) {
        throw new AppError('该分类下有子分类，不能删除', 400);
      }

      // 检查是否有文章使用此分类
      const postCount = await Post.countDocuments({ category: categoryId });
      if (postCount > 0) {
        throw new AppError(`该分类下有${postCount}篇文章，不能删除`, 400);
      }

      // 删除分类
      await Category.findByIdAndDelete(categoryId, { session });
      await session.commitTransaction();
      
      logger.info(`分类 ${categoryId} 已删除`);
    } catch (error) {
      await session.abortTransaction();
      logger.error('删除分类失败', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * 获取所有分类
   * @param includePostCount 是否包含文章数量
   * @param structureAsTree 是否以树形结构返回
   */
  async getAllCategories(includePostCount: boolean = false, structureAsTree: boolean = false): Promise<any> {
    try {
      // 获取分类列表
      const categoriesQuery = Category.find().sort({ order: 1, name: 1 });
      
      // 带上子分类
      if (structureAsTree) {
        categoriesQuery.populate('childCategories');
      }
      
      let categories = await categoriesQuery.lean();

      // 获取每个分类的文章数量
      if (includePostCount) {
        const postCounts = await Post.aggregate([
          { $group: { _id: '$category', count: { $sum: 1 } } }
        ]);
        
        const countMap = new Map<string, number>();
        postCounts.forEach((item: any) => {
          if (item._id) countMap.set(item._id.toString(), item.count);
        });
        
        categories = categories.map(category => {
          const categoryObj = category as any;
          categoryObj.postCount = countMap.get(String(category._id)) || 0;
          return categoryObj;
        });
      }

      // 以树形结构返回
      if (structureAsTree) {
        const rootCategories = categories.filter((c: any) => !c.parentCategory);
        return rootCategories;
      }

      return categories;
    } catch (error) {
      logger.error('获取分类列表失败', error);
      throw error;
    }
  }

  /**
   * 获取分类详情
   * @param categoryId 分类ID
   */
  async getCategoryDetail(categoryId: string): Promise<ICategory> {
    try {
      const category = await Category.findById(categoryId)
        .populate('childCategories')
        .populate('parentCategory');
      
      if (!category) {
        throw new AppError('分类不存在', 404);
      }
      
      return category;
    } catch (error) {
      logger.error('获取分类详情失败', error);
      throw error;
    }
  }

  /**
   * 获取分类及其所有子分类的ID
   * @param categoryId 分类ID
   */
  async getCategoryAndChildrenIds(categoryId: string): Promise<string[]> {
    try {
      const ids = [categoryId];
      
      // 递归查找所有子分类
      const findChildren = async (parentId: string) => {
        const children = await Category.find({ parentCategory: parentId });
        for (const child of children) {
          ids.push(String(child._id));
          await findChildren(String(child._id));
        }
      };
      
      await findChildren(categoryId);
      return ids;
    } catch (error) {
      logger.error('获取分类及子分类ID失败', error);
      throw error;
    }
  }

  /**
   * 更新分类顺序
   * @param categoryIds 有序的分类ID数组
   * @param parentId 父分类ID（可选）
   */
  async updateCategoryOrder(categoryIds: string[], parentId?: string): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 验证所有分类ID是否有效
      for (const [index, id] of categoryIds.entries()) {
        const category = await Category.findById(id);
        if (!category) {
          throw new AppError(`ID为${id}的分类不存在`, 404);
        }
        
        // 更新顺序和父级
        await Category.findByIdAndUpdate(
          id,
          { 
            order: index,
            ...(parentId !== undefined ? { parentCategory: parentId || undefined } : {})
          },
          { session }
        );
      }
      
      await session.commitTransaction();
      logger.info('分类顺序更新成功');
    } catch (error) {
      await session.abortTransaction();
      logger.error('更新分类顺序失败', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * 搜索分类
   * @param query 搜索关键词
   * @param limit 返回数量限制
   */
  async searchCategories(query: string, limit: number = 10): Promise<ICategory[]> {
    try {
      const regex = new RegExp(query, 'i');
      const categories = await Category.find({
        $or: [
          { name: { $regex: regex } },
          { description: { $regex: regex } }
        ]
      })
      .limit(limit)
      .sort({ order: 1, name: 1 });
      
      return categories;
    } catch (error) {
      logger.error('搜索分类失败', error);
      throw error;
    }
  }

  /**
   * 更新所有分类的文章计数
   * 可以作为定时任务运行
   */
  async updateCategoryPostCounts(): Promise<void> {
    try {
      const categories = await Category.find();
      const results: CategoryCount[] = [];
      
      for (const category of categories) {
        const count = await Post.countDocuments({ category: String(category._id) });
        results.push({
          categoryId: String(category._id),
          name: category.name,
          count
        });
      }
      
      logger.info('分类文章数量统计完成', { results });
    } catch (error) {
      logger.error('更新分类文章计数失败', error);
      throw error;
    }
  }
} 