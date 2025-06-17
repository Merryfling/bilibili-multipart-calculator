"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCcw } from "lucide-react"; // Import for loading spinner
import { useState, useEffect } from "react"; // 导入 useEffect 钩子
import { BilibiliPart } from "@/types"; // 从新的类型文件导入 BilibiliPart 接口

export default function Home() {
  // 状态管理
  const [bvidOrLink, setBvidOrLink] = useState(""); // BV号或链接的状态
  const [fromP, setFromP] = useState(1); // 从 P 的状态
  const [toP, setToP] = useState(1); // 到 P 的状态
  const [speed, setSpeed] = useState(1.0); // 倍速的状态
  const [parts, setParts] = useState<BilibiliPart[]>([]); // 视频分 P 列表的状态
  const [totalDuration, setTotalDuration] = useState(0); // 总时长的状态
  const [adjustedTotalDuration, setAdjustedTotalDuration] = useState(0); // 调整后总时长的状态
  const [isLoading, setIsLoading] = useState(false); // 加载状态
  const [error, setError] = useState<string | null>(null); // 错误信息状态

  // 格式化时长为HH:MM:SS
  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return [h, m, s]
      .map((v) => v.toString().padStart(2, "0"))
      .filter((v, i) => v !== "00" || i > 0 || h > 0) // Hide leading '00:' if hours are zero
      .join(":");
  };

  // 当fromP, toP或speed变化时，重新计算时长
  useEffect(() => {
    if (parts.length > 0) {
      // 确保 fromP 和 toP 在有效范围内
      const maxP = parts.length;
      const actualFromP = Math.max(1, Math.min(fromP, maxP));
      const actualToP = Math.max(actualFromP, Math.min(toP, maxP));

      // 计算选中 P 的总时长
      const selectedParts = parts.slice(actualFromP - 1, actualToP);
      const newTotalDuration = selectedParts.reduce((acc, part) => acc + part.duration, 0);
      setTotalDuration(newTotalDuration);
      setAdjustedTotalDuration(newTotalDuration / speed);
    }
  }, [fromP, toP, speed, parts]);

  const handleSearch = async () => {
    setError(null);
    setIsLoading(true);
    setParts([]);
    setTotalDuration(0);
    setAdjustedTotalDuration(0);

    if (!bvidOrLink.trim()) {
      setError("请输入 BV 号或视频链接。");
      setIsLoading(false);
      return;
    }

    console.log("正在搜索:", bvidOrLink);

    try {
      // 调用 Next.js 的 API 路由来获取 Bilibili 视频数据
      const response = await fetch(`/api/bilibili?url=${encodeURIComponent(bvidOrLink)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "未能获取视频信息。");
      }

      const data = await response.json();
      const fetchedParts: BilibiliPart[] = data.parts;

      if (fetchedParts.length === 0) {
        setError("未找到该视频的任何分P信息，或链接无效。");
        setParts([]); // 清空parts以防万一
        return;
      }

      setParts(fetchedParts);

      // 设置toP为最大P数
      setToP(fetchedParts.length);

    } catch (err: unknown) {
      console.error("搜索失败:", err);
      const errorMessage = err instanceof Error ? err.message : "请求视频信息时发生错误。";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 判断分P是否被选中
  const isPartSelected = (partIndex: number) => {
    return partIndex >= fromP - 1 && partIndex <= toP - 1;
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-3xl shadow-xl rounded-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-gray-800 dark:text-gray-100">
            Bilibili 多P时长计算器
          </CardTitle>
          <CardDescription className="mt-2 text-md text-gray-600 dark:text-gray-400">
            输入 Bilibili BV 号或视频链接，计算指定P的时长。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <div className="flex w-full items-center space-x-2 mb-6">
            <Input
              type="text"
              placeholder="输入 BV 号或视频链接 (如: BV1xxxxxx 或 https://www.bilibili.com/video/BV1xxxxxx)"
              className="flex-grow p-3 text-lg border-2 border-blue-300 focus:border-blue-500 transition-colors rounded-md"
              autoFocus // Optional: Auto-focus the search box
              value={bvidOrLink} // 绑定状态
              onChange={(e) => setBvidOrLink(e.target.value)} // 更新状态
            />
            <Button
              type="submit"
              className="px-6 py-3 text-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow-md transition-all duration-200 ease-in-out"
              onClick={handleSearch} // 绑定点击事件处理函数
              disabled={isLoading || !bvidOrLink.trim()} // 禁用条件：加载中或输入为空
            >
              {isLoading ? (
                <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "搜索"
              )}
            </Button>
          </div>

          {/* Input Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <Label htmlFor="fromP" className="text-gray-700 dark:text-gray-300">
                从 P:
              </Label>
              <Input
                id="fromP"
                type="number"
                min="1"
                max={parts.length || 1}
                className="mt-1"
                value={fromP} // 绑定状态
                onChange={(e) => setFromP(Number(e.target.value))} // 更新状态
              />
            </div>
            <div>
              <Label htmlFor="toP" className="text-gray-700 dark:text-gray-300">
                到 P:
              </Label>
              <Input
                id="toP"
                type="number"
                min={fromP}
                max={parts.length > 0 ? parts.length : undefined} // 动态设置最大值
                className="mt-1"
                value={toP} // 绑定状态
                onChange={(e) => setToP(Number(e.target.value))} // 更新状态
              />
            </div>
            <div>
              <Label htmlFor="speed" className="text-gray-700 dark:text-gray-300">
                倍速:
              </Label>
              <Input
                id="speed"
                type="number"
                min="0.1"
                step="0.1"
                className="mt-1"
                value={speed} // 绑定状态
                onChange={(e) => setSpeed(Number(e.target.value))} // 更新状态
              />
            </div>
          </div>

          {/* Display Area */}
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-[80%]" />
              <Skeleton className="h-6 w-[60%]" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[90%]" />
              <Skeleton className="h-4 w-[70%]" />
            </div>
          ) : parts.length > 0 ? (
            <div className="mt-6">
              <h3 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200">
                视频分P列表 <span className="text-sm font-normal">(共 {parts.length} 个分P)</span>:
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300 max-h-60 overflow-y-auto pr-2">
                {parts.map((part, index) => (
                  <li 
                    key={part.cid} 
                    className={`flex justify-between items-center text-sm sm:text-base p-1 rounded-md transition-colors ${
                      isPartSelected(index) 
                        ? "bg-blue-100 dark:bg-blue-900 font-medium" 
                        : "opacity-70"
                    }`}
                  >
                    <span>
                      P{part.page}: {part.title}
                    </span>
                    <span className="font-mono text-gray-600 dark:text-gray-400">
                      {formatDuration(part.duration)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                  总时长 (P{fromP}-P{toP}):{" "}
                  <span className="font-mono text-blue-600 dark:text-blue-400">
                    {formatDuration(totalDuration)}
                  </span>
                </p>
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                  调整后总时长 ({`${speed}倍速`}):{" "} {/* 使用实际的倍速值 */}
                  <span className="font-mono text-blue-600 dark:text-blue-400">
                    {formatDuration(adjustedTotalDuration)}
                  </span>
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
              {error ? (
                <p className="text-red-500 dark:text-red-400 font-semibold">{error}</p> // 显示错误信息
              ) : (
                <p>请输入 BV 号或链接进行查询</p>
              )}
            </div>
          )}
        </CardContent>
        <footer className="text-center pb-4 text-gray-500 dark:text-gray-400 text-sm">
            <p>&copy; 2025 Bilibili 多P时长计算器. 保留所有权利.</p>
            <p>由 ChanlerDev 精心打造</p>
        </footer>
      </Card>
    </main>
  );
}