package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time" // 导入 time 包用于设置超时
)

// BilibiliPart 结构体定义了我们从B站API获取并希望返回给前端的数据结构
type BilibiliPart struct {
	CID      int    `json:"cid"`
	Page     int    `json:"page"`
	Title    string `json:"title"`
	Duration int    `json:"duration"` // in seconds
}

// BilibiliAPIResponse 是B站pagelist API的响应结构
type BilibiliAPIResponse struct {
	Code    int               `json:"code"`
	Message string            `json:"message"`
	TTL     int               `json:"ttl"`
	Data    []BilibiliAPIPart `json:"data"`
}

// BilibiliAPIPart 是B站pagelist API中每个分P的详细结构
type BilibiliAPIPart struct {
	CID      int    `json:"cid"`
	Page     int    `json:"page"`
	Part     string `json:"part"` // 分P标题
	Duration int    `json:"duration"`
	// ... 其他字段（此处省略，只保留我们需要的）
}

// 从环境变量获取配置，如果不存在则使用默认值
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

// extractBvid 从输入字符串中提取BV号
func extractBvid(input string) string {
	// 匹配 BV 号的正则表达式 (BV后跟10位字母数字)
	re := regexp.MustCompile(`BV[0-9A-Za-z]{10}`)
	match := re.FindString(input)
	if match != "" {
		return match
	}

	// 尝试从URL路径中解析
	u, err := url.Parse(input)
	if err == nil {
		pathSegments := regexp.MustCompile(`/`).Split(u.Path, -1)
		for _, segment := range pathSegments {
			match = re.FindString(segment)
			if match != "" {
				return match
			}
		}
	}

	return "" // 未找到BV号
}

// bilibiliPartsHandler 处理获取Bilibili视频分P信息的请求
func bilibiliPartsHandler(w http.ResponseWriter, r *http.Request) {
	// 从环境变量获取允许的源，默认允许localhost:2233
	allowedOrigins := getEnv("ALLOWED_ORIGINS", "http://localhost:2233")
	// 支持多个来源，用逗号分隔
	origins := strings.Split(allowedOrigins, ",")

	// 获取请求的Origin
	origin := r.Header.Get("Origin")

	// 检查Origin是否在允许列表中
	allowedOrigin := ""
	for _, o := range origins {
		if o == origin || o == "*" {
			allowedOrigin = o
			break
		}
	}

	// 如果找到匹配的Origin，设置CORS头
	if allowedOrigin != "" {
		w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	}

	// 处理 OPTIONS 请求 (CORS预检请求)
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		log.Println("Received OPTIONS request for CORS preflight.")
		return
	}

	if r.Method != "GET" {
		http.Error(w, "只支持 GET 请求", http.StatusMethodNotAllowed)
		log.Printf("Received non-GET request method: %s\n", r.Method)
		return
	}

	inputURL := r.URL.Query().Get("url")
	if inputURL == "" {
		http.Error(w, "缺少 'url' 参数", http.StatusBadRequest)
		log.Println("Missing 'url' parameter.")
		return
	}

	bvid := extractBvid(inputURL)
	if bvid == "" {
		http.Error(w, "无效的 BV 号或视频链接格式", http.StatusBadRequest)
		log.Printf("Invalid BVid format for input: %s\n", inputURL)
		return
	}

	log.Printf("后端接收到请求，正在处理 BVid: %s\n", bvid)

	// Bilibili 视频分P信息查询的非官方 API
	bilibiliAPIURL := fmt.Sprintf("https://api.bilibili.com/x/player/pagelist?bvid=%s", bvid)
	log.Printf("Attempting to fetch from Bilibili API: %s\n", bilibiliAPIURL)

	// 从环境变量获取超时设置，默认10秒
	timeoutStr := getEnv("API_TIMEOUT", "10")
	timeout, err := strconv.Atoi(timeoutStr)
	if err != nil {
		timeout = 10 // 解析失败时使用默认值
	}

	// 创建HTTP客户端，设置一个合理的超时时间
	client := &http.Client{
		Timeout: time.Duration(timeout) * time.Second,
	}
	req, err := http.NewRequest("GET", bilibiliAPIURL, nil)
	if err != nil {
		log.Printf("创建Bilibili API请求失败: %v\n", err)
		http.Error(w, "内部服务器错误", http.StatusInternalServerError)
		return
	}

	// 设置User-Agent和Referer头，模拟浏览器请求
	req.Header.Set("User-Agent", getEnv("USER_AGENT", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"))
	req.Header.Set("Referer", fmt.Sprintf("https://www.bilibili.com/video/%s", bvid))

	resp, err := client.Do(req)
	if err != nil {
		log.Printf("请求Bilibili API失败: %v\n", err)
		http.Error(w, "无法连接到 Bilibili API 或请求超时", http.StatusServiceUnavailable)
		return
	}
	defer resp.Body.Close()

	log.Printf("Received response from Bilibili API with status: %d\n", resp.StatusCode)

	bodyBytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Printf("读取Bilibili API响应失败: %v\n", err)
		http.Error(w, "内部服务器错误", http.StatusInternalServerError)
		return
	}

	// 只在调试模式下打印原始响应
	if getEnv("DEBUG", "false") == "true" {
		log.Printf("Bilibili API raw response body: %s\n", string(bodyBytes))
	}

	if resp.StatusCode != http.StatusOK {
		log.Printf("Bilibili API 返回非200状态码: %d, 响应体: %s\n", resp.StatusCode, string(bodyBytes))
		http.Error(w, fmt.Sprintf("Bilibili API 错误，状态码: %d", resp.StatusCode), http.StatusBadGateway)
		return
	}

	var bilibiliData BilibiliAPIResponse
	err = json.Unmarshal(bodyBytes, &bilibiliData) // 使用bodyBytes
	if err != nil {
		log.Printf("解析Bilibili API响应JSON失败: %v, 原始响应: %s\n", err, string(bodyBytes))
		http.Error(w, "解析 Bilibili 数据失败", http.StatusInternalServerError)
		return
	}

	if bilibiliData.Code != 0 {
		log.Printf("Bilibili API 返回错误代码: %d, 消息: %s\n", bilibiliData.Code, bilibiliData.Message)
		http.Error(w, fmt.Sprintf("Bilibili API 错误: %s (Code: %d)", bilibiliData.Message, bilibiliData.Code), http.StatusBadGateway)
		return
	}

	var parts []BilibiliPart
	for _, item := range bilibiliData.Data {
		parts = append(parts, BilibiliPart{
			CID:      item.CID,
			Page:     item.Page,
			Title:    item.Part,
			Duration: item.Duration,
		})
	}

	if len(parts) == 0 {
		log.Println("No parts found for this BVid.")
		http.Error(w, "未找到该视频的分P信息", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	responseBody := map[string][]BilibiliPart{"parts": parts}
	json.NewEncoder(w).Encode(responseBody)
	log.Printf("Successfully returned %d parts to frontend.\n", len(parts))
}

func main() {
	// 从环境变量获取端口，默认2323
	port := getEnv("PORT", "2323")

	log.Printf("Bilibili 后端服务正在启动，监听端口: %s\n", port)

	http.HandleFunc("/bilibili-parts", bilibiliPartsHandler)

	log.Fatal(http.ListenAndServe(":"+port, nil))
}
