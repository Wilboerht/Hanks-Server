import { User, IUser } from '../models/User';
import { AppError } from '../utils/appError';
import bcrypt from 'bcrypt';

/**
 * 用户服务层 - 处理用户相关的业务逻辑
 */
export class UserService {
  /**
   * 根据ID查找用户
   */
  async findUserById(id: string): Promise<IUser | null> {
    try {
      return await User.findById(id);
    } catch (error) {
      throw new AppError('查询用户失败', 500);
    }
  }

  /**
   * 根据用户名查找用户
   */
  async findUserByUsername(username: string): Promise<IUser | null> {
    try {
      return await User.findOne({ username });
    } catch (error) {
      throw new AppError('查询用户失败', 500);
    }
  }

  /**
   * 根据邮箱查找用户
   */
  async findUserByEmail(email: string): Promise<IUser | null> {
    try {
      return await User.findOne({ email });
    } catch (error) {
      throw new AppError('查询用户失败', 500);
    }
  }

  /**
   * 创建新用户
   */
  async createUser(userData: Partial<IUser>): Promise<IUser> {
    try {
      // 检查用户名和邮箱是否已存在
      const existingUser = await User.findOne({
        $or: [
          { username: userData.username },
          { email: userData.email }
        ]
      });

      if (existingUser) {
        if (existingUser.username === userData.username) {
          throw new AppError('用户名已被使用', 400);
        }
        if (existingUser.email === userData.email) {
          throw new AppError('邮箱已被注册', 400);
        }
      }

      // 创建新用户
      const newUser = await User.create(userData);
      return newUser;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('创建用户失败', 500);
    }
  }

  /**
   * 更新用户信息
   */
  async updateUser(userId: string, updateData: Partial<IUser>): Promise<IUser | null> {
    try {
      // 不允许直接更新密码，密码更新应使用专门的方法
      if (updateData.password) {
        delete updateData.password;
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        throw new AppError('用户不存在', 404);
      }

      return updatedUser;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('更新用户失败', 500);
    }
  }

  /**
   * 验证用户密码
   */
  async verifyPassword(user: IUser, password: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, user.password);
    } catch (error) {
      throw new AppError('密码验证失败', 500);
    }
  }

  /**
   * 更改用户密码
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<IUser | null> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('用户不存在', 404);
      }

      // 验证当前密码
      const isPasswordValid = await this.verifyPassword(user, currentPassword);
      if (!isPasswordValid) {
        throw new AppError('当前密码不正确', 400);
      }

      // 更新密码
      user.password = newPassword;
      await user.save();

      return user;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('更改密码失败', 500);
    }
  }
} 