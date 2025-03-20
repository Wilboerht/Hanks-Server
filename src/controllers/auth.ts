import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, IUser } from '../models/User';
import { LoginCredentials, RegisterData, AuthResponse } from '../types/auth';
import { AppError } from '../utils/appError';
import { AsyncRequestHandler, AuthenticatedRequestHandler } from '../types/express';

export const register: AsyncRequestHandler = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 检查用户名或邮箱是否已存在
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(400).json({ message: '用户名已被使用' });
      }
      if (existingUser.email === email) {
        return res.status(400).json({ message: '邮箱已被注册' });
      }
    }

    // 创建新用户
    const user = new User({
      username,
      email,
      password, // 密码会在模型的 pre-save 钩子中自动加密
    });

    await user.save();

    // 生成 JWT
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    res.status(500).json({ message: '注册失败' });
  }
};

export const login: AsyncRequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 查找用户
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: '邮箱或密码不正确' });
    }

    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: '邮箱或密码不正确' });
    }

    // 生成 JWT
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    res.status(500).json({ message: '登录失败' });
  }
};

export const getProfile: AuthenticatedRequestHandler = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      createdAt: user.createdAt,
    });
  } catch (error) {
    res.status(500).json({ message: '获取个人资料失败' });
  }
};

export const updateProfile: AuthenticatedRequestHandler = async (req, res) => {
  try {
    const { username, avatar, bio } = req.body;

    // 检查用户名是否已被使用
    if (username) {
      const existingUser = await User.findOne({ username, _id: { $ne: req.user._id } });
      if (existingUser) {
        return res.status(400).json({ message: '用户名已被使用' });
      }
    }

    // 更新用户资料
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { username, avatar, bio } },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: '用户不存在' });
    }

    res.json({
      id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      avatar: updatedUser.avatar,
      bio: updatedUser.bio,
      createdAt: updatedUser.createdAt,
    });
  } catch (error) {
    res.status(500).json({ message: '更新个人资料失败' });
  }
};

export const changePassword: AuthenticatedRequestHandler = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // 获取用户
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 验证当前密码
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: '当前密码不正确' });
    }

    // 更新密码
    user.password = newPassword;
    await user.save();

    res.json({ message: '密码修改成功' });
  } catch (error) {
    res.status(500).json({ message: '修改密码失败' });
  }
}; 