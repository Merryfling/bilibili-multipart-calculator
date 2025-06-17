import { NextResponse } from 'next/server';
import { BilibiliPart } from '@/types'; // 导入 BilibiliPart 接口

// 获取后端API的基础URL，默认为本地开发环境
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:2323';

// 辅助函数：从输入字符串中提取 BV 号
function extractBvid(input: string): string | null {
  // 匹配 BV 号的正则表达式 (BV后跟10位字母数字)
  const bvidRegex = /BV[0-9A-Za-z]{10}/;
  const match = input.match(bvidRegex);
  if (match) {
    return match[0];
  }

  // 如果是完整的URL，尝试从路径中解析
  try {
    const url = new URL(input);
    const pathSegments = url.pathname.split('/');
    for (const segment of pathSegments) {
      const bvidMatch = segment.match(bvidRegex);
      if (bvidMatch) {
        return bvidMatch[0];
      }
    }
  } catch (e) {
    // 不是有效的URL，继续尝试作为原始BV号处理
  }

  // 如果输入本身就是BV号，则返回它
  if (bvidRegex.test(input)) {
    return input;
  }

  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const inputUrl = searchParams.get('url'); // 获取前端传入的 url 参数

  if (!inputUrl) {
    return NextResponse.json({ error: '缺少视频链接或BV号参数。' }, { status: 400 });
  }

  console.log(`Next.js API 路由接收到请求，准备调用后端处理 URL: ${inputUrl}`);

  try {
    // 使用环境变量中配置的后端API地址
    const backendUrl = `${API_BASE_URL}/bilibili-parts?url=${encodeURIComponent(inputUrl)}`;
    console.log(`Calling backend API at: ${backendUrl}`);
    
    const response = await fetch(backendUrl);
      
    if (!response.ok) {
      // 尝试从后端解析错误信息
      const errorData = await response.json();
      throw new Error(errorData.error || `后端请求失败，状态码: ${response.status}`);
    }

    const data = await response.json();
    const fetchedParts: BilibiliPart[] = data.parts; // 后端直接返回 'parts' 数组

    if (fetchedParts.length === 0) {
      return NextResponse.json({ error: "未找到该视频的任何分P信息，或链接无效。" }, { status: 404 });
    }

    return NextResponse.json({ parts: fetchedParts });

  } catch (err: unknown) {
    console.error("在调用后端时发生错误:", err);
    const errorMessage = err instanceof Error ? err.message : "从后端获取视频信息时发生错误。";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 