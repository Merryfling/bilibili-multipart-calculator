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
  const [fromPInput, setFromPInput] = useState(""); // 输入框显示值
  const [toPInput, setToPInput] = useState(""); // 输入框显示值
  const [speedInput, setSpeedInput] = useState(""); // 倍速输入框显示值
  const [activeFocus, setActiveFocus] = useState<'fromP' | 'toP' | null>(null); // 当前焦点状态
  const [toastMessage, setToastMessage] = useState(""); // 提示消息
  const [showToast, setShowToast] = useState(false); // 显示提示
  const [toastTimer, setToastTimer] = useState<NodeJS.Timeout | null>(null); // 提示计时器
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

  // 当fromP、toP或speed变化时，更新输入显示值
  useEffect(() => {
    updateFromPInput();
    updateToPInput();
    updateSpeedInput();
  }, [fromP, toP, speed]);

  // 初始化输入显示值
  useEffect(() => {
    setFromPInput("1");
    setToPInput("1");
    setSpeedInput("1");
  }, []);

  // 清理计时器
  useEffect(() => {
    return () => {
      if (toastTimer) {
        clearTimeout(toastTimer);
      }
    };
  }, [toastTimer]);

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
      setToPInput(fetchedParts.length.toString());

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

  // 显示提示消息
  const showToastMessage = (message: string) => {
    // 清除之前的计时器
    if (toastTimer) {
      clearTimeout(toastTimer);
    }
    
    setToastMessage(message);
    setShowToast(true);
    
    // 设置新的计时器
    const timer = setTimeout(() => {
      setShowToast(false);
      setToastTimer(null);
    }, 3000);
    
    setToastTimer(timer);
  };

  // 处理输入框焦点
  const handleFromPFocus = () => {
    setActiveFocus('fromP');
    showToastMessage("已选择起始P输入框，点击分P列表设置起始P");
  };

  const handleToPFocus = () => {
    setActiveFocus('toP');
    showToastMessage("已选择结束P输入框，点击分P列表设置结束P");
  };

  // 处理输入框失去焦点
  const handleInputBlur = () => {
    setTimeout(() => setActiveFocus(null), 100); // 延迟清除焦点状态，允许点击分P列表
  };

  // 更新输入显示值的函数
  const updateFromPInput = () => {
    setFromPInput(prev => prev !== fromP.toString() ? fromP.toString() : prev);
  };
  
  const updateToPInput = () => {
    setToPInput(prev => prev !== toP.toString() ? toP.toString() : prev);
  };
  
  const updateSpeedInput = () => {
    setSpeedInput(prev => prev !== speed.toString() ? speed.toString() : prev);
  };

  // 处理输入框变化
  const handleFromPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFromPInput(value);
    
    if (value === "") {
      return; // 允许空值
    }
    
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= (parts.length || 1)) {
      setFromP(numValue);
    }
  };
  
  const handleToPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setToPInput(value);
    
    if (value === "") {
      return; // 允许空值
    }
    
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= fromP && numValue <= (parts.length || 1)) {
      setToP(numValue);
    }
  };
  
  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSpeedInput(value);
    
    if (value === "") {
      return; // 允许空值
    }
    
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0.1) {
      setSpeed(numValue);
    }
  };
  
  // 失去焦点时的处理
  const handleFromPBlur = () => {
    if (fromPInput === "" || parseInt(fromPInput, 10) < 1) {
      setFromPInput("1");
      setFromP(1);
    } else {
      const numValue = Math.min(Math.max(parseInt(fromPInput, 10), 1), parts.length || 1);
      setFromPInput(numValue.toString());
      setFromP(numValue);
    }
  };
  
  const handleToPBlur = () => {
    if (toPInput === "" || parseInt(toPInput, 10) < fromP) {
      setToPInput(fromP.toString());
      setToP(fromP);
    } else {
      const numValue = Math.min(Math.max(parseInt(toPInput, 10), fromP), parts.length || 1);
      setToPInput(numValue.toString());
      setToP(numValue);
    }
  };
  
  const handleSpeedBlur = () => {
    if (speedInput === "" || parseFloat(speedInput) < 0.1) {
      setSpeedInput("1");
      setSpeed(1.0);
    } else {
      const numValue = Math.max(parseFloat(speedInput), 0.1);
      setSpeedInput(numValue.toString());
      setSpeed(numValue);
    }
  };
  // 处理分P点击选择
  const handlePartClick = (partIndex: number) => {
    const partNumber = partIndex + 1;
    
    if (activeFocus === 'fromP') {
      // 当起始P输入框有焦点时，只更新起始P
      if (partNumber <= toP) {
        setFromP(partNumber);
        setFromPInput(partNumber.toString());
        showToastMessage(`已设置起始P为 P${partNumber}`);
      } else {
        showToastMessage(`起始P不能大于结束P (P${toP})`);
      }
    } else if (activeFocus === 'toP') {
      // 当结束P输入框有焦点时，只更新结束P
      if (partNumber >= fromP) {
        setToP(partNumber);
        setToPInput(partNumber.toString());
        showToastMessage(`已设置结束P为 P${partNumber}`);
      } else {
        showToastMessage(`结束P不能小于起始P (P${fromP})`);
      }
    } else {
      // 没有焦点时使用原逻辑
      // 如果点击的是当前起始P，则只选择这一个P
      if (partNumber === fromP && partNumber === toP) {
        return;
      }
      
      // 如果还没有选择起始P，或者点击的P小于当前起始P，设置为起始P
      if (fromP === toP || partNumber < fromP) {
        setFromP(partNumber);
        setToP(partNumber);
        setFromPInput(partNumber.toString());
        setToPInput(partNumber.toString());
        showToastMessage(`已选择 P${partNumber}`);
      } else {
        // 否则设置为结束P
        setToP(partNumber);
        setToPInput(partNumber.toString());
        showToastMessage(`已设置范围为 P${fromP}-P${partNumber}`);
      }
    }
  };

  return (
    <main className="h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <Card className="w-full max-w-7xl h-[90vh] shadow-xl rounded-lg flex flex-col">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-gray-800 dark:text-gray-100">
            Bilibili 多P时长计算器
          </CardTitle>
          <CardDescription className="mt-2 text-md text-gray-600 dark:text-gray-400">
            输入 Bilibili BV 号或视频链接，计算指定P的时长。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col overflow-hidden">
          {/* Top Controls - BV号和倍速 */}
          <div className="flex flex-col sm:flex-row w-full items-end space-y-4 sm:space-y-0 sm:space-x-4 mb-6">
            <div className="flex-grow">
              <Label htmlFor="bvInput" className="text-gray-700 dark:text-gray-300 block mb-2">
                BV号或视频链接:
              </Label>
              <Input
                id="bvInput"
                type="text"
                placeholder="输入 BV 号或视频链接 (如: BV1xxxxxx 或 https://www.bilibili.com/video/BV1xxxxxx)"
                className="p-3 text-lg border-2 border-blue-300 focus:border-blue-500 transition-colors rounded-md"
                autoFocus
                value={bvidOrLink}
                onChange={(e) => setBvidOrLink(e.target.value)}
              />
            </div>
            <div className="min-w-[120px]">
              <Label htmlFor="speed" className="text-gray-700 dark:text-gray-300 block mb-2">
                播放倍速:
              </Label>
              <Input
                id="speed"
                type="number"
                min="0.1"
                step="0.1"
                className="p-3 text-lg"
                value={speedInput}
                onChange={handleSpeedChange}
                onBlur={handleSpeedBlur}
              />
            </div>
            <Button
              type="submit"
              className="px-6 py-3 text-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow-md transition-all duration-200 ease-in-out"
              onClick={handleSearch}
              disabled={isLoading || !bvidOrLink.trim()}
            >
              {isLoading ? (
                <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "搜索"
              )}
            </Button>
          </div>

          {/* Two Column Layout */}
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 flex-1 min-h-0">

            {/* Left Column - Part List */}
            <div className="w-full lg:flex-[7] flex flex-col min-h-0">
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
                <div className="flex-1 flex flex-col min-h-0">
                  <h3 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200">
                    视频分P列表 <span className="text-sm font-normal">(共 {parts.length} 个分P)</span>
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    点击分P选择起始和结束范围
                  </p>
                  <ul className="space-y-0 text-gray-700 dark:text-gray-300 flex-1 overflow-y-auto pr-2 border border-gray-200 dark:border-gray-700 rounded-lg shadow-inner">
                    {parts.map((part, index) => (
                      <li 
                        key={part.cid}
                        onClick={() => handlePartClick(index)}
                        className={`flex justify-between items-center text-xs sm:text-sm p-2 cursor-pointer transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-b-0 ${
                          isPartSelected(index) 
                            ? "bg-blue-100 dark:bg-blue-900 font-medium border-blue-200 dark:border-blue-800 shadow-sm" 
                            : "hover:shadow-sm"
                        }`}
                      >
                        <span className="flex-1 mr-2 font-medium text-gray-800 dark:text-gray-200 leading-tight">
                          P{part.page}: {part.title}
                        </span>
                        <span className="font-mono text-gray-600 dark:text-gray-400 text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-nowrap">
                          {formatDuration(part.duration)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                  {error ? (
                    <p className="text-red-500 dark:text-red-400 font-semibold">{error}</p>
                  ) : (
                    <p>请输入 BV 号或链接进行查询</p>
                  )}
                </div>
              )}
            </div>

            {/* Right Column - Input Controls */}
            <div className="w-full lg:flex-[3] lg:max-w-sm xl:max-w-md flex flex-col">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 h-full flex flex-col">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
                  参数设置
                </h3>
                <div className="space-y-4 flex-1 flex flex-col overflow-y-auto">
                  <div>
                    <Label htmlFor="fromP" className="text-gray-700 dark:text-gray-300">
                      起始 P:
                    </Label>
                    <Input
                      id="fromP"
                      type="number"
                      min="1"
                      max={parts.length || 1}
                      className="mt-1"
                      value={fromPInput}
                      onChange={handleFromPChange}
                      onFocus={handleFromPFocus}
                      onBlur={() => {
                        handleFromPBlur();
                        handleInputBlur();
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="toP" className="text-gray-700 dark:text-gray-300">
                      结束 P:
                    </Label>
                    <Input
                      id="toP"
                      type="number"
                      min={fromP}
                      max={parts.length > 0 ? parts.length : undefined}
                      className="mt-1"
                      value={toPInput}
                      onChange={handleToPChange}
                      onFocus={handleToPFocus}
                      onBlur={() => {
                        handleToPBlur();
                        handleInputBlur();
                      }}
                    />
                  </div>
                  {parts.length > 0 && (
                    <>
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          选择范围: P{fromP} - P{toP}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          共 {toP - fromP + 1} 个分P
                        </p>
                      </div>
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3 mt-auto">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            原始总时长:
                          </p>
                          <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                            <span className="font-mono text-blue-600 dark:text-blue-400">
                              {formatDuration(totalDuration)}
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            {speed}倍速后时长:
                          </p>
                          <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                            <span className="font-mono text-blue-600 dark:text-blue-400">
                              {formatDuration(adjustedTotalDuration)}
                            </span>
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        
        {/* 底部提示浮窗 */}
        {showToast && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800/90 dark:bg-gray-200/90 backdrop-blur-sm text-white dark:text-gray-800 px-4 py-2 rounded-lg shadow-xl z-50 animate-[fadeInUp_0.3s_ease-out] max-w-md text-center">
            <p className="text-sm font-medium">{toastMessage}</p>
          </div>
        )}
        
        <footer className="text-center py-2 text-gray-500 dark:text-gray-400 text-xs border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <p>&copy; 2025 Bilibili 多P时长计算器. 保留所有权利.</p>
            <p>由 ChanlerDev 精心打造</p>
        </footer>
      </Card>
    </main>
  );
}